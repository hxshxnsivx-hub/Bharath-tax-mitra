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

import pytest

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
    UnmodellableScenario,
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


# ── Module 5.1.5: HRA coverage ────────────────────────────────────────────────
# Before 5.1.5 the optimiser hardcoded hraReceived=0 and passed no rent, so the
# Rule 2A exemption — old-regime-only, and often the largest single lever a
# salaried renter has — was invisible. That silently biased every recommendation
# toward the new regime. These tests pin the behaviour so it cannot regress.


def test_hra_flips_recommendation_for_metro_renter():
    """
    Regression tripwire. Same taxpayer, ₹15L total compensation, ₹7.5L basic,
    ₹30k/month metro rent. Modelled as pure salary the new regime looks ₹41,350
    cheaper; once HRA and rent are modelled the old regime is ₹41,080 cheaper.
    Acting on the pre-5.1.5 answer costs this taxpayer real money.
    """
    as_pure_salary = optimize(
        OptimizerInput(gross_salary=1_500_000, basic_salary=750_000,
                       professional_tax=2_400, health_insurance_80d=25_000)
    )
    with_hra = optimize(
        OptimizerInput(gross_salary=1_200_000, basic_salary=750_000,
                       professional_tax=2_400, health_insurance_80d=25_000,
                       hra_received=300_000, rent_paid=360_000, is_metro=True)
    )

    assert as_pure_salary.recommended_regime == "new"
    assert with_hra.recommended_regime == "old"

    # The new-regime figure is identical in both runs (HRA is old-regime-only),
    # which is what makes this a controlled comparison rather than two scenarios.
    assert as_pure_salary.new_tax == with_hra.new_tax

    # Rule 2A minimum: min(3,00,000 received, 3,60,000 - 10% of 7,50,000, 50% of 7,50,000)
    assert with_hra.hra_exemption == 285_000


def test_hra_exemption_matches_engine_not_optimiser_maths():
    """The reported exemption must come off the engine's deduction breakdown."""
    inp = OptimizerInput(gross_salary=1_200_000, basic_salary=600_000,
                         hra_received=240_000, rent_paid=300_000, is_metro=False)
    res = optimize(inp)
    engine = calculate_old_regime(
        _income_dict(inp), _deductions_dict(inp, _allocate(inp.investable_budget)),
        {"isSeniorCitizen": False, "isSuperSeniorCitizen": False, "residentialStatus": "resident"},
    )
    assert res.hra_exemption == engine["deductionBreakdown"]["hra"]


def test_hra_needs_both_rent_and_receipt():
    """Rule 2A yields nothing if either leg is missing — no phantom exemption."""
    base = dict(gross_salary=1_200_000, basic_salary=750_000)
    assert optimize(OptimizerInput(**base, hra_received=300_000, rent_paid=0)).hra_exemption == 0
    assert optimize(OptimizerInput(**base, hra_received=0, rent_paid=360_000)).hra_exemption == 0


def test_metro_status_never_lowers_the_exemption():
    """Metro caps at 50% of basic vs 40% — metro is weakly better, never worse."""
    for rent in (120_000, 360_000, 600_000):
        kw = dict(gross_salary=1_200_000, basic_salary=750_000,
                  hra_received=300_000, rent_paid=rent)
        assert (optimize(OptimizerInput(**kw, is_metro=True)).hra_exemption
                >= optimize(OptimizerInput(**kw, is_metro=False)).hra_exemption)


def test_hra_never_raises_old_regime_tax():
    """Monotonicity: an exemption is a deduction — it cannot increase tax."""
    for rent in (0, 100_000, 360_000, 900_000):
        inp = OptimizerInput(gross_salary=1_200_000, basic_salary=750_000,
                             hra_received=300_000, rent_paid=rent, is_metro=True)
        res = optimize(inp)
        no_rent = optimize(
            OptimizerInput(gross_salary=1_200_000, basic_salary=750_000,
                           hra_received=300_000, rent_paid=0, is_metro=True)
        )
        assert res.old_tax_optimal <= no_rent.old_tax_optimal


def test_hra_without_rent_warns_in_adversary():
    """Receiving HRA but reporting no rent is a prompt, not a silent zero."""
    res = optimize(
        OptimizerInput(gross_salary=1_500_000, basic_salary=750_000, hra_received=300_000)
    )
    assert res.recommended_regime == "new"
    assert any("no rent" in a.lower() for a in res.adversary)


# ── Module 5.1.5c: §44AD presumptive business ─────────────────────────────────
# Unlike HRA, 44AD carries a genuine LEVER: digital receipts are presumed at 6%
# against 8% for cash, and a ≤5%-cash business is judged against a ₹3Cr ceiling
# rather than ₹2Cr. Both are lawful planning choices.


def test_presumptive_income_matches_statutory_rates():
    """6% of digital + 8% of cash, read back off the engine's income breakdown."""
    res = optimize(OptimizerInput(business_digital_receipts=8_000_000,
                                  business_cash_receipts=4_000_000,
                                  investable_budget=200_000))
    assert res.presumptive_income == int(8_000_000 * 0.06 + 4_000_000 * 0.08)


def test_digital_shift_is_priced_by_the_engine_not_the_optimiser():
    """
    The all-digital counterfactual must be scored by re-running the engine, and
    the saving must equal the real difference in tax between the two mixes.
    """
    mixed = OptimizerInput(business_digital_receipts=8_000_000,
                           business_cash_receipts=4_000_000, investable_budget=200_000)
    all_digital = OptimizerInput(business_digital_receipts=12_000_000,
                                 business_cash_receipts=0, investable_budget=200_000)
    res, alt = optimize(mixed), optimize(all_digital)
    assert res.digital_shift_saving == res.total_tax - alt.total_tax
    assert alt.presumptive_income < res.presumptive_income  # 6% beats the 8% leg


def test_no_digital_lever_when_there_is_no_cash():
    res = optimize(OptimizerInput(business_digital_receipts=5_000_000, business_cash_receipts=0))
    assert res.digital_shift_saving == 0


def test_over_ceiling_without_actuals_is_refused_not_guessed():
    """
    Abstention over a confident wrong number. Before the guard the engine fell
    back to grossReceipts - expenses, which defaulted to zero — so an over-ceiling
    business was quietly scored on NO income at all.
    """
    over = OptimizerInput(business_digital_receipts=20_000_000, business_cash_receipts=5_000_000)
    with pytest.raises(UnmodellableScenario):
        optimize(over)


def test_over_ceiling_with_actuals_scores_on_actuals():
    res = optimize(OptimizerInput(business_digital_receipts=20_000_000,
                                  business_cash_receipts=5_000_000,
                                  business_gross_receipts=25_000_000,
                                  business_expenses=21_000_000))
    assert res.presumptive_income == 4_000_000  # 2.5Cr - 2.1Cr, actuals not presumption


def test_five_percent_cash_raises_the_ceiling_to_3cr():
    """≤5% cash is judged against ₹3Cr, so ₹2.5Cr stays inside the scheme."""
    mostly_digital = OptimizerInput(business_digital_receipts=24_000_000,
                                    business_cash_receipts=1_000_000)  # 4% cash
    res = optimize(mostly_digital)  # must NOT raise
    assert res.presumptive_income == int(24_000_000 * 0.06 + 1_000_000 * 0.08)


def test_salary_only_taxpayer_is_unaffected_by_the_business_head():
    """The head is attached only when it carries something."""
    res = optimize(OptimizerInput(gross_salary=1_200_000, investable_budget=200_000))
    assert res.presumptive_income == 0
    assert res.digital_shift_saving == 0
    assert "businessIncome" not in _income_dict(OptimizerInput(gross_salary=1_200_000))
