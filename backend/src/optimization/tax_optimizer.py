"""
Tax Optimisation Engine — Bharat Tax Mitra 2.0, Module 5.1.

The exact solver core. Given a taxpayer's income, the deductions they are
ELIGIBLE for, and how much cash they can actually deploy, it finds the
tax-MINIMISING plan — how much to route into 80C/NPS instruments and which
regime to file under — and explains the choice both ways (advocate / adversary).

CRITICAL DESIGN RULE ("LLM-modulo"): this module NEVER re-implements tax maths.
Every rupee of tax is computed by the deterministic engine (`calculate.py`),
which is golden-vector tested. The optimiser only SEARCHES over candidate plans
and calls the engine as its objective function. When the constraint set grows
(shared caps, liquidity limits, multi-year sequencing), swap the closed-form
search here for an OR-Tools CP-SAT model (Module 5.1.2) behind the same
`optimize()` interface.

Why closed-form (not a metaheuristic): for the regime + Chapter-VI-A-budget
decision the objective is monotone in deductions (a rupee of deduction never
raises old-regime tax), so the exact optimum is:

    best_tax = min( old_regime(max feasible deductions), new_regime )

That is provably optimal — no PSO/ACO/GA needed, and the answer stays
reproducible and defensible to a CA.
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace

from src.lambdas.tax_calculation.calculate import (
    SECTION_44AD_THRESHOLD,
    SECTION_44AD_THRESHOLD_DIGITAL,
    SECTION_80C_LIMIT,
    SECTION_80CCD1B_LIMIT,
    calculate_new_regime,
    calculate_old_regime,
)

# Discretionary buckets the optimiser funds from the investable budget, in
# fill-priority order, each with its statutory cap. Marginal tax benefit is
# uniform across them at a given income, so priority only affects which bucket
# is reported as filled first, never the resulting tax.
_DISCRETIONARY: list[tuple[str, int]] = [
    ("section80C", SECTION_80C_LIMIT),
    ("section80CCD1B", SECTION_80CCD1B_LIMIT),
]
_DISCRETIONARY_TOTAL_CAP = sum(cap for _, cap in _DISCRETIONARY)

# When the two regimes land within this many rupees, an effort-weighted
# adjudication may prefer the simpler new regime despite a marginal old-regime
# edge (the "adversary" cost of proofs + locked capital).
_EFFORT_TOLERANCE = 5_000


@dataclass
class OptimizerInput:
    """A taxpayer's optimisation problem. Amounts are whole rupees."""

    # Defaults to 0 since 5.1.5c: a §44AD business or professional may have no
    # salary head at all. Every existing caller passes it explicitly.
    gross_salary: int = 0
    basic_salary: int = 0
    professional_tax: int = 0

    # Amounts the taxpayer is ALREADY paying / eligible for — claimed as-is
    # under the old regime (facts, not budget decisions).
    health_insurance_80d: int = 0        # 80D self premium (engine caps it)
    education_loan_interest_80e: int = 0  # 80E actual (no cap)
    donations_80g: int = 0                # 80G actual (engine applies 50%)

    # HRA (Module 5.1.5). A FACT, not a lever: you either receive HRA and pay
    # rent or you don't — the optimiser cannot "allocate" its way into it. It
    # still belongs here because the exemption is old-regime-only, so omitting
    # it silently biases every recommendation toward the new regime.
    # `gross_salary` is the CASH component; `hra_received` sits on top of it,
    # matching how `calculate.py::_gross_total_income` sums the two.
    hra_received: int = 0
    rent_paid: int = 0        # annual rent actually paid
    is_metro: bool = False    # metro => 50% of basic cap, else 40% (Rule 2A)

    # §44AD presumptive business receipts (Module 5.1.5c). Unlike HRA this
    # carries a real LEVER: digital receipts are presumed at 6% versus 8% for
    # cash, and an all-but-5%-digital business raises the eligibility ceiling
    # from ₹2Cr to ₹3Cr. Both are lawful planning choices, not avoidance.
    business_digital_receipts: int = 0
    business_cash_receipts: int = 0
    # Actuals, used only when receipts breach the §44AD ceiling and the
    # presumption no longer applies. Without these the case is unmodellable and
    # `optimize()` refuses rather than returning a figure built on zero income.
    business_gross_receipts: int = 0
    business_expenses: int = 0

    # Discretionary cash the taxpayer can deploy into 80C / NPS instruments.
    # None => assume they can fund the caps fully.
    investable_budget: int | None = None

    is_senior: bool = False
    is_super_senior: bool = False

    # 0.0 = decide purely on rupees; 1.0 = weight simplicity/low-effort heavily
    # when the regimes are close (drives the weighted adjudication only).
    effort_weight: float = 0.0


@dataclass
class OptimizationResult:
    recommended_regime: str            # pure tax-minimising choice
    weighted_recommendation: str       # after effort-weighting
    total_tax: int                     # tax under the recommended (pure) regime
    old_tax_optimal: int               # old regime with the optimal deductions
    old_tax_no_discretionary: int      # old regime funding no 80C/NPS
    new_tax: int
    budget_deployed: int               # rupees routed into 80C/NPS
    allocation: dict[str, int]         # per-bucket amounts
    discretionary_saving: int          # old-regime tax saved by deploying budget
    vs_other_regime_saving: int        # recommended vs the other regime
    hra_exemption: int = 0             # Rule 2A exemption AS COMPUTED BY THE ENGINE
    presumptive_income: int = 0        # §44AD presumed profit, from the engine
    digital_shift_saving: int = 0      # tax saved if every receipt were digital
    advocate: list[str] = field(default_factory=list)   # why choose it
    adversary: list[str] = field(default_factory=list)  # why not
    note: str = ""

    def to_dict(self) -> dict:
        return {
            "recommendedRegime": self.recommended_regime,
            "weightedRecommendation": self.weighted_recommendation,
            "totalTax": self.total_tax,
            "oldTaxOptimal": self.old_tax_optimal,
            "oldTaxNoDiscretionary": self.old_tax_no_discretionary,
            "newTax": self.new_tax,
            "budgetDeployed": self.budget_deployed,
            "allocation": self.allocation,
            "discretionarySaving": self.discretionary_saving,
            "vsOtherRegimeSaving": self.vs_other_regime_saving,
            "hraExemption": self.hra_exemption,
            "presumptiveIncome": self.presumptive_income,
            "digitalShiftSaving": self.digital_shift_saving,
            "advocate": self.advocate,
            "adversary": self.adversary,
            "note": self.note,
        }


def _income_dict(inp: OptimizerInput) -> dict:
    income: dict = {
        "salary": {
            "grossSalary": inp.gross_salary,
            "basicSalary": inp.basic_salary,
            "hraReceived": inp.hra_received,
            "specialAllowance": 0,
            "otherAllowances": 0,
            "professionalTax": inp.professional_tax,
        }
    }
    # Only attach the head when it carries something — the engine branches on
    # the key's presence, so an all-zero dict is not the same as omitting it.
    if (inp.business_digital_receipts or inp.business_cash_receipts
            or inp.business_gross_receipts):
        income["businessIncome"] = {
            "digitalReceipts": inp.business_digital_receipts,
            "cashReceipts": inp.business_cash_receipts,
            "grossReceipts": inp.business_gross_receipts,
            "expenses": inp.business_expenses,
        }
    return income


def _deductions_dict(inp: OptimizerInput, alloc: dict[str, int]) -> dict:
    """Build the DeductionData the engine expects for a given 80C/NPS allocation."""
    return {
        "section80C": {"other": alloc.get("section80C", 0)},
        "section80CCD1B": {"npsAdditional": alloc.get("section80CCD1B", 0)},
        "section80D": {
            "selfPremium": inp.health_insurance_80d,
            "isSelfSenior": inp.is_senior or inp.is_super_senior,
        },
        "section80E": {"educationLoanInterest": inp.education_loan_interest_80e},
        "section80G": {"donations": inp.donations_80g},
        # Rule 2A inputs. The engine derives the exemption (min of the three
        # options) from these plus salary.basicSalary / salary.hraReceived —
        # we never compute it here.
        "hra": {"rentPaid": inp.rent_paid, "isMetro": inp.is_metro},
    }


def _personal_info(inp: OptimizerInput) -> dict:
    return {
        "isSeniorCitizen": inp.is_senior,
        "isSuperSeniorCitizen": inp.is_super_senior,
        "residentialStatus": "resident",
    }


def _allocate(budget: int | None) -> dict[str, int]:
    """
    Optimal discretionary allocation: deploy as much as the budget allows, up to
    the caps, filling in priority order. Because every deducted rupee saves the
    same marginal rate, deploying more is always weakly better for old-regime
    tax — so max feasible is optimal. (This is the point CP-SAT takes over when
    caps interact or liquidity is constrained — Module 5.1.2.)
    """
    to_deploy = _DISCRETIONARY_TOTAL_CAP if budget is None else max(0, min(budget, _DISCRETIONARY_TOTAL_CAP))
    alloc: dict[str, int] = {}
    remaining = to_deploy
    for key, cap in _DISCRETIONARY:
        take = min(cap, remaining)
        alloc[key] = take
        remaining -= take
    return alloc


class UnmodellableScenario(ValueError):
    """
    The scenario cannot be scored correctly with the inputs given.

    Abstention beats a confident wrong number: a tax figure silently computed on
    zero business income is worse than a refusal the caller can act on. Mirrors
    the confidence-gating principle in Module 5.4.6.
    """


def _assert_modellable(inp: OptimizerInput) -> None:
    receipts = inp.business_digital_receipts + inp.business_cash_receipts
    if receipts == 0:
        return
    cash_pct = inp.business_cash_receipts / receipts
    ceiling = SECTION_44AD_THRESHOLD_DIGITAL if cash_pct <= 0.05 else SECTION_44AD_THRESHOLD
    if receipts > ceiling and inp.business_gross_receipts == 0:
        raise UnmodellableScenario(
            f"Receipts of ₹{receipts:,} exceed the §44AD ceiling of ₹{ceiling:,} "
            f"(cash is {cash_pct:.1%} of turnover), so the presumption does not apply. "
            "Supply business_gross_receipts and business_expenses to score this on actuals."
        )


def optimize(inp: OptimizerInput) -> OptimizationResult:
    _assert_modellable(inp)
    income = _income_dict(inp)
    personal = _personal_info(inp)

    alloc = _allocate(inp.investable_budget)
    budget_deployed = sum(alloc.values())

    # Objective function = the deterministic engine. The optimiser never
    # computes tax itself.
    old_opt = calculate_old_regime(income, _deductions_dict(inp, alloc), personal)
    old_none = calculate_old_regime(
        income, _deductions_dict(inp, {"section80C": 0, "section80CCD1B": 0}), personal
    )
    new = calculate_new_regime(income, {}, personal)

    old_tax = old_opt["totalTaxLiability"]
    old_tax_none = old_none["totalTaxLiability"]
    new_tax = new["totalTaxLiability"]

    # Read the Rule 2A exemption back off the engine rather than deriving it —
    # same single-source-of-truth rule that governs the tax figures.
    hra_exemption = old_opt["deductionBreakdown"].get("hra", 0)
    presumptive_income = old_opt["incomeBreakdown"].get("businessIncome", 0)

    # §44AD lever: price the all-digital counterfactual by re-running the
    # ENGINE on a shifted receipt mix. The optimiser proposes the variant; it
    # never computes the 6%-vs-8% arithmetic itself.
    digital_shift_saving = 0
    if inp.business_cash_receipts > 0:
        shifted = replace(
            inp,
            business_digital_receipts=inp.business_digital_receipts + inp.business_cash_receipts,
            business_cash_receipts=0,
        )
        shifted_income = _income_dict(shifted)
        shifted_best = min(
            calculate_old_regime(shifted_income, _deductions_dict(shifted, alloc), personal)["totalTaxLiability"],
            calculate_new_regime(shifted_income, {}, personal)["totalTaxLiability"],
        )
        digital_shift_saving = max(0, min(old_tax, new_tax) - shifted_best)

    recommended = "old" if old_tax <= new_tax else "new"
    total_tax = min(old_tax, new_tax)
    vs_other = abs(old_tax - new_tax)
    discretionary_saving = max(0, old_tax_none - old_tax)

    advocate: list[str] = []
    adversary: list[str] = []

    if recommended == "old":
        advocate.append(
            f"Old regime is ₹{vs_other:,} cheaper: deductions cut your tax to ₹{old_tax:,} "
            f"versus ₹{new_tax:,} under the new regime."
        )
        if hra_exemption > 0:
            advocate.append(
                f"HRA exemption of ₹{hra_exemption:,} (Rule 2A) applies under the old regime only — "
                "it is the single largest reason the old regime wins here."
            )
        if budget_deployed > 0:
            advocate.append(
                f"Deploying ₹{budget_deployed:,} across 80C/NPS saved ₹{discretionary_saving:,} in tax."
            )
        if hra_exemption > 0:
            adversary.append(
                "The HRA claim needs rent receipts, and your landlord's PAN if annual rent "
                "exceeds ₹1,00,000 — without those the exemption is disallowed on scrutiny."
            )
        adversary.append(
            "Old regime requires proof for every claim and locks "
            f"₹{budget_deployed:,} in investments — the benefit holds only while you actually "
            "invest and can substantiate each deduction."
        )
    else:
        advocate.append(
            f"New regime is ₹{vs_other:,} cheaper — ₹{new_tax:,} versus ₹{old_tax:,} — "
            "with lower slab rates and no deduction paperwork."
        )
        if new["taxableIncome"] <= 700_000:
            advocate.append("Full §87A rebate applies (taxable income ≤ ₹7L).")
        adversary.append(
            f"You forgo old-regime deductions worth ₹{old_opt['totalDeductions']:,}; "
            "if your real deductions are larger than modelled here, re-check."
        )
        if inp.hra_received > 0 and inp.rent_paid == 0:
            adversary.append(
                "You receive HRA but reported no rent, so no exemption was modelled. "
                "If you do pay rent, the old regime could win — re-run with the rent figure."
            )
        if budget_deployed > 0 and discretionary_saving == 0:
            adversary.append(
                "Note: funding 80C/NPS gives NO tax benefit under the new regime — "
                "don't lock money away purely for tax."
            )

    # §44AD is regime-independent — the presumption applies either way — so its
    # rationale is appended after the regime argument rather than inside it.
    if presumptive_income > 0:
        receipts = inp.business_digital_receipts + inp.business_cash_receipts
        advocate.append(
            f"§44AD presumes a profit of ₹{presumptive_income:,} on ₹{receipts:,} of receipts — "
            "you pay tax on that presumed figure, with no books of account required."
        )
        if digital_shift_saving > 0:
            advocate.append(
                f"Taking the ₹{inp.business_cash_receipts:,} you currently receive in cash through "
                f"digital channels instead would presume profit at 6% rather than 8%, cutting tax by "
                f"₹{digital_shift_saving:,}."
            )
        adversary.append(
            "§44AD locks you in: declaring below the presumed rate later requires audited books, "
            "and opting out bars you from the scheme for five assessment years."
        )
    elif inp.business_digital_receipts or inp.business_cash_receipts:
        adversary.append(
            "Receipts exceed the §44AD ceiling (₹3Cr when cash is ≤5% of turnover, otherwise ₹2Cr), "
            "so presumptive taxation does not apply and actual profits with audited books govern."
        )

    # Effort-weighted adjudication: when the regimes are close and old regime
    # only wins by leaning on locked capital + paperwork, a high effort weight
    # tips the recommendation to the simpler new regime.
    weighted = recommended
    if (
        recommended == "old"
        and vs_other <= _EFFORT_TOLERANCE
        and budget_deployed > 0
        and inp.effort_weight >= 0.5
    ):
        weighted = "new"

    if weighted != recommended:
        note = (
            f"Pure-rupee optimum is the old regime (₹{vs_other:,} less), but the margin is thin "
            f"and it needs ₹{budget_deployed:,} locked + proofs; at your effort weighting the "
            "simpler new regime is recommended."
        )
    elif recommended == "old":
        note = f"Old regime, funded to ₹{budget_deployed:,} of deductions, is optimal."
    else:
        note = "New regime is optimal even before any deductions."

    return OptimizationResult(
        recommended_regime=recommended,
        weighted_recommendation=weighted,
        total_tax=total_tax,
        old_tax_optimal=old_tax,
        old_tax_no_discretionary=old_tax_none,
        new_tax=new_tax,
        budget_deployed=budget_deployed,
        allocation=alloc,
        discretionary_saving=discretionary_saving,
        vs_other_regime_saving=vs_other,
        hra_exemption=hra_exemption,
        presumptive_income=presumptive_income,
        digital_shift_saving=digital_shift_saving,
        advocate=advocate,
        adversary=adversary,
        note=note,
    )
