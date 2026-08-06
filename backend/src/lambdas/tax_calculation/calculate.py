"""
Tax Calculation Lambda — FY 2025-26 (AY 2025-26)
Mirrors frontend/src/services/taxCalculator.ts logic exactly.
Finance Bill 2025 compliant.

Handler accepts JSON body with:
  - income: IncomeData
  - deductions: DeductionData
  - personalInfo: PersonalInfo (optional)

Returns: RegimeComparisonResult JSON
"""

from __future__ import annotations

import json
import math
import os
from typing import Any

# ── Tax rule constants (FY 2025-26) ──────────────────────────────────────────
# These mirror shared/tax-rules-fy2025-26.json verbatim.

NEW_REGIME_SLABS = [
    {"min": 0,       "max": 300_000,  "rate": 0,  "description": "Up to Rs. 3,00,000 — Nil (Section 115BAC, AY 2025-26)"},
    {"min": 300_000, "max": 600_000,  "rate": 5,  "description": "Rs. 3,00,000 to Rs. 6,00,000 — 5% (Section 115BAC, AY 2025-26)"},
    {"min": 600_000, "max": 900_000,  "rate": 10, "description": "Rs. 6,00,000 to Rs. 9,00,000 — 10% (Section 115BAC, AY 2025-26)"},
    {"min": 900_000, "max": 1_200_000,"rate": 15, "description": "Rs. 9,00,000 to Rs. 12,00,000 — 15% (Section 115BAC, AY 2025-26)"},
    {"min": 1_200_000,"max": 1_500_000,"rate": 20,"description": "Rs. 12,00,000 to Rs. 15,00,000 — 20% (Section 115BAC, AY 2025-26)"},
    {"min": 1_500_000,"max": None,    "rate": 30, "description": "Above Rs. 15,00,000 — 30% (Section 115BAC, AY 2025-26)"},
]

OLD_REGIME_SLABS = [
    {"min": 0,        "max": 250_000,  "rate": 0,  "description": "Income up to Rs. 2,50,000 — Nil (Finance Bill 2025, Paragraph A(I)(1))"},
    {"min": 250_000,  "max": 500_000,  "rate": 5,  "description": "Rs. 2,50,000 to Rs. 5,00,000 — 5% (Finance Bill 2025, Paragraph A(I)(2))"},
    {"min": 500_000,  "max": 1_000_000,"rate": 20, "description": "Rs. 5,00,000 to Rs. 10,00,000 — 20% (Finance Bill 2025, Paragraph A(I)(3))"},
    {"min": 1_000_000,"max": None,     "rate": 30, "description": "Above Rs. 10,00,000 — 30% (Finance Bill 2025, Paragraph A(I)(4))"},
]

OLD_REGIME_SENIOR_SLABS = [
    {"min": 0,        "max": 300_000,  "rate": 0,  "description": "Up to Rs. 3,00,000 — Nil"},
    {"min": 300_000,  "max": 500_000,  "rate": 5,  "description": "Rs. 3,00,000 to Rs. 5,00,000 — 5%"},
    {"min": 500_000,  "max": 1_000_000,"rate": 20, "description": "Rs. 5,00,000 to Rs. 10,00,000 — 20%"},
    {"min": 1_000_000,"max": None,     "rate": 30, "description": "Above Rs. 10,00,000 — 30%"},
]

OLD_REGIME_SUPER_SENIOR_SLABS = [
    {"min": 0,        "max": 500_000,  "rate": 0,  "description": "Up to Rs. 5,00,000 — Nil"},
    {"min": 500_000,  "max": 1_000_000,"rate": 20, "description": "Rs. 5,00,000 to Rs. 10,00,000 — 20%"},
    {"min": 1_000_000,"max": None,     "rate": 30, "description": "Above Rs. 10,00,000 — 30%"},
]

SURCHARGE_THRESHOLDS = [
    {"min": 5_000_000,  "max": 10_000_000, "rate": 10},
    {"min": 10_000_001, "max": 20_000_000, "rate": 15},
    {"min": 20_000_001, "max": 50_000_000, "rate": 25},
    {"min": 50_000_001, "max": None,       "rate": 37},
]

NEW_REGIME_87A_THRESHOLD  = 700_000
NEW_REGIME_87A_MAX_REBATE = 25_000
OLD_REGIME_87A_THRESHOLD  = 500_000
OLD_REGIME_87A_MAX_REBATE = 12_500

STANDARD_DEDUCTION       = 50_000
CESS_RATE                = 4

SECTION_80C_LIMIT        = 150_000
SECTION_80CCD1B_LIMIT    = 50_000
SECTION_80D_SELF         = 25_000
SECTION_80D_SELF_SENIOR  = 50_000
SECTION_80D_PARENTS      = 25_000
SECTION_80D_PARENTS_SENIOR = 50_000
SECTION_80D_PREVENTIVE   = 5_000

HRA_METRO_PCT            = 50
HRA_NON_METRO_PCT        = 40
HRA_RENT_THRESHOLD_PCT   = 10

SECTION_44AD_THRESHOLD         = 20_000_000   # ₹2 Cr
SECTION_44AD_THRESHOLD_DIGITAL = 30_000_000   # ₹3 Cr (cash ≤ 5%)
SECTION_44AD_DIGITAL_RATE      = 6
SECTION_44AD_CASH_RATE         = 8


# ── OPT-A3: deterministic money arithmetic (mirrors taxCalculator.ts) ────────
# Python's built-in _round_half_up() is banker's rounding (half-even): _round_half_up(2500.5)
# == 2500, while JS Math.round gives 2501. The cross-engine contract is
# HALF-UP, and percentages are computed in EXACT integer space — no float
# division anywhere. Pinned by shared/golden-vectors.json (V25–V27 land on
# exact .50 boundaries specifically to catch a regression here).

def _round_half_up(x: float) -> int:
    """Round to nearest rupee, half-up — exact Math.round semantics."""
    return math.floor(x + 0.5)


def _pct_of(amount: float, rate_pct: int) -> int:
    """round-half-up((amount * rate_pct) / 100) in exact integer arithmetic."""
    sign = -1 if amount < 0 else 1
    n = abs(_round_half_up(amount)) * rate_pct
    q, r = divmod(n, 100)
    return sign * (q + (1 if r >= 50 else 0))



# ── Helper functions ──────────────────────────────────────────────────────────

def _slab_wise_tax(taxable_income: float, slabs: list[dict]) -> list[dict]:
    """Compute slab-wise tax breakdown, mirroring calculateSlabWiseTax in TS."""
    result = []
    remaining = taxable_income
    for slab in slabs:
        if remaining <= 0:
            break
        slab_max = slab["max"] if slab["max"] is not None else math.inf
        band = slab_max - slab["min"]
        income_in_slab = min(remaining, band)
        if income_in_slab > 0:
            tax = _pct_of(income_in_slab, slab["rate"])
            result.append({
                "slab":   slab["description"],
                "income": _round_half_up(income_in_slab),
                "rate":   slab["rate"],
                "tax":    tax,
            })
            remaining -= income_in_slab
    return result


def _rebate_87a_new_regime(taxable_income: float, tax_before_rebate: float) -> float:
    """
    Section 87A rebate for NEW regime (FY 2025-26):
      - Full rebate min(tax, ₹25,000) if taxable ≤ ₹7L
      - Marginal relief: if taxable > ₹7L but tax > (income - ₹7L), rebate = tax - excess
    """
    if taxable_income <= NEW_REGIME_87A_THRESHOLD:
        return min(tax_before_rebate, NEW_REGIME_87A_MAX_REBATE)
    excess = taxable_income - NEW_REGIME_87A_THRESHOLD
    if tax_before_rebate > excess:
        return tax_before_rebate - excess
    return 0.0


def _rebate_87a_old_regime(taxable_income: float, tax_before_rebate: float) -> float:
    """
    Section 87A rebate for OLD regime: min(tax, ₹12,500) for income ≤ ₹5L.
    No marginal relief for old regime.
    """
    if taxable_income <= OLD_REGIME_87A_THRESHOLD:
        return min(tax_before_rebate, OLD_REGIME_87A_MAX_REBATE)
    return 0.0


def _surcharge_with_marginal_relief(
    taxable_income: float,
    tax_after_rebate: float,
    thresholds: list[dict],
    slabs: list[dict],
) -> tuple[float, int]:
    """
    Surcharge with marginal relief.
    Returns (surcharge_amount, surcharge_rate).
    Mirrors calculateSurchargeWithMarginalRelief in TS.

    Statutory marginal relief: for income just above a surcharge threshold, the total
    income-tax PLUS surcharge must not exceed the income-tax plus surcharge payable on
    income exactly AT that threshold, plus the income earned above it:

        (tax + surcharge) <= (tax_at_threshold + surcharge_at_threshold) + (income - threshold)

    The reference threshold for a band is its lower income boundary (₹50L / ₹1Cr / ₹2Cr /
    ₹5Cr), and the surcharge rate at that boundary is the previous band's rate (0 for ₹50L,
    10% at ₹1Cr, 15% at ₹2Cr, 25% at ₹5Cr).
    """
    band_index = -1
    for i, t in enumerate(thresholds):
        t_max = t["max"] if t["max"] is not None else math.inf
        if t["min"] < taxable_income <= t_max:
            band_index = i
            break

    if band_index == -1:
        return 0.0, 0

    applicable_rate = thresholds[band_index]["rate"]
    raw_surcharge = _pct_of(tax_after_rebate, applicable_rate)

    # Reference threshold = lower income boundary of this band.
    prev_band = thresholds[band_index - 1] if band_index > 0 else None
    if prev_band is not None and prev_band["max"] is not None:
        threshold_income = prev_band["max"]
    else:
        threshold_income = thresholds[band_index]["min"]
    prev_rate = prev_band["rate"] if prev_band else 0

    tax_at_threshold = sum(s["tax"] for s in _slab_wise_tax(threshold_income, slabs))
    surcharge_at_threshold = _pct_of(tax_at_threshold, prev_rate)
    liability_at_threshold = tax_at_threshold + surcharge_at_threshold

    max_total = liability_at_threshold + (taxable_income - threshold_income)
    raw_total = tax_after_rebate + raw_surcharge

    if raw_total > max_total:
        surcharge = max(0.0, max_total - tax_after_rebate)
    else:
        surcharge = raw_surcharge

    return _round_half_up(surcharge), applicable_rate


def _presumptive_income(digital_receipts: float, cash_receipts: float) -> int | None:
    """
    Section 44AD presumptive taxation.
    6% of digital receipts + 8% of cash receipts.
    ₹3Cr threshold when cash ≤ 5% of total; ₹2Cr otherwise.
    """
    total = digital_receipts + cash_receipts
    if total == 0:
        return 0.0
    cash_pct = cash_receipts / total
    threshold = SECTION_44AD_THRESHOLD_DIGITAL if cash_pct <= 0.05 else SECTION_44AD_THRESHOLD
    if total > threshold:
        return None  # Not eligible — caller falls back to actuals
    # Single presumptive sum, rounded ONCE (statutory semantics — mirrors
    # sumPctOf in taxCalculator.ts): 6% digital + 8% cash on exact integers.
    n = (_round_half_up(digital_receipts) * SECTION_44AD_DIGITAL_RATE
         + _round_half_up(cash_receipts) * SECTION_44AD_CASH_RATE)
    q, r = divmod(n, 100)
    return q + (1 if r >= 50 else 0)


def _hra_exemption(rent_paid: float, basic_salary: float, hra_received: float, is_metro: bool) -> float:
    """
    HRA exemption — Rule 2A: minimum of three options.
    option1 = hraReceived
    option2 = max(0, rentPaid - 10% * basicSalary)
    option3 = 50%/40% * basicSalary (metro/non-metro)
    """
    if rent_paid == 0 or hra_received == 0:
        return 0.0
    option1 = hra_received
    option2 = max(0, rent_paid - _pct_of(basic_salary, HRA_RENT_THRESHOLD_PCT))
    option3 = _pct_of(basic_salary, HRA_METRO_PCT if is_metro else HRA_NON_METRO_PCT)
    return max(0.0, min(option1, option2, option3))


def _select_old_regime_slabs(personal_info: dict | None) -> list[dict]:
    """Select old regime slab table based on age category."""
    if not personal_info:
        return OLD_REGIME_SLABS
    if personal_info.get("isSuperSeniorCitizen"):
        return OLD_REGIME_SUPER_SENIOR_SLABS
    if personal_info.get("isSeniorCitizen"):
        return OLD_REGIME_SENIOR_SLABS
    return OLD_REGIME_SLABS


# ── Gross Total Income ────────────────────────────────────────────────────────

def _gross_total_income(income: dict) -> float:
    """
    Aggregate gross total income.
    Professional tax is NOT subtracted here — it is a Section 16 deduction.
    """
    salary = income.get("salary", {})
    total: float = (
        salary.get("grossSalary", 0)
        + salary.get("hraReceived", 0)
        + salary.get("specialAllowance", 0)
        + salary.get("otherAllowances", 0)
    )

    hp = income.get("houseProperty")
    if hp:
        nav = hp.get("annualValue", 0) - hp.get("municipalTaxes", 0)
        std_ded = _pct_of(nav, 30)
        total += nav - std_ded - hp.get("interestOnHomeLoan", 0)

    bi = income.get("businessIncome")
    if bi:
        digital = bi.get("digitalReceipts", 0)
        cash    = bi.get("cashReceipts", 0)
        if digital > 0 or cash > 0:
            presumptive = _presumptive_income(digital, cash)
            total += presumptive if presumptive is not None else max(0.0, bi.get("grossReceipts", 0) - bi.get("expenses", 0))
        else:
            total += max(0.0, bi.get("grossReceipts", 0) - bi.get("expenses", 0))

    cg = income.get("capitalGains")
    if cg:
        total += cg.get("shortTerm", 0) + cg.get("longTerm", 0)

    os_ = income.get("otherSources")
    if os_:
        total += os_.get("interestIncome", 0) + os_.get("dividendIncome", 0) + os_.get("other", 0)

    return max(0.0, total)


def _income_breakdown(income: dict) -> dict:
    salary = income.get("salary", {})
    salary_total = (
        salary.get("grossSalary", 0)
        + salary.get("hraReceived", 0)
        + salary.get("specialAllowance", 0)
        + salary.get("otherAllowances", 0)
    )

    hp = income.get("houseProperty")
    hp_total = 0
    if hp:
        nav = hp.get("annualValue", 0) - hp.get("municipalTaxes", 0)
        hp_total = nav - _pct_of(nav, 30) - hp.get("interestOnHomeLoan", 0)

    bi = income.get("businessIncome")
    bi_total = 0
    if bi:
        digital = bi.get("digitalReceipts", 0)
        cash    = bi.get("cashReceipts", 0)
        if digital > 0 or cash > 0:
            p = _presumptive_income(digital, cash)
            bi_total = p if p is not None else max(0.0, bi.get("grossReceipts", 0) - bi.get("expenses", 0))
        else:
            bi_total = max(0.0, bi.get("grossReceipts", 0) - bi.get("expenses", 0))

    cg = income.get("capitalGains")
    cg_total = (cg.get("shortTerm", 0) + cg.get("longTerm", 0)) if cg else 0

    os_ = income.get("otherSources")
    os_total = (os_.get("interestIncome", 0) + os_.get("dividendIncome", 0) + os_.get("other", 0)) if os_ else 0

    return {
        "salary":         _round_half_up(salary_total),
        "houseProperty":  _round_half_up(hp_total),
        "businessIncome": _round_half_up(bi_total),
        "capitalGains":   _round_half_up(cg_total),
        "otherSources":   _round_half_up(os_total),
    }


# ── Deduction calculations ────────────────────────────────────────────────────

def _old_regime_deductions(income: dict, deductions: dict) -> dict:
    """Compute deduction breakdown under old regime."""
    s80c_raw = sum([
        deductions.get("section80C", {}).get("lic", 0),
        deductions.get("section80C", {}).get("ppf", 0),
        deductions.get("section80C", {}).get("elss", 0),
        deductions.get("section80C", {}).get("nsc", 0),
        deductions.get("section80C", {}).get("homeLoanPrincipal", 0),
        deductions.get("section80C", {}).get("tuitionFees", 0),
        deductions.get("section80C", {}).get("sukanyaSamriddhi", 0),
        deductions.get("section80C", {}).get("other", 0),
    ])
    section80C = min(s80c_raw, SECTION_80C_LIMIT)

    section80CCD1B = min(
        deductions.get("section80CCD1B", {}).get("npsAdditional", 0),
        SECTION_80CCD1B_LIMIT,
    )

    s80d = deductions.get("section80D", {})
    self_limit    = SECTION_80D_SELF_SENIOR if s80d.get("isSelfSenior") else SECTION_80D_SELF
    parents_limit = SECTION_80D_PARENTS_SENIOR if s80d.get("isParentsSenior") else SECTION_80D_PARENTS
    self_premium    = min(s80d.get("selfPremium", 0), self_limit)
    parents_premium = min(s80d.get("parentsPremium", 0), parents_limit)
    preventive      = min(s80d.get("preventiveHealthCheckup", 0), SECTION_80D_PREVENTIVE)
    section80D = self_premium + parents_premium + preventive

    section80E = deductions.get("section80E", {}).get("educationLoanInterest", 0)
    section80G = _pct_of(deductions.get("section80G", {}).get("donations", 0), 50)

    salary      = income.get("salary", {})
    hra_data    = deductions.get("hra", {})
    hra = _hra_exemption(
        hra_data.get("rentPaid", 0),
        salary.get("basicSalary", 0),     # from IncomeData (HIGH-5 fix mirror)
        salary.get("hraReceived", 0),
        hra_data.get("isMetro", False),
    )

    professional_tax = salary.get("professionalTax", 0)  # Section 16(iii) deduction

    return {
        "section80C":        _round_half_up(section80C),
        "section80CCD1B":    _round_half_up(section80CCD1B),
        "section80D":        _round_half_up(section80D),
        "section80E":        _round_half_up(section80E),
        "section80G":        _round_half_up(section80G),
        "hra":               _round_half_up(hra),
        "standardDeduction": STANDARD_DEDUCTION,
        "professionalTax":   _round_half_up(professional_tax),
    }


# ── Core calculators ──────────────────────────────────────────────────────────

def calculate_new_regime(income: dict, deductions: dict, personal_info: dict | None = None) -> dict:
    """
    Calculate income tax under New Regime (Section 115BAC), FY 2025-26.
    Mirrors TaxCalculator.calculateNewRegime() in TypeScript.
    """
    if personal_info and personal_info.get("residentialStatus") not in (None, "resident"):
        raise ValueError("NRI/RNOR tax calculation is not supported. Only resident individuals are supported.")

    gross_total = _gross_total_income(income)
    income_breakdown = _income_breakdown(income)

    salary = income.get("salary", {})
    professional_tax = salary.get("professionalTax", 0)
    total_deductions = STANDARD_DEDUCTION + professional_tax

    deduction_breakdown = {
        "section80C":        0,
        "section80CCD1B":    0,
        "section80D":        0,
        "section80E":        0,
        "section80G":        0,
        "hra":               0,
        "standardDeduction": _round_half_up(STANDARD_DEDUCTION),
        "professionalTax":   _round_half_up(professional_tax),
    }

    taxable_income = max(0.0, gross_total - total_deductions)
    slab_wise = _slab_wise_tax(taxable_income, NEW_REGIME_SLABS)
    tax_before_surcharge = sum(s["tax"] for s in slab_wise)

    rebate_87a  = _rebate_87a_new_regime(taxable_income, tax_before_surcharge)
    tax_after_rebate = max(0.0, tax_before_surcharge - rebate_87a)

    surcharge, surcharge_rate = _surcharge_with_marginal_relief(
        taxable_income, tax_after_rebate, SURCHARGE_THRESHOLDS, NEW_REGIME_SLABS
    )
    tax_after_surcharge = tax_after_rebate + surcharge

    cess = _pct_of(tax_after_surcharge, CESS_RATE)
    total_tax = tax_after_surcharge + cess

    rounded_gross = _round_half_up(gross_total)
    rounded_tax   = _round_half_up(total_tax)
    effective_rate = round((rounded_tax / rounded_gross) * 100, 2) if rounded_gross > 0 else 0.0

    return {
        "regime":              "new",
        "grossTotalIncome":    rounded_gross,
        "incomeBreakdown":     income_breakdown,
        "totalDeductions":     _round_half_up(total_deductions),
        "deductionBreakdown":  deduction_breakdown,
        "taxableIncome":       _round_half_up(taxable_income),
        "slabWiseTax":         slab_wise,
        "taxBeforeSurcharge":  _round_half_up(tax_before_surcharge),
        "surcharge":           _round_half_up(surcharge),
        "surchargeRate":       surcharge_rate,
        "taxAfterSurcharge":   _round_half_up(tax_after_surcharge),
        "cess":                cess,
        "cessRate":            CESS_RATE,
        "rebate87A":           _round_half_up(rebate_87a),
        "totalTaxLiability":   rounded_tax,
        "effectiveTaxRate":    effective_rate,
        "takeHomeIncome":      rounded_gross - rounded_tax,
    }


def calculate_old_regime(income: dict, deductions: dict, personal_info: dict | None = None) -> dict:
    """
    Calculate income tax under Old Regime, FY 2025-26.
    Mirrors TaxCalculator.calculateOldRegime() in TypeScript.
    """
    if personal_info and personal_info.get("residentialStatus") not in (None, "resident"):
        raise ValueError("NRI/RNOR tax calculation is not supported. Only resident individuals are supported.")

    gross_total = _gross_total_income(income)
    income_breakdown = _income_breakdown(income)

    ded_breakdown = _old_regime_deductions(income, deductions)
    total_deductions = sum(ded_breakdown.values())
    taxable_income = max(0.0, gross_total - total_deductions)

    slabs = _select_old_regime_slabs(personal_info)
    slab_wise = _slab_wise_tax(taxable_income, slabs)
    tax_before_surcharge = sum(s["tax"] for s in slab_wise)

    rebate_87a  = _rebate_87a_old_regime(taxable_income, tax_before_surcharge)
    tax_after_rebate = max(0.0, tax_before_surcharge - rebate_87a)

    surcharge, surcharge_rate = _surcharge_with_marginal_relief(
        taxable_income, tax_after_rebate, SURCHARGE_THRESHOLDS, slabs
    )
    tax_after_surcharge = tax_after_rebate + surcharge

    cess = _pct_of(tax_after_surcharge, CESS_RATE)
    total_tax = tax_after_surcharge + cess

    rounded_gross = _round_half_up(gross_total)
    rounded_tax   = _round_half_up(total_tax)
    effective_rate = round((rounded_tax / rounded_gross) * 100, 2) if rounded_gross > 0 else 0.0

    return {
        "regime":              "old",
        "grossTotalIncome":    rounded_gross,
        "incomeBreakdown":     income_breakdown,
        "totalDeductions":     _round_half_up(total_deductions),
        "deductionBreakdown":  ded_breakdown,
        "taxableIncome":       _round_half_up(taxable_income),
        "slabWiseTax":         slab_wise,
        "taxBeforeSurcharge":  _round_half_up(tax_before_surcharge),
        "surcharge":           _round_half_up(surcharge),
        "surchargeRate":       surcharge_rate,
        "taxAfterSurcharge":   _round_half_up(tax_after_surcharge),
        "cess":                cess,
        "cessRate":            CESS_RATE,
        "rebate87A":           _round_half_up(rebate_87a),
        "totalTaxLiability":   rounded_tax,
        "effectiveTaxRate":    effective_rate,
        "takeHomeIncome":      rounded_gross - rounded_tax,
    }


def compare_regimes(income: dict, deductions: dict, personal_info: dict | None = None) -> dict:
    """
    Compare old vs new regime and recommend the better one.
    Mirrors TaxCalculator.compareRegimes() in TypeScript.
    Returns RegimeComparisonResult.
    """
    old = calculate_old_regime(income, deductions, personal_info)
    new = calculate_new_regime(income, deductions, personal_info)

    recommended = "old" if old["totalTaxLiability"] <= new["totalTaxLiability"] else "new"
    savings = abs(old["totalTaxLiability"] - new["totalTaxLiability"])
    higher_tax = max(old["totalTaxLiability"], new["totalTaxLiability"])
    savings_pct = round((savings / higher_tax) * 100, 2) if higher_tax > 0 else 0.0
    deductions_lost = old["totalDeductions"] - new["totalDeductions"]

    old_benefits: list[str] = []
    new_benefits: list[str] = []

    if old["totalDeductions"] > 100_000:
        old_benefits.append(
            f"Deductions of ₹{old['totalDeductions']:,} reduce your taxable income"
        )
    if old["deductionBreakdown"]["section80C"] > 0:
        old_benefits.append(f"Section 80C: ₹{old['deductionBreakdown']['section80C']:,}")
    if old["deductionBreakdown"]["hra"] > 0:
        old_benefits.append(f"HRA exemption: ₹{old['deductionBreakdown']['hra']:,}")
    if old["deductionBreakdown"]["section80D"] > 0:
        old_benefits.append(f"Health insurance (80D): ₹{old['deductionBreakdown']['section80D']:,}")
    if old["rebate87A"] > 0:
        old_benefits.append(f"Section 87A rebate: ₹{old['rebate87A']:,}")

    if new["rebate87A"] > 0:
        new_benefits.append(f"Section 87A rebate: ₹{new['rebate87A']:,}")
    if new["effectiveTaxRate"] < old["effectiveTaxRate"]:
        new_benefits.append(
            f"Lower effective rate: {new['effectiveTaxRate']:.2f}% vs {old['effectiveTaxRate']:.2f}%"
        )
    new_benefits.append("Simpler filing — fewer deductions to track")
    if new["taxableIncome"] <= 700_000:
        new_benefits.append("Eligible for full 87A rebate — zero tax")

    if savings == 0:
        recommendation = "Both regimes result in equal tax. Choose New Regime for simpler filing."
    elif recommended == "old":
        recommendation = f"Old Regime saves ₹{savings:,} ({savings_pct:.1f}%) by using your deductions."
    else:
        recommendation = f"New Regime saves ₹{savings:,} ({savings_pct:.1f}%) with lower slab rates."

    return {
        "oldRegime":         old,
        "newRegime":         new,
        "recommendedRegime": recommended,
        "savings":           _round_half_up(savings),
        "savingsPercentage": savings_pct,
        "deductionsLost":    _round_half_up(deductions_lost),
        "analysis": {
            "oldRegimeBenefits": old_benefits,
            "newRegimeBenefits": new_benefits,
            "recommendation":    recommendation,
        },
    }


# ── Lambda handler ────────────────────────────────────────────────────────────

def lambda_handler(event: dict, context: Any) -> dict:
    """
    AWS Lambda entry point.

    Expected JSON body:
    {
      "income":       { ...IncomeData... },
      "deductions":   { ...DeductionData... },
      "personalInfo": { ...PersonalInfo... }   // optional
    }

    Returns HTTP 200 with RegimeComparisonResult JSON,
    or HTTP 400/500 with error details.
    """
    try:
        body = event.get("body") or "{}"
        if isinstance(body, str):
            payload = json.loads(body)
        else:
            payload = body

        income       = payload.get("income", {})
        deductions   = payload.get("deductions", {})
        personal_info = payload.get("personalInfo")

        # Ensure salary sub-object always exists to avoid KeyError
        if "salary" not in income:
            income["salary"] = {
                "grossSalary": 0,
                "basicSalary": 0,
                "hraReceived": 0,
                "specialAllowance": 0,
                "otherAllowances": 0,
                "professionalTax": 0,
            }

        # Ensure deduction sub-objects always exist
        for key in ("section80C", "section80CCD1B", "section80D", "section80E", "section80G", "hra"):
            if key not in deductions:
                deductions[key] = {}

        result = compare_regimes(income, deductions, personal_info)

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(result),
        }

    except ValueError as exc:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(exc)}),
        }
    except (json.JSONDecodeError, TypeError) as exc:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": f"Invalid JSON payload: {exc}"}),
        }
    except Exception as exc:  # pylint: disable=broad-except
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": f"Internal server error: {exc}"}),
        }
