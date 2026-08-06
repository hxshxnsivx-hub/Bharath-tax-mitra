/**
 * Unit Tests: TaxCalculator — offline client-side calculation
 *
 * Validates Requirements 5.9, 10.2, 10.4:
 *  - Tax calculation works completely offline (no server required)
 *  - Tax rules are bundled with the app (JSON imports)
 *  - Calculator runs in-browser without any API calls
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { TaxCalculator } from '../taxCalculator';
import type { TaxRules } from '../../../../shared/types/tax-rules';
import type { IncomeData, DeductionData, PersonalInfo } from '../../../../shared/types/tax-calculation';

// ── Import bundled tax rules directly (offline, no network required) ──────────
import taxRulesData2025 from '../../../../shared/tax-rules-fy2025-26.json';
import taxRulesData2026 from '../../../../shared/tax-rules-fy2026-27.json';

// Helper: build a zeroed-out DeductionData record
function zeroDeductions(): DeductionData {
  return {
    section80C: {
      lic: 0,
      ppf: 0,
      elss: 0,
      nsc: 0,
      homeLoanPrincipal: 0,
      tuitionFees: 0,
      sukanyaSamriddhi: 0,
      other: 0,
    },
    section80CCD1B: { npsAdditional: 0 },
    section80D: {
      selfPremium: 0,
      parentsPremium: 0,
      preventiveHealthCheckup: 0,
      isSelfSenior: false,
      isParentsSenior: false,
    },
    section80E: { educationLoanInterest: 0 },
    section80G: { donations: 0 },
    hra: { rentPaid: 0, isMetro: false },
    section16: { professionalTax: 0 },
  };
}

// Helper: build a salary-only IncomeData record
function salaryIncome(grossSalary: number, professionalTax = 0): IncomeData {
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

// Helper: build a complete PersonalInfo record with sensible defaults
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

// ── Test suites ───────────────────────────────────────────────────────────────

describe('TaxCalculator — offline with bundled FY 2025-26 rules', () => {
  let calculator: TaxCalculator;

  beforeAll(() => {
    // Instantiate using ONLY bundled JSON — no IndexedDB, no network
    const taxRules = taxRulesData2025 as unknown as TaxRules;
    calculator = new TaxCalculator(taxRules);
  });

  // ── Offline capability: bundled JSON is sufficient ────────────────────────

  it('creates calculator from bundled JSON without any network call', () => {
    // If this runs, bundled JSON import worked offline
    expect(calculator).toBeDefined();
  });

  // ── New Regime: zero-income case ──────────────────────────────────────────

  it('New Regime: zero income produces zero tax', () => {
    const result = calculator.calculateNewRegime(salaryIncome(0), zeroDeductions());
    expect(result.totalTaxLiability).toBe(0);
    expect(result.taxableIncome).toBe(0);
  });

  // ── New Regime: income below standard deduction ───────────────────────────

  it('New Regime: income ≤ standard deduction (₹50k) → zero tax', () => {
    const result = calculator.calculateNewRegime(salaryIncome(50000), zeroDeductions());
    expect(result.taxableIncome).toBe(0);
    expect(result.totalTaxLiability).toBe(0);
  });

  // ── New Regime: 87A rebate wipes out tax for income ≤ ₹7L ────────────────

  it('New Regime: taxable income ≤ ₹7L → full 87A rebate (zero net tax)', () => {
    // grossSalary = ₹7,50,000 → taxableIncome = 7,50,000 − 50,000 = 7,00,000 ≤ ₹7L
    const result = calculator.calculateNewRegime(salaryIncome(750000), zeroDeductions());
    expect(result.taxableIncome).toBe(700000);
    expect(result.rebate87A).toBeGreaterThan(0);
    expect(result.totalTaxLiability).toBe(0);
  });

  // ── New Regime: income above ₹7L starts paying tax ───────────────────────

  it('New Regime: taxable income > ₹7L → positive net tax', () => {
    // grossSalary = ₹8,50,000 → taxableIncome = 8,00,000 (> ₹7L)
    const result = calculator.calculateNewRegime(salaryIncome(850000), zeroDeductions());
    expect(result.taxableIncome).toBe(800000);
    expect(result.totalTaxLiability).toBeGreaterThan(0);
  });

  // ── New Regime: slab computation at known value ───────────────────────────

  it('New Regime: ₹10L gross → correct slab-wise computation', () => {
    // taxableIncome = 10,00,000 − 50,000 = 9,50,000
    // Slabs: 3L@0% + 3L@5% (=15k) + 3L@10% (=30k) + 50k@15% (=7.5k) = 52,500
    // cess 4% = 2,100 → total = 54,600
    const result = calculator.calculateNewRegime(salaryIncome(1000000), zeroDeductions());
    expect(result.taxableIncome).toBe(950000);
    expect(result.taxBeforeSurcharge).toBe(52500);
    expect(result.cess).toBe(2100);
    expect(result.totalTaxLiability).toBe(54600);
  });

  // ── Old Regime: standard deduction applied ────────────────────────────────

  it('Old Regime: standard deduction of ₹50k is applied', () => {
    const result = calculator.calculateOldRegime(salaryIncome(600000), zeroDeductions());
    expect(result.deductionBreakdown.standardDeduction).toBe(50000);
    expect(result.taxableIncome).toBe(550000);
  });

  // ── Old Regime: 87A rebate capped at ₹12,500 for income ≤ ₹5L ───────────

  it('Old Regime: taxable income ≤ ₹5L → 87A rebate applies (capped ₹12,500)', () => {
    // grossSalary = ₹5,50,000 → taxableIncome = 5,50,000 − 50,000 = 5,00,000
    const result = calculator.calculateOldRegime(salaryIncome(550000), zeroDeductions());
    expect(result.taxableIncome).toBe(500000);
    // 87A rebate should wipe the small tax on last ₹2.5L at 5% = ₹12,500
    expect(result.rebate87A).toBe(12500);
    expect(result.totalTaxLiability).toBe(0);
  });

  // ── Old Regime: Section 80C cap ───────────────────────────────────────────

  it('Old Regime: 80C deductions capped at ₹1.5L regardless of input', () => {
    const deductions = zeroDeductions();
    deductions.section80C.ppf = 200000; // exceeds cap
    const result = calculator.calculateOldRegime(salaryIncome(1000000), deductions);
    expect(result.deductionBreakdown.section80C).toBe(150000);
  });

  // ── Old Regime: professional tax is deducted (Section 16) ────────────────

  it('Old Regime: professional tax is deducted as Section 16 deduction', () => {
    const income = salaryIncome(600000, 2400); // ₹2,400 professional tax
    const result = calculator.calculateOldRegime(income, zeroDeductions());
    expect(result.deductionBreakdown.professionalTax).toBe(2400);
    // taxableIncome = 600k − 50k (std) − 2.4k (prof tax) = 547,600
    expect(result.taxableIncome).toBe(547600);
  });

  // ── Regime comparison: always picks lower-tax regime ─────────────────────

  it('compareRegimes picks the lower-tax regime', () => {
    // Heavy deductions → Old Regime should win
    const income = salaryIncome(1200000);
    const deductions = zeroDeductions();
    deductions.section80C.ppf = 150000;
    deductions.section80CCD1B.npsAdditional = 50000;
    deductions.section80D.selfPremium = 25000;

    const comparison = calculator.compareRegimes(income, deductions);

    if (comparison.recommendedRegime === 'old') {
      expect(comparison.oldRegime.totalTaxLiability).toBeLessThanOrEqual(
        comparison.newRegime.totalTaxLiability,
      );
    } else {
      expect(comparison.newRegime.totalTaxLiability).toBeLessThan(
        comparison.oldRegime.totalTaxLiability,
      );
    }
  });

  // ── NRI check: throws for non-resident ───────────────────────────────────

  it('throws for non-resident taxpayer (NRI not supported)', () => {
    const personalInfo_ = personalInfo({ residentialStatus: 'non-resident' });
    expect(() =>
      calculator.calculateNewRegime(salaryIncome(1000000), zeroDeductions(), personalInfo_),
    ).toThrow('NRI/RNOR tax calculation is not supported');
  });

  // ── Senior citizen slabs ──────────────────────────────────────────────────

  it('Old Regime: senior citizen (60+) gets nil slab up to ₹3L', () => {
    const personalInfo_ = personalInfo({ isSeniorCitizen: true, age: 65 });
    // grossSalary = ₹3,50,000 → taxableIncome (after std deduction) = 3,00,000
    // Senior nil band is ₹3L → tax before surcharge = 0
    const result = calculator.calculateOldRegime(salaryIncome(350000), zeroDeductions(), personalInfo_);
    expect(result.taxableIncome).toBe(300000);
    expect(result.taxBeforeSurcharge).toBe(0);
  });

  it('Old Regime: super senior citizen (80+) gets nil slab up to ₹5L', () => {
    const personalInfo_ = personalInfo({ isSuperSeniorCitizen: true, age: 82 });
    // grossSalary = ₹5,50,000 → taxableIncome = 5,00,000 ≤ nil band for super-senior
    const result = calculator.calculateOldRegime(salaryIncome(550000), zeroDeductions(), personalInfo_);
    expect(result.taxBeforeSurcharge).toBe(0);
  });

  // ── Cess: always 4% ───────────────────────────────────────────────────────

  it('cess rate is always 4% in both regimes', () => {
    const result = calculator.calculateNewRegime(salaryIncome(2000000), zeroDeductions());
    expect(result.cessRate).toBe(4);
    const oldResult = calculator.calculateOldRegime(salaryIncome(2000000), zeroDeductions());
    expect(oldResult.cessRate).toBe(4);
  });

  // ── Take-home income ──────────────────────────────────────────────────────

  it('take-home income = gross income − total tax', () => {
    const result = calculator.calculateNewRegime(salaryIncome(1500000), zeroDeductions());
    expect(result.takeHomeIncome).toBe(result.grossTotalIncome - result.totalTaxLiability);
  });
});

// ── Offline with FY 2026-27 bundled rules ────────────────────────────────────

describe('TaxCalculator — offline with bundled FY 2026-27 rules', () => {
  let calculator: TaxCalculator;

  beforeAll(() => {
    const taxRules = taxRulesData2026 as unknown as TaxRules;
    calculator = new TaxCalculator(taxRules);
  });

  it('creates calculator from FY 2026-27 bundled JSON without network', () => {
    expect(calculator).toBeDefined();
  });

  it('FY 2026-27: zero income produces zero tax', () => {
    const result = calculator.calculateNewRegime(salaryIncome(0), zeroDeductions());
    expect(result.totalTaxLiability).toBe(0);
  });

  it('FY 2026-27: New Regime tax liability is non-negative for any positive income', () => {
    [500000, 1000000, 1500000, 2500000, 5000000].forEach((gross) => {
      const result = calculator.calculateNewRegime(salaryIncome(gross), zeroDeductions());
      expect(result.totalTaxLiability).toBeGreaterThanOrEqual(0);
    });
  });
});

// ── TaxRulesService offline fallback (unit-level) ────────────────────────────

describe('TaxRulesService — offline fallback to bundled JSON', () => {
  it('defaultTaxRules export is available synchronously (no IndexedDB required)', async () => {
    // This import must succeed without any async/network operation
    const { defaultTaxRules } = await import('../taxRulesService');
    expect(defaultTaxRules).toBeDefined();
    expect(defaultTaxRules.financialYear).toBe('FY2025-26');
    expect(defaultTaxRules.newRegime).toBeDefined();
    expect(defaultTaxRules.oldRegime).toBeDefined();
  });

  it('TaxCalculator works with defaultTaxRules synchronously', async () => {
    const { defaultTaxRules } = await import('../taxRulesService');
    const calculator = new TaxCalculator(defaultTaxRules);
    const result = calculator.calculateNewRegime(salaryIncome(1000000), zeroDeductions());
    expect(result.totalTaxLiability).toBeGreaterThanOrEqual(0);
    expect(result.regime).toBe('new');
  });
});
