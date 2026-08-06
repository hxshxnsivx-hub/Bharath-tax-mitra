import type { TaxRules, TaxSlab } from '../../../shared/types/tax-rules';
import type {
  IncomeData,
  DeductionData,
  PersonalInfo,
  TaxCalculationResult,
  RegimeComparisonResult,
} from '../../../shared/types/tax-calculation';

/**
 * OPT-A3 — deterministic money arithmetic.
 *
 * All statutory percentages are computed in EXACT integer space with
 * round-half-up division, eliminating binary-float drift entirely. The Python
 * engine implements the identical helpers (`_pct_of` / `_round_half_up` in
 * calculate.py); shared/golden-vectors.json pins both. Notably, Python's
 * built-in round() is banker's rounding (round-half-even) — ₹12,500.50 would
 * round to ₹12,500 there and ₹12,501 here. These helpers define half-up as
 * the single cross-engine contract.
 */

/** Round to the nearest rupee, half-up (Math.round semantics, sign-aware to match floor(x+0.5)). */
export function roundRupee(x: number): number {
  return Math.floor(x + 0.5);
}

/**
 * Exact integer percentage: round-half-up((amount × ratePct) / 100).
 * `amount` is rounded to a whole rupee first; the product stays well inside
 * 2^53 for any realistic Indian income (≤ ₹10¹² × 100), so every operation
 * below is exact integer arithmetic — no float division anywhere.
 */
export function pctOf(amount: number, ratePct: number): number {
  const sign = amount < 0 ? -1 : 1;
  return sign * divHalfUp100(Math.abs(roundRupee(amount)) * ratePct);
}

/**
 * Sum of percentages rounded ONCE on the total (statutory semantics for
 * multi-rate provisions like 44AD: "6% of digital + 8% of cash" is a single
 * presumptive sum, not two independently-rounded amounts).
 */
export function sumPctOf(parts: ReadonlyArray<readonly [amount: number, ratePct: number]>): number {
  const n = parts.reduce((acc, [amount, rate]) => acc + roundRupee(amount) * rate, 0);
  return n < 0 ? -divHalfUp100(-n) : divHalfUp100(n);
}

/** Exact half-up integer division by 100 (n must be a non-negative integer). */
function divHalfUp100(n: number): number {
  const r = n % 100;
  const q = (n - r) / 100;
  return r >= 50 ? q + 1 : q;
}

export class TaxCalculator {
  constructor(private taxRules: TaxRules) {}

  // ─── PUBLIC API ──────────────────────────────────────────────────────────────

  /**
   * Calculate tax under New Regime (Section 115BAC).
   * FY 2025-26: 6-slab table, standard deduction ₹50,000, 87A rebate ₹25,000 up to ₹7L.
   * personalInfo is optional for new regime (age doesn't affect slabs).
   */
  calculateNewRegime(
    income: IncomeData,
    _deductions: DeductionData,
    personalInfo?: PersonalInfo
  ): TaxCalculationResult {
    // Guard: NRI/RNOR not supported
    if (personalInfo && personalInfo.residentialStatus !== 'resident') {
      throw new Error(
        'NRI/RNOR tax calculation is not supported. Only resident individuals are supported.'
      );
    }

    const grossTotalIncome = this.calculateGrossTotalIncome(income);
    const incomeBreakdown = this.getIncomeBreakdown(income);

    // New regime: only standard deduction + professional tax (Section 16)
    const standardDeduction = this.taxRules.newRegime.deductions.standardDeduction.limit;
    const professionalTax = income.salary.professionalTax;
    const totalDeductions = standardDeduction + professionalTax;

    const deductionBreakdown = {
      section80C: 0,
      section80CCD1B: 0,
      section80D: 0,
      section80E: 0,
      section80G: 0,
      hra: 0,
      standardDeduction: Math.round(standardDeduction),
      professionalTax: Math.round(professionalTax),
    };

    const taxableIncome = Math.max(0, grossTotalIncome - totalDeductions);

    const slabWiseTax = this.calculateSlabWiseTax(taxableIncome, this.taxRules.newRegime.slabs);
    const taxBeforeSurcharge = slabWiseTax.reduce((sum, slab) => sum + slab.tax, 0);

    // 87A rebate for new regime (FY 2025-26): ₹25,000 for income ≤ ₹7L, with marginal relief
    const rebate87A = this.calculateRebate87ANewRegime(taxableIncome, taxBeforeSurcharge);
    const taxAfterRebate = Math.max(0, taxBeforeSurcharge - rebate87A);

    // Surcharge on post-rebate tax, with marginal relief
    const { surcharge, surchargeRate } = this.calculateSurchargeWithMarginalRelief(
      taxableIncome,
      taxAfterRebate,
      this.taxRules.newRegime.surcharge.thresholds,
      this.taxRules.newRegime.slabs
    );
    const taxAfterSurcharge = taxAfterRebate + surcharge;

    // Cess: 4% of (tax after rebate + surcharge)
    const cessRate = this.taxRules.newRegime.cess;
    const cess = pctOf(taxAfterSurcharge, cessRate);

    const totalTaxLiability = taxAfterSurcharge + cess;
    const roundedGross = Math.round(grossTotalIncome);
    const roundedTax = Math.round(totalTaxLiability);
    const effectiveTaxRate = roundedGross > 0 ? (roundedTax / roundedGross) * 100 : 0;

    return {
      regime: 'new',
      grossTotalIncome: roundedGross,
      incomeBreakdown,
      totalDeductions: Math.round(totalDeductions),
      deductionBreakdown,
      taxableIncome: Math.round(taxableIncome),
      slabWiseTax,
      taxBeforeSurcharge: Math.round(taxBeforeSurcharge),
      surcharge: Math.round(surcharge),
      surchargeRate,
      taxAfterSurcharge: Math.round(taxAfterSurcharge),
      cess: Math.round(cess),
      cessRate,
      rebate87A: Math.round(rebate87A),
      totalTaxLiability: roundedTax,
      effectiveTaxRate: Number(effectiveTaxRate.toFixed(2)),
      takeHomeIncome: roundedGross - roundedTax,
    };
  }

  /**
   * Calculate tax under Old Regime.
   * Slabs depend on taxpayer age (Finance Bill 2025, Paragraph A(I/II/III)).
   * personalInfo.isSeniorCitizen / isSuperSeniorCitizen must be set correctly.
   */
  calculateOldRegime(
    income: IncomeData,
    deductions: DeductionData,
    personalInfo?: PersonalInfo
  ): TaxCalculationResult {
    // Guard: NRI/RNOR not supported
    if (personalInfo && personalInfo.residentialStatus !== 'resident') {
      throw new Error(
        'NRI/RNOR tax calculation is not supported. Only resident individuals are supported.'
      );
    }

    const grossTotalIncome = this.calculateGrossTotalIncome(income);
    const incomeBreakdown = this.getIncomeBreakdown(income);

    const deductionBreakdown = this.calculateOldRegimeDeductions(income, deductions);
    const totalDeductions = Object.values(deductionBreakdown).reduce((sum, val) => sum + val, 0);
    const taxableIncome = Math.max(0, grossTotalIncome - totalDeductions);

    // Select slab based on age category (HIGH-1 fix)
    const slabs = this.selectOldRegimeSlabs(personalInfo);
    const slabWiseTax = this.calculateSlabWiseTax(taxableIncome, slabs);
    const taxBeforeSurcharge = slabWiseTax.reduce((sum, slab) => sum + slab.tax, 0);

    // OLD REGIME 87A rebate: min(tax, ₹12,500) for income ≤ ₹5L (HIGH-3 fix)
    const rebate87A = this.calculateRebate87AOldRegime(taxableIncome, taxBeforeSurcharge);
    const taxAfterRebate = Math.max(0, taxBeforeSurcharge - rebate87A);

    // Surcharge on post-rebate tax, with marginal relief
    const { surcharge, surchargeRate } = this.calculateSurchargeWithMarginalRelief(
      taxableIncome,
      taxAfterRebate,
      this.taxRules.oldRegime.surcharge.thresholds,
      slabs
    );
    const taxAfterSurcharge = taxAfterRebate + surcharge;

    // Cess: 4% of (tax after rebate + surcharge)
    const cessRate = this.taxRules.oldRegime.cess;
    const cess = pctOf(taxAfterSurcharge, cessRate);

    const totalTaxLiability = taxAfterSurcharge + cess;
    const roundedGross = Math.round(grossTotalIncome);
    const roundedTax = Math.round(totalTaxLiability);
    const effectiveTaxRate = roundedGross > 0 ? (roundedTax / roundedGross) * 100 : 0;

    return {
      regime: 'old',
      grossTotalIncome: roundedGross,
      incomeBreakdown,
      totalDeductions: Math.round(totalDeductions),
      deductionBreakdown,
      taxableIncome: Math.round(taxableIncome),
      slabWiseTax,
      taxBeforeSurcharge: Math.round(taxBeforeSurcharge),
      surcharge: Math.round(surcharge),
      surchargeRate,
      taxAfterSurcharge: Math.round(taxAfterSurcharge),
      cess: Math.round(cess),
      cessRate,
      rebate87A: Math.round(rebate87A),
      totalTaxLiability: roundedTax,
      effectiveTaxRate: Number(effectiveTaxRate.toFixed(2)),
      takeHomeIncome: roundedGross - roundedTax,
    };
  }

  /**
   * Compare tax liability under both regimes and recommend the better one.
   */
  compareRegimes(
    income: IncomeData,
    deductions: DeductionData,
    personalInfo?: PersonalInfo
  ): RegimeComparisonResult {
    const oldRegime = this.calculateOldRegime(income, deductions, personalInfo);
    const newRegime = this.calculateNewRegime(income, deductions, personalInfo);

    const recommendedRegime = oldRegime.totalTaxLiability <= newRegime.totalTaxLiability ? 'old' : 'new';
    const savings = Math.abs(oldRegime.totalTaxLiability - newRegime.totalTaxLiability);
    const higherTax = Math.max(oldRegime.totalTaxLiability, newRegime.totalTaxLiability);
    const savingsPercentage = higherTax > 0 ? (savings / higherTax) * 100 : 0;
    const deductionsLost = oldRegime.totalDeductions - newRegime.totalDeductions;

    const oldRegimeBenefits: string[] = [];
    const newRegimeBenefits: string[] = [];

    if (oldRegime.totalDeductions > 100000) {
      oldRegimeBenefits.push(
        `Deductions of ₹${oldRegime.totalDeductions.toLocaleString('en-IN')} reduce your taxable income`
      );
    }
    if (oldRegime.deductionBreakdown.section80C > 0) {
      oldRegimeBenefits.push(
        `Section 80C: ₹${oldRegime.deductionBreakdown.section80C.toLocaleString('en-IN')}`
      );
    }
    if (oldRegime.deductionBreakdown.hra > 0) {
      oldRegimeBenefits.push(
        `HRA exemption: ₹${oldRegime.deductionBreakdown.hra.toLocaleString('en-IN')}`
      );
    }
    if (oldRegime.deductionBreakdown.section80D > 0) {
      oldRegimeBenefits.push(
        `Health insurance (80D): ₹${oldRegime.deductionBreakdown.section80D.toLocaleString('en-IN')}`
      );
    }
    if (oldRegime.rebate87A > 0) {
      oldRegimeBenefits.push(
        `Section 87A rebate: ₹${oldRegime.rebate87A.toLocaleString('en-IN')}`
      );
    }

    if (newRegime.rebate87A > 0) {
      newRegimeBenefits.push(
        `Section 87A rebate: ₹${newRegime.rebate87A.toLocaleString('en-IN')}`
      );
    }
    if (newRegime.effectiveTaxRate < oldRegime.effectiveTaxRate) {
      newRegimeBenefits.push(
        `Lower effective rate: ${newRegime.effectiveTaxRate.toFixed(2)}% vs ${oldRegime.effectiveTaxRate.toFixed(2)}%`
      );
    }
    newRegimeBenefits.push('Simpler filing — fewer deductions to track');
    if (newRegime.taxableIncome <= 700000) {
      newRegimeBenefits.push('Eligible for full 87A rebate — zero tax');
    }

    let recommendation: string;
    if (savings === 0) {
      recommendation = 'Both regimes result in equal tax. Choose New Regime for simpler filing.';
    } else if (recommendedRegime === 'old') {
      recommendation = `Old Regime saves ₹${savings.toLocaleString('en-IN')} (${savingsPercentage.toFixed(1)}%) by using your deductions.`;
    } else {
      recommendation = `New Regime saves ₹${savings.toLocaleString('en-IN')} (${savingsPercentage.toFixed(1)}%) with lower slab rates.`;
    }

    return {
      oldRegime,
      newRegime,
      recommendedRegime,
      savings: Math.round(savings),
      savingsPercentage: Number(savingsPercentage.toFixed(2)),
      deductionsLost: Math.round(deductionsLost),
      analysis: { oldRegimeBenefits, newRegimeBenefits, recommendation },
    };
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────────────────────────

  /**
   * Gross Total Income aggregation.
   * HIGH-4 fix: professional tax is NOT subtracted here — it's a Section 16 deduction.
   */
  private calculateGrossTotalIncome(income: IncomeData): number {
    let total = 0;

    // Salary: sum gross components WITHOUT subtracting professional tax
    total += income.salary.grossSalary;
    total += income.salary.hraReceived;
    total += income.salary.specialAllowance;
    total += income.salary.otherAllowances;
    // Professional tax is deducted separately under Section 16(iii), not here

    // House property
    if (income.houseProperty) {
      const nav = income.houseProperty.annualValue - income.houseProperty.municipalTaxes;
      const stdDed = pctOf(nav, 30); // 30% standard deduction on NAV
      total += nav - stdDed - income.houseProperty.interestOnHomeLoan;
    }

    // Business income (Section 44AD or actual)
    if (income.businessIncome) {
      if (income.businessIncome.digitalReceipts > 0 || income.businessIncome.cashReceipts > 0) {
        const presumptive = this.calculatePresumptiveIncome(
          income.businessIncome.digitalReceipts,
          income.businessIncome.cashReceipts
        );
        total += presumptive !== null
          ? presumptive
          : Math.max(0, income.businessIncome.grossReceipts - income.businessIncome.expenses);
      } else {
        total += Math.max(0, income.businessIncome.grossReceipts - income.businessIncome.expenses);
      }
    }

    if (income.capitalGains) {
      total += income.capitalGains.shortTerm + income.capitalGains.longTerm;
    }
    if (income.otherSources) {
      total += income.otherSources.interestIncome + income.otherSources.dividendIncome + income.otherSources.other;
    }

    return Math.max(0, total);
  }

  private getIncomeBreakdown(income: IncomeData) {
    let businessIncome = 0;
    if (income.businessIncome) {
      if (income.businessIncome.digitalReceipts > 0 || income.businessIncome.cashReceipts > 0) {
        const p = this.calculatePresumptiveIncome(
          income.businessIncome.digitalReceipts,
          income.businessIncome.cashReceipts
        );
        businessIncome = p !== null
          ? p
          : Math.max(0, Math.round(income.businessIncome.grossReceipts - income.businessIncome.expenses));
      } else {
        businessIncome = Math.max(0, Math.round(income.businessIncome.grossReceipts - income.businessIncome.expenses));
      }
    }

    return {
      salary: Math.round(
        income.salary.grossSalary +
        income.salary.hraReceived +
        income.salary.specialAllowance +
        income.salary.otherAllowances
        // professional tax NOT subtracted from salary breakdown either
      ),
      houseProperty: income.houseProperty
        ? Math.round(
            // Section 24(a): 30% standard deduction applies to NAV (annual
            // value MINUS municipal taxes) — must match the GTI aggregation
            // above. Caught by golden vector V21 (OPT-A2): this previously
            // took 30% of the gross annual value, showing a breakdown figure
            // inconsistent with the computed total.
            (income.houseProperty.annualValue - income.houseProperty.municipalTaxes) -
            pctOf(income.houseProperty.annualValue - income.houseProperty.municipalTaxes, 30) -
            income.houseProperty.interestOnHomeLoan
          )
        : 0,
      businessIncome,
      capitalGains: income.capitalGains
        ? Math.round(income.capitalGains.shortTerm + income.capitalGains.longTerm)
        : 0,
      otherSources: income.otherSources
        ? Math.round(
            income.otherSources.interestIncome +
            income.otherSources.dividendIncome +
            income.otherSources.other
          )
        : 0,
    };
  }

  /**
   * Select old regime slabs based on taxpayer age category.
   * HIGH-1 (Finance Bill 2025, First Schedule, Paragraph A):
   *  - Super senior (80+): nil up to ₹5L
   *  - Senior (60–79):     nil up to ₹3L
   *  - Standard (<60):     nil up to ₹2.5L
   */
  private selectOldRegimeSlabs(personalInfo?: PersonalInfo): TaxSlab[] {
    if (!personalInfo) return this.taxRules.oldRegime.slabs;
    if (personalInfo.isSuperSeniorCitizen && this.taxRules.oldRegime.superSeniorCitizenSlabs) {
      return this.taxRules.oldRegime.superSeniorCitizenSlabs;
    }
    if (personalInfo.isSeniorCitizen && this.taxRules.oldRegime.seniorCitizenSlabs) {
      return this.taxRules.oldRegime.seniorCitizenSlabs;
    }
    return this.taxRules.oldRegime.slabs;
  }

  /**
   * Section 87A rebate for NEW REGIME (FY 2025-26):
   * - Full rebate (min(tax, ₹25,000)) if taxableIncome ≤ ₹7,00,000
   * - Marginal relief: if taxableIncome > ₹7L but tax > (income - ₹7L), reduce rebate
   */
  private calculateRebate87ANewRegime(taxableIncome: number, taxBeforeRebate: number): number {
    const config = this.taxRules.newRegime.rebate87A;
    if (taxableIncome <= config.incomeThreshold) {
      return Math.min(taxBeforeRebate, config.maxRebate);
    }
    // Marginal relief proviso (b): rebate = tax - (income - threshold), if positive
    const excess = taxableIncome - config.incomeThreshold;
    if (taxBeforeRebate > excess) {
      return taxBeforeRebate - excess;
    }
    return 0;
  }

  /**
   * OLD REGIME 87A rebate: min(tax, ₹12,500) for income ≤ ₹5,00,000.
   * No marginal relief provision for old regime 87A.
   * HIGH-3 fix.
   */
  private calculateRebate87AOldRegime(taxableIncome: number, taxBeforeRebate: number): number {
    if (taxableIncome <= 500000) {
      return Math.min(taxBeforeRebate, 12500);
    }
    return 0;
  }

  /**
   * Calculate all deductions under Old Regime.
   * HIGH-4 fix: includes professional tax as Section 16(iii) deduction.
   * HIGH-5 fix: reads basicSalary from income.salary (not deductions.hra).
   */
  private calculateOldRegimeDeductions(income: IncomeData, deductions: DeductionData) {
    const rules = this.taxRules.oldRegime.deductions;

    const section80CTotal =
      deductions.section80C.lic +
      deductions.section80C.ppf +
      deductions.section80C.elss +
      deductions.section80C.nsc +
      deductions.section80C.homeLoanPrincipal +
      deductions.section80C.tuitionFees +
      deductions.section80C.sukanyaSamriddhi +
      deductions.section80C.other;
    const section80C = Math.min(section80CTotal, rules.section80C.limit);

    const section80CCD1B = Math.min(
      deductions.section80CCD1B.npsAdditional,
      rules.section80CCD1B.limit
    );

    const selfLimit = deductions.section80D.isSelfSenior ? rules.section80D.selfSenior : rules.section80D.self;
    const parentsLimit = deductions.section80D.isParentsSenior ? rules.section80D.parentsSenior : rules.section80D.parents;
    const selfPremium = Math.min(deductions.section80D.selfPremium, selfLimit);
    const parentsPremium = Math.min(deductions.section80D.parentsPremium, parentsLimit);
    const preventiveCheckup = Math.min(
      deductions.section80D.preventiveHealthCheckup,
      rules.section80D.preventiveHealthCheckup
    );
    const section80D = selfPremium + parentsPremium + preventiveCheckup;

    const section80E = deductions.section80E.educationLoanInterest;
    const section80G = pctOf(deductions.section80G.donations, 50);

    // HRA: now uses income.salary.basicSalary as source of truth (HIGH-5 fix)
    const hra = this.calculateHRAExemption(
      deductions.hra.rentPaid,
      income.salary.basicSalary,      // ← from IncomeData, not DeductionData
      income.salary.hraReceived,
      deductions.hra.isMetro
    );

    const standardDeduction = rules.standardDeduction.limit;

    // Section 16(iii): professional tax deduction (HIGH-4 fix)
    const professionalTax = income.salary.professionalTax;

    return {
      section80C: Math.round(section80C),
      section80CCD1B: Math.round(section80CCD1B),
      section80D: Math.round(section80D),
      section80E: Math.round(section80E),
      section80G: Math.round(section80G),
      hra: Math.round(hra),
      standardDeduction: Math.round(standardDeduction),
      professionalTax: Math.round(professionalTax),
    };
  }

  /** HRA exemption — Rule 2A: minimum of three options */
  private calculateHRAExemption(
    rentPaid: number,
    basicSalary: number,
    hraReceived: number,
    isMetro: boolean
  ): number {
    if (rentPaid === 0 || hraReceived === 0) return 0;

    const rules = this.taxRules.oldRegime.deductions.hra;
    const option1 = hraReceived;
    const option2 = Math.max(0, rentPaid - pctOf(basicSalary, rules.rentThresholdPercentage));
    const option3 = pctOf(basicSalary, isMetro ? rules.metroPercentage : rules.nonMetroPercentage);

    return Math.max(0, Math.min(option1, option2, option3));
  }

  /**
   * Section 44AD presumptive taxation.
   * HIGH task 0.7.3: applies ₹3Cr threshold when cash ≤ 5% of total.
   * Rates: 6% digital, 8% cash (corrected from inverted values).
   */
  private calculatePresumptiveIncome(digitalReceipts: number, cashReceipts: number): number | null {
    const rules = this.taxRules.presumptiveTaxation.section44AD;
    const totalReceipts = digitalReceipts + cashReceipts;
    if (totalReceipts === 0) return null;

    // Determine applicable threshold based on cash proportion
    // cash ≤ 5% of total, tested exactly in integers (cash*20 ≤ total)
    const threshold = cashReceipts * 20 <= totalReceipts
      ? (rules.thresholdDigitalOnly ?? rules.threshold)  // ₹3Cr if cash ≤ 5%
      : rules.threshold;                                  // ₹2Cr otherwise

    if (totalReceipts > threshold) return null; // Not eligible — caller uses actuals

    return sumPctOf([
      [digitalReceipts, rules.digitalRate],
      [cashReceipts, rules.cashRate],
    ]);
  }

  /**
   * Slab-wise tax computation.
   * LOW-1 fix: slab boundaries are now consistent (0, 250000, 500000 …) in JSON.
   * The iteration is: for each slab, take min(remainingIncome, slabMax - slabMin).
   */
  private calculateSlabWiseTax(taxableIncome: number, slabs: TaxSlab[]) {
    const result: Array<{ slab: string; income: number; rate: number; tax: number }> = [];
    let remainingIncome = taxableIncome;

    for (const slab of slabs) {
      if (remainingIncome <= 0) break;
      const slabMax = slab.max ?? Infinity;
      const slabBandWidth = slabMax - slab.min;
      const incomeInSlab = Math.min(remainingIncome, slabBandWidth);

      if (incomeInSlab > 0) {
        const tax = pctOf(incomeInSlab, slab.rate);
        result.push({
          slab: slab.description,
          income: Math.round(incomeInSlab),
          rate: slab.rate,
          tax,
        });
        remainingIncome -= incomeInSlab;
      }
    }
    return result;
  }

  /**
   * Surcharge with marginal relief (Finance Bill 2025, Paragraph A surcharge provisos).
   *
   * Statutory marginal relief: for income just above a surcharge threshold, the total
   * income-tax PLUS surcharge must not exceed the income-tax plus surcharge payable on
   * income exactly AT that threshold, plus the amount of income earned above it. i.e.
   *
   *   (tax + surcharge) ≤ (taxAtThreshold + surchargeAtThreshold) + (income − threshold)
   *
   * The reference threshold for a surcharge band is that band's lower income boundary:
   *   - first band (10%):  ₹50,00,000  (no surcharge applies at exactly ₹50L)
   *   - 15% band:          ₹1,00,00,000 (10% surcharge applies at exactly ₹1Cr)
   *   - 25% band:          ₹2,00,00,000 (15% surcharge applies at exactly ₹2Cr)
   *   - 37% band:          ₹5,00,00,000 (25% surcharge applies at exactly ₹5Cr)
   *
   * The earlier implementation only ever compared against the ₹50L threshold and capped
   * the surcharge (not the total liability), which under-relieved at ₹50L and grossly
   * over-charged at the ₹1Cr/₹2Cr/₹5Cr boundaries. This computes relief at each band
   * boundary correctly using the actual tax payable at that threshold.
   */
  private calculateSurchargeWithMarginalRelief(
    taxableIncome: number,
    taxAfterRebate: number,
    thresholds: Array<{ min: number; max: number | null; rate: number }>,
    slabs: TaxSlab[]
  ): { surcharge: number; surchargeRate: number } {
    // Find the applicable surcharge band (income > min and ≤ max)
    let bandIndex = -1;
    for (let i = 0; i < thresholds.length; i++) {
      const max = thresholds[i].max ?? Infinity;
      if (taxableIncome > thresholds[i].min && taxableIncome <= max) {
        bandIndex = i;
        break;
      }
    }

    if (bandIndex === -1) return { surcharge: 0, surchargeRate: 0 };

    const applicableRate = thresholds[bandIndex].rate;
    const rawSurcharge = pctOf(taxAfterRebate, applicableRate);

    // Reference threshold = lower income boundary of this band.
    // First band uses its own min; higher bands use the previous band's upper bound.
    const prevBand = bandIndex > 0 ? thresholds[bandIndex - 1] : null;
    const thresholdIncome = prevBand ? prevBand.max ?? thresholds[bandIndex].min : thresholds[bandIndex].min;
    const prevRate = prevBand ? prevBand.rate : 0;

    // Tax + surcharge payable on income exactly at the threshold.
    const taxAtThreshold = this.calculateSlabWiseTax(thresholdIncome, slabs).reduce(
      (sum, s) => sum + s.tax,
      0
    );
    const surchargeAtThreshold = pctOf(taxAtThreshold, prevRate);
    const liabilityAtThreshold = taxAtThreshold + surchargeAtThreshold;

    const maxTotalLiability = liabilityAtThreshold + (taxableIncome - thresholdIncome);
    const rawTotalLiability = taxAfterRebate + rawSurcharge;

    const surcharge =
      rawTotalLiability > maxTotalLiability
        ? Math.max(0, maxTotalLiability - taxAfterRebate)
        : rawSurcharge;

    return { surcharge: roundRupee(surcharge), surchargeRate: applicableRate };
  }
}
