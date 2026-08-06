"""
Tests for the Tax Optimisation Engine (Module 5.1) — Bharat Tax Mitra 2.0.

Strategy: cross-check the optimiser against the deterministic engine directly
rather than hard-coding expected rupee amounts. The optimiser's only job is to
SEARCH; the engine is the source of truth for every number, so the invariants
that matter are:
  1. the reported tax equals the engine's tax for the chosen plan,
  2. the recommendation is the cheaper regime,
  3. more deductions never raise old-regime tax (monotonicity),
  4. the allocation respects caps and budget.
This keeps the tests honest (no re-implemented tax maths to drift) and offline
(pure Python, no network).
"""

from src.lambdas.tax_calculation.calculate import (
    calculate_new_regime,
    calculate_old_regime,
)
from src.optimization.tax_optimizer import (
    _DISCRETIONARY_TOTAL_CAP,
    OptimizerInput,
    _allocate,
    _deductions_dict,
    _income_dict,
    _personal_info,
    optimize,
)


def _engine_min(inp: OptimizerInput):
    alloc = _allocate(inp.investable_budget)
    old = calculate_old_regime(_income_dict(inp), _deductions_dict(inp, alloc), _personal_info(inp))
    new = calculate_new_regime(_income_dict(inp), {}, _personal_info(inp))
    return old["totalTaxLiability"], new["totalTaxLiability"]


def test_total_tax_equals_engine_min():
    """The optimiser must never invent numbers — they come from the engine."""
    inp = OptimizerInput(gross_salary=1_500_000, investable_budget=200_000, health_insurance_80d=25_000)
    res = optimize(inp)
    old_tax, new_tax = _engine_min(inp)
    assert res.old_tax_optimal == old_tax
    assert res.new_tax == new_tax
    assert res.total_tax == min(old_tax, new_tax)
    assert res.recommended_regime == ("old" if old_tax <= new_tax else "new")


def test_deductions_never_increase_old_tax():
    """Monotonicity: funding deductions can only lower (or hold) old-regime tax."""
    inp = OptimizerInput(gross_salary=1_800_000, investable_budget=200_000)
    res = optimize(inp)
    assert res.old_tax_optimal <= res.old_tax_no_discretionary
    assert res.discretionary_saving == max(0, res.old_tax_no_discretionary - res.old_tax_optimal)


def test_budget_caps_allocation_to_total_cap():
    """A budget above the caps deploys exactly the caps, filled in priority order."""
    inp = OptimizerInput(gross_salary=1_500_000, investable_budget=500_000)
    res = optimize(inp)
    assert res.budget_deployed == _DISCRETIONARY_TOTAL_CAP  # 150k + 50k = 200k
    assert res.allocation["section80C"] == 150_000
    assert res.allocation["section80CCD1B"] == 50_000


def test_partial_budget_fills_priority_bucket_first():
    inp = OptimizerInput(gross_salary=1_500_000, investable_budget=100_000)
    res = optimize(inp)
    assert res.allocation["section80C"] == 100_000
    assert res.allocation["section80CCD1B"] == 0
    assert res.budget_deployed == 100_000


def test_none_budget_assumes_full_caps():
    inp = OptimizerInput(gross_salary=1_500_000, investable_budget=None)
    res = optimize(inp)
    assert res.budget_deployed == _DISCRETIONARY_TOTAL_CAP


def test_low_income_prefers_new_regime():
    """At ~₹6L with no deductions, the new-regime §87A rebate should win."""
    inp = OptimizerInput(gross_salary=600_000, investable_budget=0)
    res = optimize(inp)
    old_tax, new_tax = _engine_min(inp)
    assert res.recommended_regime == "new"
    assert res.total_tax == new_tax
    assert new_tax <= old_tax


def test_allocation_never_exceeds_caps_or_budget():
    for budget in (0, 25_000, 175_000, 200_000, 10_000_000):
        inp = OptimizerInput(gross_salary=1_200_000, investable_budget=budget)
        res = optimize(inp)
        assert res.allocation["section80C"] <= 150_000
        assert res.allocation["section80CCD1B"] <= 50_000
        assert res.budget_deployed <= min(budget, _DISCRETIONARY_TOTAL_CAP)


def test_effort_weight_zero_never_flips():
    """With no effort weighting, the weighted recommendation equals the pure one."""
    for gross in (600_000, 1_000_000, 1_500_000, 2_500_000):
        inp = OptimizerInput(gross_salary=gross, investable_budget=200_000, effort_weight=0.0)
        res = optimize(inp)
        assert res.weighted_recommendation == res.recommended_regime
        assert res.weighted_recommendation in ("old", "new")


def test_result_serialises():
    res = optimize(OptimizerInput(gross_salary=1_500_000, investable_budget=200_000))
    d = res.to_dict()
    assert d["recommendedRegime"] in ("old", "new")
    assert d["totalTax"] == res.total_tax
    assert isinstance(d["advocate"], list) and isinstance(d["adversary"], list)
    assert d["allocation"]["section80C"] + d["allocation"]["section80CCD1B"] == res.budget_deployed
