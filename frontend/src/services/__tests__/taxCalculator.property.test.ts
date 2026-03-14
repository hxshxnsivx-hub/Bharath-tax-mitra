import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { TaxCalculator } from '../taxCalculator';
import type { TaxRules } from '../../../../shared/types/tax-rules';
import type { IncomeData, DeductionData } from '../../../../shared/types/tax-calculation';
import taxRulesData from '../../../../shared/tax-rules-fy2025-26.json';

/**
 * Property-Based Tests for Tax Calculation Correctness
 * 
 * These tests validate universal properties that must hold true
 * for ALL possible inputs, ensuring calculation accuracy and compliance.
 */

describe('TaxCalculator - Property-Based Tests', () => {
  let calculator: TaxCalculator;

  beforeAll(() => {
    // Load tax rules from JSON
    const taxRules = taxRulesData as TaxRules;
    calculator = new TaxCalculator(taxRules);
  });

  /**
   * Arbitrary generators for test data
   */
  const incomeArbitrary = fc.record({
    salary: fc.record({
      grossSalary: fc.nat({ max: 100000000 }), // Max 10 crores
      hraReceived: fc.nat({ max: 5000000 }),
      specialAllowance: fc.nat({ max: 5000000 }),
      otherAllowances: fc.nat({ max: 2000000 }),
      professionalTax: fc.nat({ max: 50000 }),
    }),
    houseProperty: fc.option(
      fc.record({
        annualValue: fc.nat({ max: 10000000 }),
        municipalTaxes: fc.nat({ max: 500000 }),
        interestOnHomeLoan: fc.nat({ max: 2000000 }),
      }),
      { nil: undefined }
    ),
    businessIncome: fc.option(
      fc.record({
        grossReceipts: fc.nat({ max: 50000000 }),
        digitalReceipts: fc.nat({ max: 50000000 }),
        cashReceipts: fc.nat({ max: 50000000 }),
        expenses: fc.nat({ max: 40000000 }),
      }),
      { nil: undefined }
    ),
    capitalGains: fc.option(
      fc.record({
        shortTerm: fc.nat({ max: 10000000 }),
        longTerm: fc.nat({ max: 10000000 }),
      }),
      { nil: undefined }
    ),
    otherSources: fc.option(
      fc.record({
        interestIncome: fc.nat({ max: 1000000 }),
        dividendIncome: fc.nat({ max: 1000000 }),
        other: fc.nat({ max: 1000000 }),
      }),
      { nil: undefined }
    ),
  });

  const deductionArbitrary = fc.record({
    section80C: fc.record({
      lic: fc.nat({ max: 150000 }),
      ppf: fc.nat({ max: 150000 }),
      elss: fc.nat({ max: 150000 }),
      nsc: fc.nat({ max: 150000 }),
      homeLoanPrincipal: fc.nat({ max: 150000 }),
      tuitionFees: fc.nat({ max: 150000 }),
      sukanyaSamriddhi: fc.nat({ max: 150000 }),
      other: fc.nat({ max: 150000 }),
    }),
    section80CCD1B: fc.record({
      npsAdditional: fc.nat({ max: 50000 }),
    }),
    section80D: fc.record({
      selfPremium: fc.nat({ max: 50000 }),
      parentsPremium: fc.nat({ max: 50000 }),
      preventiveHealthCheckup: fc.nat({ max: 5000 }),
      isSelfSenior: fc.boolean(),
      isParentsSenior: fc.boolean(),
    }),
    section80E: fc.record({
      educationLoanInterest: fc.nat({ max: 500000 }),
    }),
    section80G: fc.record({
      donations: fc.nat({ max: 200000 }),
    }),
    hra: fc.record({
      rentPaid: fc.nat({ max: 3000000 }),
      isMetro: fc.boolean(),
      basicSalary: fc.nat({ max: 10000000 }),
    }),
  });

  /**
   * PROPERTY 1: Tax liability is always non-negative
   */
  it('Property 1: Tax liability is always non-negative', () => {
    fc.assert(
      fc.property(incomeArbitrary, deductionArbitrary, (income, deductions) => {
        const oldRegimeResult = calculator.calculateOldRegime(income, deductions);
        const newRegimeResult = calculator.calculateNewRegime(income, deductions);

        expect(oldRegimeResult.totalTaxLiability).toBeGreaterThanOrEqual(0);
        expect(newRegimeResult.totalTaxLiability).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * PROPERTY 2: Deductions never exceed gross income
   * Note: This property only applies when gross income is positive
   */
  it('Property 2: Deductions never exceed gross income', () => {
    fc.assert(
      fc.property(incomeArbitrary, deductionArbitrary, (income, deductions) => {
        const oldRegimeResult = calculator.calculateOldRegime(income, deductions);

        // Only check if gross income is positive
        if (oldRegimeResult.grossTotalIncome > 0) {
          expect(oldRegimeResult.totalDeductions).toBeLessThanOrEqual(
            oldRegimeResult.grossTotalIncome
          );
        }
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * PROPERTY 3: Higher income leads to higher or equal tax (monotonicity)
   */
  it('Property 3: Higher income leads to higher or equal tax (monotonicity)', () => {
    fc.assert(
      fc.property(
        incomeArbitrary,
        deductionArbitrary,
        fc.nat({ max: 5000000 }), // Additional income
        (income, deductions, additionalIncome) => {
          // Calculate tax with original income
          const result1 = calculator.calculateNewRegime(income, deductions);

          // Calculate tax with higher income
          const higherIncome: IncomeData = {
            ...income,
            salary: {
              ...income.salary,
              grossSalary: income.salary.grossSalary + additionalIncome,
            },
          };
          const result2 = calculator.calculateNewRegime(higherIncome, deductions);

          // Higher income should result in higher or equal tax
          expect(result2.totalTaxLiability).toBeGreaterThanOrEqual(result1.totalTaxLiability);
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * PROPERTY 4: Slab rate application is correct at boundaries
   */
  it('Property 4: Slab rate application is correct at boundaries', () => {
    // Test at exact slab boundaries for New Regime
    const slabBoundaries = [0, 300000, 600000, 900000, 1200000, 1500000];

    slabBoundaries.forEach((boundary) => {
      const income: IncomeData = {
        salary: {
          grossSalary: boundary,
          hraReceived: 0,
          specialAllowance: 0,
          otherAllowances: 0,
          professionalTax: 0,
        },
      };

      const deductions: DeductionData = {
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
        hra: { rentPaid: 0, isMetro: false, basicSalary: 0 },
      };

      const result = calculator.calculateNewRegime(income, deductions);

      // Tax liability should be non-negative
      expect(result.totalTaxLiability).toBeGreaterThanOrEqual(0);

      // Taxable income should match gross income minus standard deduction
      const expectedTaxableIncome = Math.max(0, boundary - 50000);
      expect(result.taxableIncome).toBe(expectedTaxableIncome);
    });
  });

  /**
   * Additional Property: Taxable income is always non-negative
   */
  it('Property: Taxable income is always non-negative', () => {
    fc.assert(
      fc.property(incomeArbitrary, deductionArbitrary, (income, deductions) => {
        const oldRegimeResult = calculator.calculateOldRegime(income, deductions);
        const newRegimeResult = calculator.calculateNewRegime(income, deductions);

        expect(oldRegimeResult.taxableIncome).toBeGreaterThanOrEqual(0);
        expect(newRegimeResult.taxableIncome).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Additional Property: Effective tax rate is between 0% and 100%
   */
  it('Property: Effective tax rate is between 0% and 100%', () => {
    fc.assert(
      fc.property(incomeArbitrary, deductionArbitrary, (income, deductions) => {
        const oldRegimeResult = calculator.calculateOldRegime(income, deductions);
        const newRegimeResult = calculator.calculateNewRegime(income, deductions);

        expect(oldRegimeResult.effectiveTaxRate).toBeGreaterThanOrEqual(0);
        expect(oldRegimeResult.effectiveTaxRate).toBeLessThanOrEqual(100);
        expect(newRegimeResult.effectiveTaxRate).toBeGreaterThanOrEqual(0);
        expect(newRegimeResult.effectiveTaxRate).toBeLessThanOrEqual(100);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Additional Property: Section 80C deduction is capped at ₹1.5L
   */
  it('Property: Section 80C deduction is capped at ₹1.5L', () => {
    fc.assert(
      fc.property(incomeArbitrary, deductionArbitrary, (income, deductions) => {
        const result = calculator.calculateOldRegime(income, deductions);

        expect(result.deductionBreakdown.section80C).toBeLessThanOrEqual(150000);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Additional Property: New Regime rebate 87A is capped at ₹25k
   */
  it('Property: New Regime rebate 87A is capped at ₹25k', () => {
    fc.assert(
      fc.property(incomeArbitrary, deductionArbitrary, (income, deductions) => {
        const result = calculator.calculateNewRegime(income, deductions);

        if (result.rebate87A) {
          expect(result.rebate87A).toBeLessThanOrEqual(25000);
        }
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Additional Property: Regime comparison always recommends the lower tax option
   */
  it('Property: Regime comparison recommends lower tax option', () => {
    fc.assert(
      fc.property(incomeArbitrary, deductionArbitrary, (income, deductions) => {
        const comparison = calculator.compareRegimes(income, deductions);

        if (comparison.recommendedRegime === 'old') {
          expect(comparison.oldRegime.totalTaxLiability).toBeLessThanOrEqual(
            comparison.newRegime.totalTaxLiability
          );
        } else {
          expect(comparison.newRegime.totalTaxLiability).toBeLessThan(
            comparison.oldRegime.totalTaxLiability
          );
        }
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Additional Property: Section 44AD applies only when turnover < ₹2 crore
   */
  it('Property: Section 44AD applies only when turnover < ₹2 crore', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 50000000 }), // Digital receipts
        fc.nat({ max: 50000000 }), // Cash receipts
        (digitalReceipts, cashReceipts) => {
          const income: IncomeData = {
            salary: {
              grossSalary: 0,
              hraReceived: 0,
              specialAllowance: 0,
              otherAllowances: 0,
              professionalTax: 0,
            },
            businessIncome: {
              grossReceipts: digitalReceipts + cashReceipts,
              digitalReceipts,
              cashReceipts,
              expenses: 0,
            },
          };

          const deductions: DeductionData = {
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
            hra: { rentPaid: 0, isMetro: false, basicSalary: 0 },
          };

          const result = calculator.calculateNewRegime(income, deductions);
          const totalReceipts = digitalReceipts + cashReceipts;

          if (totalReceipts <= 20000000) {
            // Section 44AD should apply: 6% digital + 8% cash
            const expectedIncome = (digitalReceipts * 0.06) + (cashReceipts * 0.08);
            expect(result.incomeBreakdown.businessIncome).toBe(Math.round(expectedIncome));
          } else {
            // Section 44AD should NOT apply: use actual income
            expect(result.incomeBreakdown.businessIncome).toBe(totalReceipts);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * Additional Property: Take-home income equals gross income minus tax
   */
  it('Property: Take-home income equals gross income minus tax', () => {
    fc.assert(
      fc.property(incomeArbitrary, deductionArbitrary, (income, deductions) => {
        const result = calculator.calculateNewRegime(income, deductions);

        const expectedTakeHome = result.grossTotalIncome - result.totalTaxLiability;
        expect(result.takeHomeIncome).toBe(expectedTakeHome);
      }),
      { numRuns: 1000 }
    );
  });
});
