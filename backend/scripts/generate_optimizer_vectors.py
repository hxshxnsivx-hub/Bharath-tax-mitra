"""
Generate golden vectors for the tax optimiser (Module 5.1.4).

Mirrors the shared/golden-vectors.json discipline: freeze the CURRENT
engine-verified output of `optimize()` on a fixed set of taxpayer scenarios as a
regression contract. The invariant tests (test_tax_optimizer.py) already prove
these outputs match the golden-vector-tested engine — this file pins the exact
numbers so any *accidental* future change (to the optimiser, the engine, or the
FY rules) flips a frozen value and fails test_optimizer_golden.py.

REGENERATE ONLY on a deliberate change (new FY rules, intended optimiser
behaviour). The changed JSON diff is the review artifact — eyeball it before
committing.

Run from the backend/ directory:
    python scripts/generate_optimizer_vectors.py
"""

from __future__ import annotations

import json
import os
import sys

# Make `src` importable when run as a plain script (sys.path[0] is scripts/).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.optimization.tax_optimizer import OptimizerInput, optimize  # noqa: E402

# Fixed scenarios spanning slab/rebate/regime boundaries and the effort flip.
SCENARIOS: list[dict] = [
    {"name": "salaried_5L_boundary_no_budget", "input": {"gross_salary": 500_000, "investable_budget": 0}},
    {"name": "salaried_6L_no_budget", "input": {"gross_salary": 600_000, "investable_budget": 0}},
    {"name": "salaried_8L_full_budget_flip", "input": {"gross_salary": 800_000, "investable_budget": 200_000}},
    {"name": "salaried_12L_partial_budget", "input": {"gross_salary": 1_200_000, "investable_budget": 100_000}},
    {"name": "salaried_15L_full_budget_health", "input": {"gross_salary": 1_500_000, "investable_budget": 200_000, "health_insurance_80d": 25_000}},
    {"name": "salaried_18L_80e_80g", "input": {"gross_salary": 1_800_000, "investable_budget": 200_000, "education_loan_interest_80e": 50_000, "donations_80g": 20_000}},
    {"name": "senior_10L_partial_budget", "input": {"gross_salary": 1_000_000, "investable_budget": 150_000, "is_senior": True}},
    {"name": "salaried_25L_full_budget", "input": {"gross_salary": 2_500_000, "investable_budget": 200_000}},
]

_EXPECTED_FIELDS = (
    "recommended_regime",
    "weighted_recommendation",
    "total_tax",
    "old_tax_optimal",
    "old_tax_no_discretionary",
    "new_tax",
    "budget_deployed",
    "allocation",
    "discretionary_saving",
    "vs_other_regime_saving",
)


def build() -> list[dict]:
    vectors = []
    for sc in SCENARIOS:
        res = optimize(OptimizerInput(**sc["input"]))
        expected = {f: getattr(res, f) for f in _EXPECTED_FIELDS}
        vectors.append({"name": sc["name"], "input": sc["input"], "expected": expected})
    return vectors


def main() -> None:
    out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tests", "golden")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "optimizer_vectors.json")
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(build(), fh, indent=2, ensure_ascii=True)
        fh.write("\n")
    print(f"Wrote {len(SCENARIOS)} optimiser golden vectors -> {out_path}")


if __name__ == "__main__":
    main()
