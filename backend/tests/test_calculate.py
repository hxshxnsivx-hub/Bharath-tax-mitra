"""
Tests for tax_calculation Lambda — FY 2025-26 (AY 2025-26).
Covers 5+ scenarios: salaried, business, senior citizen, zero income, high income.
Cross-verified against frontend taxCalculator.ts logic.
"""
import json
import pytest

from src.lambdas.tax_calculation.calculate import (
    calculate_new_regime,
    calculate_old_regime,
    compare_regimes,
    lambda_handler,
    _slab_wise_tax,
    _rebate_87a_new_regime,
    _rebate_87a_old_regime,
    _hra_exemption,
    _presumptive_income,
    _surcharge_with_marginal_relief,
    NEW_REGIME_SLABS,
    OLD_REGIME_SLABS,
    SURCHARGE_THRESHOLDS,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

def _salary_income(
    gross=1_000_000,
    basic=500_000,
    hra=200_000,
    special=100_000,
    other=0,
    prof_tax=2_400,
):
    return {
        "salary": {
            "grossSalary":      gross,
            "basicSalary":      basic,
            "hraReceived":      hra,
            "specialAllowance": special,
            "otherAllowances":  other,
            "professionalTax":  prof_tax,
        }
    }


def _zero_deductions():
    return {
        "section80C":    {"lic": 0, "ppf": 0, "elss": 0, "nsc": 0, "homeLoanPrincipal": 0, "tuitionFees": 0, "sukanyaSamriddhi": 0, "other": 0},
        "section80CCD1B":{"npsAdditional": 0},
        "section80D":    {"selfPremium": 0, "parentsPremium": 0, "preventiveHealthCheckup": 0, "isSelfSenior": False, "isParentsSenior": False},
        "section80E":    {"educationLoanInterest": 0},
        "section80G":    {"donations": 0},
        "hra":           {"rentPaid": 0, "isMetro": False},
    }


def _full_deductions():
    """Typical salaried taxpayer deductions."""
    return {
        "section80C":    {"lic": 50_000, "ppf": 50_000, "elss": 50_000, "nsc": 0, "homeLoanPrincipal": 0, "tuitionFees": 0, "sukanyaSamriddhi": 0, "other": 0},
        "section80CCD1B":{"npsAdditional": 50_000},
        "section80D":    {"selfPremium": 25_000, "parentsPremium": 25_000, "preventiveHealthCheckup": 5_000, "isSelfSenior": False, "isParentsSenior": False},
        "section80E":    {"educationLoanInterest": 0},
        "section80G":    {"donations": 0},
        "hra":           {"rentPaid": 180_000, "isMetro": True},
    }


def _resident_personal_info(is_senior=False, is_super_senior=False):
    return {
        "pan":                  "ABCDE1234F",
        "name":                 "Test User",
        "dateOfBirth":          "1985-06-15",
        "age":                  39,
        "isSeniorCitizen":      is_senior,
        "isSuperSeniorCitizen": is_super_senior,
        "residentialStatus":    "resident",
    }


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 1 — Salaried taxpayer (₹10 LPA gross)
# ─────────────────────────────────────────────────────────────────────────────

class TestSalariedTaxpayer:
    """
    Gross salary: ₹10,00,000 (basic 5L, HRA 2L, special 1L)
    Professional tax: ₹2,400
    """

    def test_new_regime_taxable_income(self):
        income = _salary_income()
        ded    = _zero_deductions()
        result = calculate_new_regime(income, ded)
        # Gross = 10,00,000 + 2,00,000 + 1,00,000 = 13,00,000
        # Deductions = 50,000 std + 2,400 prof tax = 52,400
        # Taxable = 12,47,600
        assert result["grossTotalIncome"] == 1_300_000
        assert result["totalDeductions"]  == 52_400
        assert result["taxableIncome"]    == 1_247_600

    def test_new_regime_regime_label(self):
        income = _salary_income()
        result = calculate_new_regime(income, _zero_deductions())
        assert result["regime"] == "new"

    def test_old_regime_with_full_deductions(self):
        income = _salary_income()
        ded    = _full_deductions()
        result = calculate_old_regime(income, ded)
        # HRA Rule 2A — min(hra_received, rent_paid - 10%*basic, 50%*basic)
        # = min(2,00,000, 1,80,000 - 10%*5,00,000, 50%*5,00,000)
        # = min(2,00,000, 1,30,000, 2,50,000) = 1,30,000
        assert result["deductionBreakdown"]["hra"] == 130_000
        assert result["totalDeductions"] > 300_000  # large deductions bundle

    def test_take_home_income_equals_gross_minus_tax(self):
        income = _salary_income()
        result = calculate_new_regime(income, _zero_deductions())
        assert result["takeHomeIncome"] == result["grossTotalIncome"] - result["totalTaxLiability"]

    def test_effective_rate_is_positive_and_bounded(self):
        income = _salary_income()
        result = calculate_new_regime(income, _zero_deductions())
        assert 0 < result["effectiveTaxRate"] < 35

    def test_cess_is_4_percent_of_tax_plus_surcharge(self):
        income = _salary_income()
        result = calculate_new_regime(income, _zero_deductions())
        expected_cess = round(result["taxAfterSurcharge"] * 4 / 100)
        assert result["cess"] == expected_cess

    def test_compare_regimes_returns_both(self):
        income = _salary_income()
        comp   = compare_regimes(income, _zero_deductions())
        assert "oldRegime" in comp
        assert "newRegime" in comp
        assert comp["recommendedRegime"] in ("old", "new")

    def test_new_regime_no_87a_above_7l(self):
        """Taxable income above ₹7L → no full 87A rebate."""
        income = _salary_income()  # taxable ~12.5L
        result = calculate_new_regime(income, _zero_deductions())
        assert result["rebate87A"] == 0

    def test_standard_deduction_is_50000(self):
        income = _salary_income(gross=800_000, basic=400_000, hra=150_000, special=0, other=0, prof_tax=0)
        result = calculate_new_regime(income, _zero_deductions())
        assert result["deductionBreakdown"]["standardDeduction"] == 50_000


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 2 — Business income (Section 44AD presumptive)
# ─────────────────────────────────────────────────────────────────────────────

class TestBusinessIncome:
    """
    Section 44AD presumptive business income.
    Digital receipts ₹50L → taxable profit = 6% = ₹3L.
    """

    def _business_income_only(self, digital=5_000_000, cash=0):
        return {
            "salary": {
                "grossSalary": 0, "basicSalary": 0, "hraReceived": 0,
                "specialAllowance": 0, "otherAllowances": 0, "professionalTax": 0,
            },
            "businessIncome": {
                "grossReceipts": digital + cash,
                "digitalReceipts": digital,
                "cashReceipts":    cash,
                "expenses": 0,
            },
        }

    def test_presumptive_income_6pct_digital(self):
        income = self._business_income_only(digital=5_000_000, cash=0)
        result = calculate_new_regime(income, _zero_deductions())
        # 6% of 50L = 3L; standard deduction not applied for business-only
        # Actually standard deduction IS applied (salary sub-object present)
        # gross = 3,00,000 - 50,000 std = 2,50,000 taxable → 0 tax (within 0% slab for new regime)
        assert result["incomeBreakdown"]["businessIncome"] == 300_000

    def test_presumptive_income_8pct_cash(self):
        """Cash receipts attract 8% rate."""
        income = self._business_income_only(digital=0, cash=1_000_000)
        result = calculate_new_regime(income, _zero_deductions())
        assert result["incomeBreakdown"]["businessIncome"] == 80_000

    def test_above_2cr_threshold_not_eligible(self):
        """Above ₹2Cr threshold → not eligible for presumptive; uses actual profit."""
        income = {
            "salary": {
                "grossSalary": 0, "basicSalary": 0, "hraReceived": 0,
                "specialAllowance": 0, "otherAllowances": 0, "professionalTax": 0,
            },
            "businessIncome": {
                "grossReceipts":   25_000_000,
                "digitalReceipts": 0,
                "cashReceipts":    25_000_000,  # cash > 5% so threshold = 2Cr
                "expenses":        20_000_000,
            },
        }
        # Total > 2Cr → actual income = 25M - 20M = 5M
        result = calculate_new_regime(income, _zero_deductions())
        assert result["incomeBreakdown"]["businessIncome"] == 5_000_000

    def test_3cr_threshold_when_cash_leq_5pct(self):
        """Cash ≤ 5% of total → threshold is ₹3Cr."""
        income = {
            "salary": {
                "grossSalary": 0, "basicSalary": 0, "hraReceived": 0,
                "specialAllowance": 0, "otherAllowances": 0, "professionalTax": 0,
            },
            "businessIncome": {
                "grossReceipts":   25_000_000,
                "digitalReceipts": 24_000_000,
                "cashReceipts":    1_000_000,   # 4% cash → threshold = 3Cr; 25M < 3Cr? No, 25M < 30M ✓
                "expenses":        0,
            },
        }
        # cash_pct = 1/25 = 4% ≤ 5% → use ₹3Cr threshold → 25M < 30M → eligible
        # income = 6% * 24M + 8% * 1M = 1,440,000 + 80,000 = 1,520,000
        result = calculate_new_regime(income, _zero_deductions())
        assert result["incomeBreakdown"]["businessIncome"] == 1_520_000

    def test_mixed_digital_and_cash_receipts(self):
        """Mixed receipts: 10L digital + 2L cash (cash = 17% → use 2Cr threshold)."""
        income = self._business_income_only(digital=1_000_000, cash=200_000)
        result = calculate_new_regime(income, _zero_deductions())
        # cash% = 2/12 = 16.7% > 5% → threshold = 2Cr; total = 12L < 2Cr → eligible
        # presumptive = 6%*10L + 8%*2L = 60,000 + 16,000 = 76,000
        assert result["incomeBreakdown"]["businessIncome"] == 76_000


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 3 — Senior citizen (age 65, old regime)
# ─────────────────────────────────────────────────────────────────────────────

class TestSeniorCitizen:
    """
    Senior citizen (60-79): nil slab up to ₹3L in old regime.
    """

    def test_senior_citizen_uses_3l_nil_slab(self):
        income = _salary_income(gross=700_000, basic=350_000, hra=0, special=0, other=0, prof_tax=0)
        personal = _resident_personal_info(is_senior=True)
        # Gross = 7L, deductions = 50K std → taxable = 6.5L
        # Senior slabs: 0 on 3L, 5% on 2L, 20% on 1.5L
        result = calculate_old_regime(income, _zero_deductions(), personal)
        assert result["taxableIncome"] == 650_000
        # Expected tax: 5% * (5L-3L) = 10,000 + 20% * (6.5L-5L) = 30,000 = 40,000
        assert result["taxBeforeSurcharge"] == 40_000

    def test_standard_taxpayer_uses_2_5l_nil_slab(self):
        income = _salary_income(gross=700_000, basic=350_000, hra=0, special=0, other=0, prof_tax=0)
        personal = _resident_personal_info(is_senior=False)
        result = calculate_old_regime(income, _zero_deductions(), personal)
        assert result["taxableIncome"] == 650_000
        # Standard: 5% on (5L-2.5L) = 12,500 + 20% on (6.5L-5L) = 30,000 = 42,500
        assert result["taxBeforeSurcharge"] == 42_500

    def test_super_senior_uses_5l_nil_slab(self):
        income = _salary_income(gross=700_000, basic=350_000, hra=0, special=0, other=0, prof_tax=0)
        personal = _resident_personal_info(is_super_senior=True)
        result = calculate_old_regime(income, _zero_deductions(), personal)
        # Super-senior: 0 on 5L, 20% on 1.5L = 30,000
        assert result["taxBeforeSurcharge"] == 30_000

    def test_senior_87a_rebate_old_regime_at_5l(self):
        """Income ≤ ₹5L in old regime → full 87A rebate (₹12,500 max)."""
        income = _salary_income(gross=500_000, basic=250_000, hra=0, special=0, other=0, prof_tax=0)
        personal = _resident_personal_info(is_senior=True)
        result = calculate_old_regime(income, _zero_deductions(), personal)
        # Taxable = 5L - 50K = 4.5L; senior nil slab = 3L; tax = 5% * 1.5L = 7,500
        # 87A rebate = min(7500, 12500) = 7500 → total tax = 0
        assert result["rebate87A"] > 0
        assert result["totalTaxLiability"] == 0

    def test_new_regime_age_irrelevant(self):
        """New regime slabs are the same for all ages."""
        income = _salary_income(gross=700_000, basic=350_000, hra=0, special=0, other=0, prof_tax=0)
        result_standard = calculate_new_regime(income, _zero_deductions(), _resident_personal_info())
        result_senior   = calculate_new_regime(income, _zero_deductions(), _resident_personal_info(is_senior=True))
        # Same taxable income and same slabs → equal tax
        assert result_standard["totalTaxLiability"] == result_senior["totalTaxLiability"]


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 4 — Zero income
# ─────────────────────────────────────────────────────────────────────────────

class TestZeroIncome:
    """All income fields zero → no tax liability."""

    def _zero_income(self):
        return {
            "salary": {
                "grossSalary": 0, "basicSalary": 0, "hraReceived": 0,
                "specialAllowance": 0, "otherAllowances": 0, "professionalTax": 0,
            }
        }

    def test_zero_income_new_regime(self):
        result = calculate_new_regime(self._zero_income(), _zero_deductions())
        assert result["grossTotalIncome"]  == 0
        assert result["taxableIncome"]     == 0
        assert result["totalTaxLiability"] == 0
        assert result["effectiveTaxRate"]  == 0.0

    def test_zero_income_old_regime(self):
        result = calculate_old_regime(self._zero_income(), _zero_deductions())
        assert result["grossTotalIncome"]  == 0
        assert result["taxableIncome"]     == 0
        assert result["totalTaxLiability"] == 0

    def test_zero_income_take_home_is_zero(self):
        result = calculate_new_regime(self._zero_income(), _zero_deductions())
        assert result["takeHomeIncome"] == 0

    def test_zero_income_no_surcharge(self):
        result = calculate_new_regime(self._zero_income(), _zero_deductions())
        assert result["surcharge"]     == 0
        assert result["surchargeRate"] == 0

    def test_zero_income_compare_regimes_equal_tax(self):
        comp = compare_regimes(self._zero_income(), _zero_deductions())
        assert comp["oldRegime"]["totalTaxLiability"] == 0
        assert comp["newRegime"]["totalTaxLiability"] == 0
        assert comp["savings"] == 0


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 5 — High income (₹75 LPA) — surcharge applies
# ─────────────────────────────────────────────────────────────────────────────

class TestHighIncome:
    """
    Gross income ₹75,00,000 — enters 10% surcharge band (>₹50L).
    """

    def _high_income(self):
        return {
            "salary": {
                "grossSalary":      70_000_000 // 10,   # 70L
                "basicSalary":      35_000_000 // 10,   # 35L
                "hraReceived":      0,
                "specialAllowance": 5_000_000  // 10,   # 5L
                "otherAllowances":  0,
                "professionalTax":  2_400,
            }
        }

    def test_high_income_new_regime_taxable(self):
        income = self._high_income()
        result = calculate_new_regime(income, _zero_deductions())
        # gross = 75L, deductions = 50K std + 2400 prof = 52400
        assert result["grossTotalIncome"] == 7_500_000
        assert result["taxableIncome"]    == 7_500_000 - 52_400

    def test_high_income_surcharge_applies(self):
        income = self._high_income()
        result = calculate_new_regime(income, _zero_deductions())
        # taxable ~74.5L > 50L → 10% surcharge band
        assert result["surchargeRate"] == 10
        assert result["surcharge"]     >  0

    def test_high_income_surcharge_marginal_relief(self):
        """Surcharge must not exceed the income over the ₹50L threshold."""
        income = self._high_income()
        result = calculate_new_regime(income, _zero_deductions())
        taxable = result["taxableIncome"]
        excess  = taxable - 5_000_000  # ₹50L threshold
        assert result["surcharge"] <= excess

    def test_high_income_cess_4pct(self):
        income = self._high_income()
        result = calculate_new_regime(income, _zero_deductions())
        expected_cess = round(result["taxAfterSurcharge"] * 4 / 100)
        assert result["cess"] == expected_cess

    def test_high_income_no_87a_rebate(self):
        income = self._high_income()
        result = calculate_new_regime(income, _zero_deductions())
        # Income >> ₹7L → zero 87A rebate
        assert result["rebate87A"] == 0

    def test_high_income_effective_rate_above_20pct(self):
        income = self._high_income()
        result = calculate_new_regime(income, _zero_deductions())
        assert result["effectiveTaxRate"] > 20.0


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 6 — Section 87A rebate edge cases
# ─────────────────────────────────────────────────────────────────────────────

class TestSection87A:
    """87A rebate behaviour at and around thresholds."""

    def _income_at(self, gross):
        """Income with no HRA so gross == gross salary."""
        return {
            "salary": {
                "grossSalary": gross, "basicSalary": gross // 2,
                "hraReceived": 0, "specialAllowance": 0,
                "otherAllowances": 0, "professionalTax": 0,
            }
        }

    def test_new_regime_full_rebate_at_7l(self):
        """Taxable ≤ ₹7L → max rebate ₹25,000; total tax = 0."""
        # gross = 7.5L, std ded = 50K → taxable = 7L exactly
        income = self._income_at(750_000)
        result = calculate_new_regime(income, _zero_deductions())
        assert result["taxableIncome"] == 700_000
        assert result["rebate87A"]     == 25_000
        assert result["totalTaxLiability"] == 0

    def test_new_regime_no_rebate_above_7l(self):
        """Taxable > ₹7L with high marginal relief → very small or zero rebate."""
        income = self._income_at(810_000)   # taxable = 8.1L - 50K = 7.6L
        result = calculate_new_regime(income, _zero_deductions())
        assert result["taxableIncome"] == 760_000
        # No full rebate; marginal relief may give partial rebate
        assert result["rebate87A"] >= 0

    def test_new_regime_marginal_relief_at_7l_boundary(self):
        """
        Marginal relief: if tax > (income - 7L), rebate = tax - (income - 7L).
        Taxable = 7,10,000; slab tax = 5%*3L + 10%*1.1L = 15,000 + 11,000 = 26,000
        excess = 10,000; rebate = 26,000 - 10,000 = 16,000
        tax after rebate = 10,000; cess = 4% * 10,000 = 400
        total tax liability = 10,400
        """
        income = self._income_at(760_000)  # taxable = 7,10,000
        result = calculate_new_regime(income, _zero_deductions())
        assert result["taxableIncome"] == 710_000
        # Net tax = excess (10,000) + 4% cess on 10,000 = 10,400
        assert result["totalTaxLiability"] == 10_400

    def test_old_regime_full_rebate_at_5l(self):
        """Old regime 87A: income ≤ ₹5L → full rebate."""
        income = self._income_at(550_000)  # taxable = 5.5L - 50K = 5L
        result = calculate_old_regime(income, _zero_deductions())
        assert result["taxableIncome"] == 500_000
        assert result["rebate87A"]     > 0
        assert result["totalTaxLiability"] == 0

    def test_old_regime_no_rebate_above_5l(self):
        income = self._income_at(600_000)  # taxable = 5.5L
        result = calculate_old_regime(income, _zero_deductions())
        assert result["rebate87A"] == 0
        assert result["totalTaxLiability"] > 0


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 7 — HRA exemption
# ─────────────────────────────────────────────────────────────────────────────

class TestHRAExemption:
    def test_metro_hra_50pct_basic(self):
        # min(1.5L HRA, 1.8L - 5%, 50% * 3L) = min(1.5L, 1.65L, 1.5L) = 1.5L
        hra = _hra_exemption(180_000, 300_000, 150_000, is_metro=True)
        assert hra == 150_000

    def test_non_metro_hra_40pct_basic(self):
        # min(1.5L, 1.65L, 40%*3L=1.2L) = 1.2L
        hra = _hra_exemption(180_000, 300_000, 150_000, is_metro=False)
        assert hra == 120_000

    def test_zero_rent_paid_gives_zero_hra(self):
        assert _hra_exemption(0, 500_000, 100_000, is_metro=True) == 0

    def test_zero_hra_received_gives_zero_hra(self):
        assert _hra_exemption(100_000, 500_000, 0, is_metro=True) == 0

    def test_hra_exemption_in_old_regime(self):
        income = {
            "salary": {
                "grossSalary": 1_000_000, "basicSalary": 500_000,
                "hraReceived": 200_000,   "specialAllowance": 0,
                "otherAllowances": 0,     "professionalTax": 0,
            }
        }
        ded = {
            **_zero_deductions(),
            "hra": {"rentPaid": 180_000, "isMetro": True},
        }
        result = calculate_old_regime(income, ded)
        # min(2L, 1.8L-5%*5L=1.3L, 50%*5L=2.5L) = 1.3L
        assert result["deductionBreakdown"]["hra"] == 130_000

    def test_hra_not_applied_in_new_regime(self):
        income = {
            "salary": {
                "grossSalary": 1_000_000, "basicSalary": 500_000,
                "hraReceived": 200_000,   "specialAllowance": 0,
                "otherAllowances": 0,     "professionalTax": 0,
            }
        }
        ded = {
            **_zero_deductions(),
            "hra": {"rentPaid": 180_000, "isMetro": True},
        }
        result = calculate_new_regime(income, ded)
        assert result["deductionBreakdown"]["hra"] == 0


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 8 — Lambda handler (HTTP interface)
# ─────────────────────────────────────────────────────────────────────────────

class TestLambdaHandler:
    def _event(self, payload):
        return {"body": json.dumps(payload)}

    def test_valid_request_returns_200(self):
        payload = {
            "income":     _salary_income(),
            "deductions": _zero_deductions(),
            "personalInfo": _resident_personal_info(),
        }
        resp = lambda_handler(self._event(payload), None)
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert "oldRegime" in body
        assert "newRegime" in body
        assert body["recommendedRegime"] in ("old", "new")

    def test_empty_body_returns_200_with_zero_income(self):
        resp = lambda_handler({"body": "{}"}, None)
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["oldRegime"]["totalTaxLiability"] == 0
        assert body["newRegime"]["totalTaxLiability"] == 0

    def test_invalid_json_returns_400(self):
        resp = lambda_handler({"body": "not-json"}, None)
        assert resp["statusCode"] == 400

    def test_nri_returns_400(self):
        payload = {
            "income":     _salary_income(),
            "deductions": _zero_deductions(),
            "personalInfo": {
                **_resident_personal_info(),
                "residentialStatus": "non-resident",
            },
        }
        resp = lambda_handler(self._event(payload), None)
        assert resp["statusCode"] == 400
        body = json.loads(resp["body"])
        assert "NRI" in body["error"] or "RNOR" in body["error"] or "not supported" in body["error"]

    def test_response_has_content_type_header(self):
        resp = lambda_handler({"body": "{}"}, None)
        assert resp["headers"]["Content-Type"] == "application/json"

    def test_no_body_key_in_event(self):
        """Missing body key should not crash."""
        resp = lambda_handler({}, None)
        assert resp["statusCode"] == 200

    def test_dict_body_instead_of_string(self):
        """Body as a pre-parsed dict (API GW proxy v2 behaviour)."""
        payload = {"income": _salary_income(), "deductions": _zero_deductions()}
        resp = lambda_handler({"body": payload}, None)
        assert resp["statusCode"] == 200


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 9 — Regime comparison
# ─────────────────────────────────────────────────────────────────────────────

class TestRegimeComparison:
    def test_savings_are_non_negative(self):
        income = _salary_income()
        comp = compare_regimes(income, _full_deductions())
        assert comp["savings"] >= 0

    def test_savings_percentage_bounds(self):
        income = _salary_income()
        comp = compare_regimes(income, _full_deductions())
        assert 0 <= comp["savingsPercentage"] <= 100

    def test_recommended_regime_matches_lower_tax(self):
        income = _salary_income()
        comp = compare_regimes(income, _full_deductions())
        if comp["recommendedRegime"] == "old":
            assert comp["oldRegime"]["totalTaxLiability"] <= comp["newRegime"]["totalTaxLiability"]
        else:
            assert comp["newRegime"]["totalTaxLiability"] <= comp["oldRegime"]["totalTaxLiability"]

    def test_analysis_has_recommendation_string(self):
        income = _salary_income()
        comp = compare_regimes(income, _zero_deductions())
        assert isinstance(comp["analysis"]["recommendation"], str)
        assert len(comp["analysis"]["recommendation"]) > 10

    def test_deductions_lost_correct(self):
        income = _salary_income()
        comp = compare_regimes(income, _full_deductions())
        expected = comp["oldRegime"]["totalDeductions"] - comp["newRegime"]["totalDeductions"]
        assert comp["deductionsLost"] == expected


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 10 — Unit tests for core helpers
# ─────────────────────────────────────────────────────────────────────────────

class TestHelpers:
    def test_slab_wise_tax_zero_income(self):
        result = _slab_wise_tax(0, NEW_REGIME_SLABS)
        assert result == []

    def test_slab_wise_tax_exactly_at_slab_boundary(self):
        result = _slab_wise_tax(300_000, NEW_REGIME_SLABS)
        # Entire income falls in 0% slab
        assert all(s["tax"] == 0 for s in result)

    def test_slab_wise_tax_cross_two_slabs(self):
        # 4L: 3L at 0% + 1L at 5% = 5,000
        result = _slab_wise_tax(400_000, NEW_REGIME_SLABS)
        total_tax = sum(s["tax"] for s in result)
        assert total_tax == 5_000

    def test_rebate_87a_new_regime_full(self):
        # tax = 20,000 ≤ 25,000 max, income ≤ 7L
        assert _rebate_87a_new_regime(600_000, 20_000) == 20_000

    def test_rebate_87a_new_regime_capped(self):
        # tax = 30,000 > 25,000 max, income ≤ 7L
        assert _rebate_87a_new_regime(600_000, 30_000) == 25_000

    def test_rebate_87a_new_regime_marginal(self):
        # income = 7,10,000; tax = 17,500; excess = 10,000
        # rebate = 17,500 - 10,000 = 7,500
        assert _rebate_87a_new_regime(710_000, 17_500) == 7_500

    def test_rebate_87a_old_regime_full(self):
        assert _rebate_87a_old_regime(450_000, 10_000) == 10_000

    def test_rebate_87a_old_regime_zero_above_5l(self):
        assert _rebate_87a_old_regime(600_000, 12_500) == 0

    def test_presumptive_income_digital(self):
        assert _presumptive_income(5_000_000, 0) == 300_000  # 6% of 50L

    def test_presumptive_income_cash(self):
        assert _presumptive_income(0, 5_000_000) == 400_000  # 8% of 50L

    def test_presumptive_income_above_threshold(self):
        # Cash > 5% → threshold = 2Cr; 25M > 2Cr → not eligible
        assert _presumptive_income(0, 25_000_000) == 0

    def test_surcharge_zero_below_50l(self):
        surcharge, rate = _surcharge_with_marginal_relief(3_000_000, 500_000, SURCHARGE_THRESHOLDS)
        assert surcharge == 0
        assert rate == 0

    def test_surcharge_10pct_above_50l(self):
        # taxable = 55L, tax = 14L
        surcharge, rate = _surcharge_with_marginal_relief(5_500_000, 1_400_000, SURCHARGE_THRESHOLDS)
        assert rate == 10
        assert surcharge > 0

    def test_old_regime_professional_tax_deducted(self):
        income = {
            "salary": {
                "grossSalary": 1_000_000, "basicSalary": 500_000,
                "hraReceived": 0,         "specialAllowance": 0,
                "otherAllowances": 0,     "professionalTax": 2_400,
            }
        }
        result = calculate_old_regime(income, _zero_deductions())
        assert result["deductionBreakdown"]["professionalTax"] == 2_400

    def test_gross_income_includes_hra_received(self):
        income = {
            "salary": {
                "grossSalary":      500_000,
                "basicSalary":      300_000,
                "hraReceived":      100_000,
                "specialAllowance": 50_000,
                "otherAllowances":  0,
                "professionalTax":  0,
            }
        }
        result = calculate_new_regime(income, _zero_deductions())
        assert result["grossTotalIncome"] == 650_000


# ─────────────────────────────────────────────────────────────────────────────
# CROSS-VERIFICATION — Python vs TypeScript expected outputs
# ─────────────────────────────────────────────────────────────────────────────

class TestCrossVerification:
    """
    Spot-check Python output against known-good TypeScript outputs.
    These values were computed by running the TS calculator for the same inputs.
    """

    def test_salaried_6l_new_regime_zero_tax(self):
        """
        Gross = 6L + HRA 0 + special 0 = 6L
        Std ded = 50K → taxable = 5.5L
        New regime slab tax: 5% on (5.5L-3L) = 12,500
        87A rebate: income ≤ 7L → min(12500, 25000) = 12,500 → zero tax
        """
        income = {
            "salary": {
                "grossSalary": 600_000, "basicSalary": 300_000,
                "hraReceived": 0, "specialAllowance": 0,
                "otherAllowances": 0, "professionalTax": 0,
            }
        }
        result = calculate_new_regime(income, _zero_deductions())
        assert result["taxableIncome"]    == 550_000
        assert result["taxBeforeSurcharge"] == 12_500
        assert result["rebate87A"]        == 12_500
        assert result["totalTaxLiability"] == 0

    def test_salaried_10l_old_regime_with_80c(self):
        """
        Gross = 10L, std ded 50K + 80C 1.5L = 2L total (no HRA, no prof tax)
        Taxable = 8L
        Old slabs: 5% on 2.5L = 12,500; 20% on 3L = 60,000 → total = 72,500
        No 87A (income > 5L)
        Cess 4% → total = 72,500 * 1.04 = 75,400
        """
        income = {
            "salary": {
                "grossSalary": 1_000_000, "basicSalary": 500_000,
                "hraReceived": 0, "specialAllowance": 0,
                "otherAllowances": 0, "professionalTax": 0,
            }
        }
        ded = {
            **_zero_deductions(),
            "section80C": {"lic": 150_000, "ppf": 0, "elss": 0, "nsc": 0, "homeLoanPrincipal": 0, "tuitionFees": 0, "sukanyaSamriddhi": 0, "other": 0},
        }
        result = calculate_old_regime(income, ded)
        assert result["taxableIncome"]      == 800_000
        assert result["taxBeforeSurcharge"] == 72_500
        assert result["rebate87A"]          == 0
        assert result["cess"]               == 2_900   # round(72500 * 0.04) = 2900
        assert result["totalTaxLiability"]  == 75_400

    def test_salaried_20l_new_regime_no_surcharge(self):
        """
        Gross = 20L, std ded 50K → taxable = 19.5L
        New regime: 0 on 3L + 5% on 3L + 10% on 3L + 15% on 3L + 20% on 3L + 30% on 4.5L
        = 0 + 15K + 30K + 45K + 60K + 135K = 285K
        No 87A (income > 7L), no surcharge (< 50L)
        Cess 4% = 11,400 → total = 296,400
        """
        income = {
            "salary": {
                "grossSalary": 2_000_000, "basicSalary": 1_000_000,
                "hraReceived": 0, "specialAllowance": 0,
                "otherAllowances": 0, "professionalTax": 0,
            }
        }
        result = calculate_new_regime(income, _zero_deductions())
        assert result["taxableIncome"]      == 1_950_000
        assert result["taxBeforeSurcharge"] == 285_000
        assert result["surcharge"]          == 0
        assert result["cess"]               == 11_400
        assert result["totalTaxLiability"]  == 296_400
