"""
Tests for the Advocate-Adversary Decision Engine (Module 5.5.1).

The scoring is deterministic, so these pin the exact adjudication behaviour —
including the key property that a *weighting* can override the pure-rupee
optimum when the saving is small (the "for vs against, weighted" flip).

Fixture note: a ₹8L salary funding the full ₹2L of 80C/NPS is a genuine
old-regime win on rupees (asserted first, via the optimiser, before profiles are
tested) — but a thin one, so effort/liquidity weighting flips it to new.
"""

import pytest

from src.optimization.decision_engine import WEIGHT_PROFILES, decide
from src.optimization.tax_optimizer import OptimizerInput, optimize


def test_invalid_profile_raises():
    with pytest.raises(ValueError):
        decide(OptimizerInput(gross_salary=1_000_000), weight_profile="nonsense")


def test_weight_profiles_sum_to_one():
    for name, w in WEIGHT_PROFILES.items():
        assert abs(sum(w.values()) - 1.0) < 1e-9, name


def test_composites_within_bounds():
    res = decide(OptimizerInput(gross_salary=1_500_000, investable_budget=200_000), "balanced")
    for opt in res.options:
        assert 0.0 <= opt.composite <= 1.0
        assert set(opt.breakdown) == {"saving", "effort", "liquidity", "certainty"}
    # options are ranked best-first
    assert res.options[0].composite >= res.options[1].composite


def test_low_income_all_profiles_pick_new():
    """When new is strictly cheaper, every weighting must recommend new."""
    inp = OptimizerInput(gross_salary=600_000, investable_budget=0)
    assert optimize(inp).new_tax < optimize(inp).old_tax_optimal  # new genuinely cheaper
    for profile in WEIGHT_PROFILES:
        res = decide(inp, profile)
        assert res.recommended_regime == "new", profile
        assert res.pure_min_tax_regime == "new"
        assert res.weighted_overrides_rupees is False


def test_marginal_old_win_flips_under_min_effort():
    """₹8L + full ₹2L deductions: old is cheaper, but only just."""
    inp = OptimizerInput(gross_salary=800_000, investable_budget=200_000)
    opt = optimize(inp)
    assert opt.old_tax_optimal < opt.new_tax  # confirm the fixture is a real old-win

    # max_saving & balanced follow the rupees → old
    assert decide(inp, "max_saving").recommended_regime == "old"
    assert decide(inp, "balanced").recommended_regime == "old"

    # min_effort weights simplicity/liquidity → flips to new despite the saving
    res = decide(inp, "min_effort")
    assert res.recommended_regime == "new"
    assert res.pure_min_tax_regime == "old"
    assert res.weighted_overrides_rupees is True


def test_max_saving_follows_rupees_when_span_positive():
    """Under max_saving, the cheaper regime always wins."""
    for gross in (600_000, 800_000, 1_500_000, 2_500_000):
        inp = OptimizerInput(gross_salary=gross, investable_budget=200_000)
        opt = optimize(inp)
        if opt.old_tax_optimal == opt.new_tax:
            continue
        res = decide(inp, "max_saving")
        assert res.recommended_regime == res.pure_min_tax_regime, gross


def test_serialisation():
    res = decide(OptimizerInput(gross_salary=800_000, investable_budget=200_000), "min_effort")
    d = res.to_dict()
    assert d["recommendedRegime"] in ("old", "new")
    assert d["weightProfile"] == "min_effort"
    assert len(d["options"]) == 2
    assert "weightedOverridesRupees" in d
