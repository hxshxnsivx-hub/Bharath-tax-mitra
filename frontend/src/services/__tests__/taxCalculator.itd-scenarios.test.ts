/**
 * Authoritative IT-Department-style validation suite — FY 2025-26 (AY 2025-26)
 *
 * Every expected value in this file is computed BY HAND from the statutory rules
 * (Finance Bill 2025 First Schedule / Section 115BAC / Section 87A / Section 44AD),
 * NOT by re-running the engine. Each case cites the basis of the hand calculation.
 *
 * IMPORTANT — which FY 2025-26 rules apply:
 *   shared/tax-rules-fy2025-26.json (the rule set the engine loads) implements the
 *   *current* AY 2025-26 regime, NOT the Budget-2025 changes that take effect AY 2026-27.
 *   Therefore the values below use:
 *     - New regime: 6-slab table 0/5/10/15/20/30% at 3L/6L/9L/12L/15L boundaries
 *     - New regime standard deduction: ₹50,000  (the ₹75,000 SD is an AY 2026-27 change)
 *     - New regime 87A: ₹25,000 rebate for taxable income ≤ ₹7,00,000 (+ marginal relief)
 *     - Old regime standard deduction: ₹50,000; 87A: ₹12,500 for taxable income ≤ ₹5,00,000
 *     - Health & education cess: 4% of (income-tax + surcharge)
 *   These match the JSON's explicit `_effectiveYearWarning` audit note.
 *
 * Section 44AD rate convention used by the engine (verified against the JSON):
 *   digitalRate = 6%, cashRate = 8% — i.e. 6% on digital/banking receipts and 8% on
 *   cash receipts, exactly as Section 44AD prescribes.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { TaxCalculator } from '../taxCalculator';
import type { TaxRules } from '../../../../shared/types/tax-rules';
import type { IncomeData, DeductionData, PersonalInfo } from '../../../../shared/types/tax-calculation';
import taxRulesData from '../../../../shared/tax-rules-fy2025-26.json';

// ── Builders ──────────────────────────────────────────────────────────────────

function zeroDeductions(): DeductionData {
  return {
    section80C: { lic: 0, ppf: 0, elss: 0, nsc: 0, homeLoanPrincipal: 0, tuitionFees: 0, sukanyaSamriddhi: 0, other: 0 },
    section80CCD1B: { npsAdditional: 0 },
    section80D: { selfPremium: 0, parentsPremium: 0, preventiveHealthCheckup: 0, isSelfSenior: false, isParentsSenior: false },
    section80E: { educationLoanInterest: 0 },
    section80G: { donations: 0 },
    hra: { rentPaid: 0, isMetro: false },
    section16: { professionalTax: 0 },
  };
}

/** Salary-only income so that grossTotalIncome === grossSalary (no HRA/allowance add-ons). */
function salaryOnly(grossSalary: number, professionalTax = 0): IncomeData {
  return {
    salary: {
      grossSalary,
      basicSalary: Math.round(grossSalary * 0.4),
      hraReceived: 0,
      specialAllowance: 0,
      otherAllowances: 0,
      professionalTax,
    },
  };
}

function personalInfo(overrides: Partial<PersonalInfo> = {}): PersonalInfo {
  return {
    pan: 'ABCDE1234F',
    name: 'Test User',
    dateOfBirth: '1985-06-15',
    age: 39,
    isSeniorCitizen: false,
    isSuperSeniorCitizen: false,
    residentialStatus: 'resident',
    ...overrides,
  };
}

describe('TaxCalculator — IT Department authoritative scenarios (FY 2025-26)', () => {
  let calc: TaxCalculator;

  beforeAll(() => {
    calc = new TaxCalculator(taxRulesData as unknown as TaxRules);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // NEW REGIME — salaried, slab boundaries (SD ₹50,000, 87A ₹25k ≤ ₹7L, cess 4%)
  // ───────────────────────────────────────────────────────────────────────────

  describe('New regime salaried — slab boundaries & 87A', () => {
    it('NR-1: gross ₹3.5L → taxable ₹3.0L → nil slab → ₹0', () => {
      // Taxable 3,00,000 lies wholly in the 0% slab (≤ ₹3L). Tax = 0.
      const r = calc.calculateNewRegime(salaryOnly(350_000), zeroDeductions());
      expect(r.taxableIncome).toBe(300_000);
      expect(r.taxBeforeSurcharge).toBe(0);
      expect(r.totalTaxLiability).toBe(0);
    });

    it('NR-2: gross ₹6.5L → taxable ₹6.0L → slab tax ₹15,000 fully rebated → ₹0', () => {
      // 5% of (6L − 3L) = 15,000. 87A (≤7L): min(15,000, 25,000) = 15,000 → net 0.
      const r = calc.calculateNewRegime(salaryOnly(650_000), zeroDeductions());
      expect(r.taxableIncome).toBe(600_000);
      expect(r.taxBeforeSurcharge).toBe(15_000);
      expect(r.rebate87A).toBe(15_000);
      expect(r.totalTaxLiability).toBe(0);
    });

    it('NR-3: gross ₹7.5L → taxable ₹7.0L (rebate cliff) → slab tax ₹25,000 fully rebated → ₹0', () => {
      // 5%*3L + 10%*1L = 15,000 + 10,000 = 25,000. 87A (≤7L): min(25,000,25,000)=25,000 → net 0.
      const r = calc.calculateNewRegime(salaryOnly(750_000), zeroDeductions());
      expect(r.taxableIncome).toBe(700_000);
      expect(r.taxBeforeSurcharge).toBe(25_000);
      expect(r.rebate87A).toBe(25_000);
      expect(r.totalTaxLiability).toBe(0);
    });

    it('NR-4: gross ₹7.6L → taxable ₹7.1L → marginal relief → tax ₹10,000 + cess → ₹10,400', () => {
      // Slab tax = 15,000 + 10%*1.1L = 26,000. Income exceeds ₹7L by 10,000.
      // 87A marginal relief: rebate = 26,000 − 10,000 = 16,000 → tax after rebate 10,000.
      // Cess 4% of 10,000 = 400. Total = 10,400.
      const r = calc.calculateNewRegime(salaryOnly(760_000), zeroDeductions());
      expect(r.taxableIncome).toBe(710_000);
      expect(r.taxBeforeSurcharge).toBe(26_000);
      expect(r.rebate87A).toBe(16_000);
      expect(r.cess).toBe(400);
      expect(r.totalTaxLiability).toBe(10_400);
    });

    it('NR-5: gross ₹9.5L → taxable ₹9.0L → tax ₹45,000 + cess → ₹46,800', () => {
      // 5%*3L + 10%*3L = 15,000 + 30,000 = 45,000. No 87A (>7L; 45k < (9L−7L)). Cess 1,800.
      const r = calc.calculateNewRegime(salaryOnly(950_000), zeroDeductions());
      expect(r.taxableIncome).toBe(900_000);
      expect(r.taxBeforeSurcharge).toBe(45_000);
      expect(r.rebate87A).toBe(0);
      expect(r.cess).toBe(1_800);
      expect(r.totalTaxLiability).toBe(46_800);
    });

    it('NR-6: gross ₹12.5L → taxable ₹12.0L → tax ₹90,000 + cess → ₹93,600', () => {
      // 15,000 + 30,000 + 15%*3L (45,000) = 90,000. Cess 3,600.
      const r = calc.calculateNewRegime(salaryOnly(1_250_000), zeroDeductions());
      expect(r.taxableIncome).toBe(1_200_000);
      expect(r.taxBeforeSurcharge).toBe(90_000);
      expect(r.cess).toBe(3_600);
      expect(r.totalTaxLiability).toBe(93_600);
    });

    it('NR-7: gross ₹15.5L → taxable ₹15.0L → tax ₹1,50,000 + cess → ₹1,56,000', () => {
      // 15,000 + 30,000 + 45,000 + 20%*3L (60,000) = 150,000. Cess 6,000.
      const r = calc.calculateNewRegime(salaryOnly(1_550_000), zeroDeductions());
      expect(r.taxableIncome).toBe(1_500_000);
      expect(r.taxBeforeSurcharge).toBe(150_000);
      expect(r.cess).toBe(6_000);
      expect(r.totalTaxLiability).toBe(156_000);
    });

    it('NR-8: gross ₹24.5L → taxable ₹24.0L → tax ₹4,20,000 + cess → ₹4,36,800 (no surcharge)', () => {
      // 150,000 (first 15L) + 30%*(24L−15L = 9L) = 150,000 + 270,000 = 420,000. Cess 16,800.
      const r = calc.calculateNewRegime(salaryOnly(2_450_000), zeroDeductions());
      expect(r.taxableIncome).toBe(2_400_000);
      expect(r.taxBeforeSurcharge).toBe(420_000);
      expect(r.surcharge).toBe(0);
      expect(r.cess).toBe(16_800);
      expect(r.totalTaxLiability).toBe(436_800);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SURCHARGE bands with marginal relief (new regime slab table)
  // ───────────────────────────────────────────────────────────────────────────

  describe('Surcharge bands with statutory marginal relief', () => {
    it('SUR-1: taxable ₹60L → 10% surcharge, relief not binding → total ₹17,16,000', () => {
      // Slab tax = 150,000 + 30%*(60L−15L=45L) = 1,500,000. 10% surcharge = 150,000.
      // Relief ref ₹50L: tax@50L = 150,000 + 30%*35L = 1,200,000; cap = 1,200,000 + 10L = 2,200,000.
      // raw total 1,650,000 ≤ cap → surcharge stays 150,000. Cess 4% of 1,650,000 = 66,000.
      const r = calc.calculateNewRegime(salaryOnly(6_050_000), zeroDeductions());
      expect(r.taxableIncome).toBe(6_000_000);
      expect(r.taxBeforeSurcharge).toBe(1_500_000);
      expect(r.surchargeRate).toBe(10);
      expect(r.surcharge).toBe(150_000);
      expect(r.cess).toBe(66_000);
      expect(r.totalTaxLiability).toBe(1_716_000);
    });

    it('SUR-2: taxable ₹50.1L → just above ₹50L → marginal relief caps surcharge at ₹7,000', () => {
      // Slab tax = 150,000 + 30%*(50.1L−15L=35.1L) = 1,203,000. raw 10% surcharge = 120,300.
      // Relief: total (tax+sc) ≤ tax@50L (1,200,000) + excess (10,000) = 1,210,000.
      // surcharge = 1,210,000 − 1,203,000 = 7,000. Cess 4% of 1,210,000 = 48,400.
      const r = calc.calculateNewRegime(salaryOnly(5_060_000), zeroDeductions());
      expect(r.taxableIncome).toBe(5_010_000);
      expect(r.taxBeforeSurcharge).toBe(1_203_000);
      expect(r.surchargeRate).toBe(10);
      expect(r.surcharge).toBe(7_000);
      expect(r.taxAfterSurcharge).toBe(1_210_000);
      expect(r.cess).toBe(48_400);
      expect(r.totalTaxLiability).toBe(1_258_400);

      // Marginal-relief invariant: tax+surcharge must not exceed tax@threshold + excess income.
      const taxAtThreshold = 1_200_000; // slab tax on exactly ₹50L, no surcharge at/below ₹50L
      const excess = r.taxableIncome - 5_000_000;
      expect(r.taxAfterSurcharge).toBeLessThanOrEqual(taxAtThreshold + excess);
    });

    it('SUR-3: taxable ₹1Cr+10k → 15% band → marginal relief vs ₹1Cr → total ₹30,99,200', () => {
      // Slab tax = 150,000 + 30%*(1.001Cr−15L) = 2,703,000. raw 15% surcharge = 405,450.
      // Reference is ₹1Cr where 10% surcharge applies:
      //   tax@1Cr = 2,700,000; surcharge@1Cr = 270,000 → liability@1Cr = 2,970,000.
      //   cap = 2,970,000 + (income−1Cr=10,000) = 2,980,000.
      // raw total 3,108,450 > cap → surcharge = 2,980,000 − 2,703,000 = 277,000.
      // Cess 4% of 2,980,000 = 119,200. Total = 3,099,200.
      const r = calc.calculateNewRegime(salaryOnly(10_060_000), zeroDeductions());
      expect(r.taxableIncome).toBe(10_010_000);
      expect(r.taxBeforeSurcharge).toBe(2_703_000);
      expect(r.surchargeRate).toBe(15);
      expect(r.surcharge).toBe(277_000);
      expect(r.taxAfterSurcharge).toBe(2_980_000);
      expect(r.cess).toBe(119_200);
      expect(r.totalTaxLiability).toBe(3_099_200);

      // Marginal-relief invariant at the ₹1Cr boundary.
      const liabilityAtThreshold = 2_970_000; // tax@1Cr + 10% surcharge@1Cr
      const excess = r.taxableIncome - 10_000_000;
      expect(r.taxAfterSurcharge).toBeLessThanOrEqual(liabilityAtThreshold + excess);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // OLD REGIME — deductions, 87A, senior/super-senior slabs
  // ───────────────────────────────────────────────────────────────────────────

  describe('Old regime — deductions, 87A and age slabs', () => {
    it('OR-1: gross ₹5.0L → taxable ₹4.5L → 87A wipes ₹10,000 tax → ₹0', () => {
      // Std ded 50,000 → taxable 4,50,000. Slab 5%*(4.5L−2.5L)=10,000.
      // 87A (≤5L): min(10,000, 12,500) = 10,000 → net 0.
      const r = calc.calculateOldRegime(salaryOnly(500_000), zeroDeductions());
      expect(r.taxableIncome).toBe(450_000);
      expect(r.taxBeforeSurcharge).toBe(10_000);
      expect(r.rebate87A).toBe(10_000);
      expect(r.totalTaxLiability).toBe(0);
    });

    it('OR-2: ₹11L gross with 80C ₹1.5L + 80D ₹25k + HRA ₹1L → tax ₹69,701', () => {
      // Gross = grossSalary 10L + HRA received 1L = 11,00,000.
      // HRA exempt (Rule 2A) = min(1,00,000, 1,80,000 − 10%*5,00,000=1,30,000, 50%*5,00,000=2,50,000) = 1,00,000.
      // Deductions = 80C 1,50,000 + 80D 25,000 + HRA 1,00,000 + std 50,000 + prof tax 2,400 = 3,27,400.
      // Taxable = 11,00,000 − 3,27,400 = 7,72,600.
      // Slab (<60): 5%*(5L−2.5L)=12,500 ; 20%*(7,72,600−5L=2,72,600)=54,520 → 67,020.
      // No 87A (>5L). Cess = round(67,020*0.04)=2,681. Total = 69,701.
      const income: IncomeData = {
        salary: {
          grossSalary: 1_000_000,
          basicSalary: 500_000,
          hraReceived: 100_000,
          specialAllowance: 0,
          otherAllowances: 0,
          professionalTax: 2_400,
        },
      };
      const ded: DeductionData = {
        ...zeroDeductions(),
        section80C: { lic: 150_000, ppf: 0, elss: 0, nsc: 0, homeLoanPrincipal: 0, tuitionFees: 0, sukanyaSamriddhi: 0, other: 0 },
        section80D: { selfPremium: 25_000, parentsPremium: 0, preventiveHealthCheckup: 0, isSelfSenior: false, isParentsSenior: false },
        hra: { rentPaid: 180_000, isMetro: true },
      };
      const r = calc.calculateOldRegime(income, ded);
      expect(r.grossTotalIncome).toBe(1_100_000);
      expect(r.deductionBreakdown.section80C).toBe(150_000);
      expect(r.deductionBreakdown.section80D).toBe(25_000);
      expect(r.deductionBreakdown.hra).toBe(100_000);
      expect(r.deductionBreakdown.professionalTax).toBe(2_400);
      expect(r.totalDeductions).toBe(327_400);
      expect(r.taxableIncome).toBe(772_600);
      expect(r.taxBeforeSurcharge).toBe(67_020);
      expect(r.rebate87A).toBe(0);
      expect(r.cess).toBe(2_681);
      expect(r.totalTaxLiability).toBe(69_701);
    });

    it('OR-3: senior (60–79) ₹7L gross → taxable ₹6.5L → tax ₹40,000 + cess → ₹41,600', () => {
      // Senior nil slab ₹3L: 5%*(5L−3L)=10,000 ; 20%*(6.5L−5L)=30,000 → 40,000. Cess 1,600.
      const r = calc.calculateOldRegime(salaryOnly(700_000), zeroDeductions(), personalInfo({ isSeniorCitizen: true, age: 67 }));
      expect(r.taxableIncome).toBe(650_000);
      expect(r.taxBeforeSurcharge).toBe(40_000);
      expect(r.cess).toBe(1_600);
      expect(r.totalTaxLiability).toBe(41_600);
    });

    it('OR-4: super-senior (80+) ₹7L gross → taxable ₹6.5L → tax ₹30,000 + cess → ₹31,200', () => {
      // Super-senior nil slab ₹5L: 20%*(6.5L−5L)=30,000. Cess 1,200.
      const r = calc.calculateOldRegime(salaryOnly(700_000), zeroDeductions(), personalInfo({ isSuperSeniorCitizen: true, age: 83 }));
      expect(r.taxableIncome).toBe(650_000);
      expect(r.taxBeforeSurcharge).toBe(30_000);
      expect(r.cess).toBe(1_200);
      expect(r.totalTaxLiability).toBe(31_200);
    });

    it('OR-5: standard (<60) ₹7L gross → taxable ₹6.5L → tax ₹42,500 + cess → ₹44,200', () => {
      // Standard nil slab ₹2.5L: 5%*(5L−2.5L)=12,500 ; 20%*(6.5L−5L)=30,000 → 42,500. Cess 1,700.
      // Confirms the age-slab differences vs OR-3/OR-4 on identical income.
      const r = calc.calculateOldRegime(salaryOnly(700_000), zeroDeductions(), personalInfo({ age: 40 }));
      expect(r.taxableIncome).toBe(650_000);
      expect(r.taxBeforeSurcharge).toBe(42_500);
      expect(r.cess).toBe(1_700);
      expect(r.totalTaxLiability).toBe(44_200);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 44AD — presumptive business income & thresholds
  // ───────────────────────────────────────────────────────────────────────────

  describe('Section 44AD presumptive business income', () => {
    function businessOnly(digital: number, cash: number, grossReceipts?: number, expenses = 0): IncomeData {
      return {
        salary: { grossSalary: 0, basicSalary: 0, hraReceived: 0, specialAllowance: 0, otherAllowances: 0, professionalTax: 0 },
        businessIncome: {
          grossReceipts: grossReceipts ?? digital + cash,
          digitalReceipts: digital,
          cashReceipts: cash,
          expenses,
        },
      };
    }

    it('44AD-1: ₹50L digital receipts → 6% presumptive → business income ₹3,00,000', () => {
      // Digital receipts taxed at 6% (banking/digital rate): 6% of 50L = 3,00,000.
      const r = calc.calculateNewRegime(businessOnly(5_000_000, 0), zeroDeductions());
      expect(r.incomeBreakdown.businessIncome).toBe(300_000);
    });

    it('44AD-5: ₹10L cash receipts → 8% presumptive → business income ₹80,000', () => {
      // Cash receipts taxed at 8% (cash rate): 8% of 10L = 80,000.
      const r = calc.calculateNewRegime(businessOnly(0, 1_000_000), zeroDeductions());
      expect(r.incomeBreakdown.businessIncome).toBe(80_000);
    });

    it('44AD-2: ₹2.5Cr turnover, cash > 5% → above ₹2Cr threshold → actual profit used', () => {
      // Cash = 100% of total > 5% → threshold ₹2Cr; total ₹2.5Cr exceeds → not eligible.
      // Falls back to actual profit = grossReceipts 2.5Cr − expenses 2Cr = 50,00,000.
      const r = calc.calculateNewRegime(businessOnly(0, 25_000_000, 25_000_000, 20_000_000), zeroDeductions());
      expect(r.incomeBreakdown.businessIncome).toBe(5_000_000);
    });

    it('44AD-3: ₹2.5Cr turnover, cash ≤ 5% → ₹3Cr threshold applies → presumptive ₹15,20,000', () => {
      // cash 10L / total 2.5Cr = 4% ≤ 5% → threshold ₹3Cr; 2.5Cr ≤ 3Cr → eligible.
      // Presumptive = 6%*2.4Cr + 8%*10L = 14,40,000 + 80,000 = 15,20,000.
      const r = calc.calculateNewRegime(businessOnly(24_000_000, 1_000_000), zeroDeductions());
      expect(r.incomeBreakdown.businessIncome).toBe(1_520_000);
    });

    it('44AD-4: ₹2Cr digital receipts → presumptive ₹12L → new-regime tax ₹85,800', () => {
      // cash 0 ≤ 5% → ₹3Cr threshold; 2Cr ≤ 3Cr eligible. Presumptive = 6%*2Cr = 12,00,000.
      // New regime gross 12L − std 50k = taxable 11,50,000.
      // Slab: 15,000 + 30,000 + 15%*(11.5L−9L=2.5L=37,500) = 82,500. Cess 3,300. Total 85,800.
      const r = calc.calculateNewRegime(businessOnly(20_000_000, 0), zeroDeductions());
      expect(r.incomeBreakdown.businessIncome).toBe(1_200_000);
      expect(r.taxableIncome).toBe(1_150_000);
      expect(r.taxBeforeSurcharge).toBe(82_500);
      expect(r.cess).toBe(3_300);
      expect(r.totalTaxLiability).toBe(85_800);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // REGIME COMPARISON — recommends the lower-tax regime
  // ───────────────────────────────────────────────────────────────────────────

  describe('Regime comparison', () => {
    it('RC-1: ₹8L salary, no deductions → new regime wins (₹31,200 vs ₹65,000)', () => {
      // New: taxable 7.5L → 15,000 + 10%*1.5L=15,000 = 30,000 (no 87A) + cess 1,200 = 31,200.
      // Old: taxable 7.5L → 12,500 + 20%*2.5L=50,000 = 62,500 + cess 2,500 = 65,000.
      const cmp = calc.compareRegimes(salaryOnly(800_000), zeroDeductions());
      expect(cmp.newRegime.totalTaxLiability).toBe(31_200);
      expect(cmp.oldRegime.totalTaxLiability).toBe(65_000);
      expect(cmp.recommendedRegime).toBe('new');
      expect(cmp.savings).toBe(33_800);
    });

    it('RC-2: ₹11L salary with heavy deductions → old regime wins (₹69,701 vs ₹69,826)', () => {
      // Old regime = OR-2 case = 69,701.
      // New regime: gross 11L − (std 50k + prof tax 2,400) = taxable 10,47,600.
      //   15,000 + 30,000 + 15%*(10,47,600−9L=1,47,600=22,140) = 67,140 + cess 2,686 = 69,826.
      const income: IncomeData = {
        salary: {
          grossSalary: 1_000_000,
          basicSalary: 500_000,
          hraReceived: 100_000,
          specialAllowance: 0,
          otherAllowances: 0,
          professionalTax: 2_400,
        },
      };
      const ded: DeductionData = {
        ...zeroDeductions(),
        section80C: { lic: 150_000, ppf: 0, elss: 0, nsc: 0, homeLoanPrincipal: 0, tuitionFees: 0, sukanyaSamriddhi: 0, other: 0 },
        section80D: { selfPremium: 25_000, parentsPremium: 0, preventiveHealthCheckup: 0, isSelfSenior: false, isParentsSenior: false },
        hra: { rentPaid: 180_000, isMetro: true },
      };
      const cmp = calc.compareRegimes(income, ded);
      expect(cmp.oldRegime.totalTaxLiability).toBe(69_701);
      expect(cmp.newRegime.totalTaxLiability).toBe(69_826);
      expect(cmp.recommendedRegime).toBe('old');
      expect(cmp.savings).toBe(125);
    });
  });
});
