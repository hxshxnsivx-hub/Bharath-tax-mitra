"""
Golden-vector regression tests for the tax optimiser (Module 5.1.4).

Replays the frozen vectors in tests/golden/optimizer_vectors.json and asserts
`optimize()` still reproduces every value exactly. These are tripwires: a change
to the optimiser, the deterministic engine, or the FY rules that shifts any
figure will fail here. If the change is INTENTIONAL, regenerate the vectors
(`python scripts/generate_optimizer_vectors.py`) and review the JSON diff — that
diff is the audit artifact, mirroring shared/golden-vectors.json discipline.

A handful of human-checked anchors below guard against the vectors merely
echoing a regression (they assert facts computed by hand, independent of the
frozen file).
"""

import json
import os

import pytest

from src.optimization.tax_optimizer import OptimizerInput, optimize

_VECTORS_PATH = os.path.join(os.path.dirname(__file__), "golden", "optimizer_vectors.json")

with open(_VECTORS_PATH, encoding="utf-8") as _fh:
    _VECTORS = json.load(_fh)


@pytest.mark.parametrize("vector", _VECTORS, ids=[v["name"] for v in _VECTORS])
def test_optimizer_golden_vector(vector):
    res = optimize(OptimizerInput(**vector["input"]))
    for field, expected in vector["expected"].items():
        actual = getattr(res, field)
        assert actual == expected, (
            f"{vector['name']}.{field}: expected {expected!r}, got {actual!r}. "
            "If this change is intentional, regenerate optimizer_vectors.json and review the diff."
        )


def test_vectors_file_is_non_empty():
    assert len(_VECTORS) >= 8, "golden vector set unexpectedly shrank"


# ── Human-checked anchors (independent of the frozen file) ────────────────────

def test_anchor_5L_zero_tax_both_regimes():
    """₹5L salary: std deduction → ₹4.5L taxable; §87A zeroes tax in BOTH regimes."""
    res = optimize(OptimizerInput(gross_salary=500_000, investable_budget=0))
    assert res.total_tax == 0
    assert res.old_tax_optimal == 0 and res.new_tax == 0


def test_anchor_8L_old_beats_new_narrowly():
    """₹8L + full ₹2L deductions: old regime is cheaper, but by a thin margin."""
    res = optimize(OptimizerInput(gross_salary=800_000, investable_budget=200_000))
    assert res.recommended_regime == "old"
    assert res.old_tax_optimal < res.new_tax
    assert res.vs_other_regime_saving == res.new_tax - res.old_tax_optimal


def test_anchor_full_budget_deploys_two_lakh():
    res = optimize(OptimizerInput(gross_salary=1_500_000, investable_budget=200_000))
    assert res.budget_deployed == 200_000
    assert res.allocation == {"section80C": 150_000, "section80CCD1B": 50_000}
