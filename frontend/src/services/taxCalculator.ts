import type { TaxRules, TaxSlab } from '../../../shared/types/tax-rules';
import type {
  IncomeData,
  DeductionData,
  TaxCalculationResult,
  RegimeComparisonResult,
} from '../../../shared/types/tax-calculation';

export class TaxCalculator {
  constructor(private taxRules: TaxRules) {}

  /**
   * Calculate tax under New Regime
   */
  calculateNewRegime(income: IncomeData, deductions: DeductionData): TaxCalculationResult {
    // Step 1: Calculate Gross Total Income
    const grossTotalIncome = this.calculateGrossTotalIncome(income);
    const incomeBreakdown = this.getIncomeBreakdown(income);

    // Step 2: Calculate deductions (only standard deduction in new regime)
    const standardDeduction = this.taxRules.newRegime.deductions.standardDeduction.limit;
    const totalDeductions = standardDeduction;

    const deductionBreakdown = {
      section80C: 0,
      section80CCD1B: 0,
      section80D: 0,
      section80E: 0,
      section80G: 0,
      hra: 0,
      standardDeduction: Math.round(standardDeduction),
    };

    // Step 3: Calculate Taxable Income
    const taxableIncome = Math.max(0, grossTotalIncome - totalDeductions);

    // Step 4: Calculate slab-wise tax
    const slabWiseTax = this.calculateSlabWiseTax(
      taxableIncome,
      this.taxRules.newRegime.slabs
    );
    const taxBeforeSurcharge = slabWiseTax.reduce((sum, slab) => sum + slab.tax, 0);

    // Step 5: Calculate surcharge
    const { surcharge, surchargeRate } = this.calculateSurcharge(
      taxableIncome,
      taxBeforeSurcharge,
      this.taxRules.newRegime.surcharge.thresholds
    );
    const taxAfterSurcharge = taxBeforeSurcharge + surcharge;

    // Step 6: Calculate cess
    const cessRate = this.taxRules.newRegime.cess;
    const cess = Math.round((taxAfterSurcharge * cessRate) / 100);

    // Step 7: Calculate Section 87A rebate
    const rebate87A = this.calculateRebate87A(taxableIncome, taxAfterSurcharge + cess);

    // Step 8: Calculate total tax liability (after rebate)
    const totalTaxLiability = Math.max(0, taxAfterSurcharge + cess - rebate87A);

    // Step 9: Calculate effective tax rate and take-home
    const effectiveTaxRate = grossTotalIncome > 0 
      ? (totalTaxLiability / grossTotalIncome) * 100 
      : 0;
    const takeHomeIncome = grossTotalIncome - totalTaxLiability;

    return {
      regime: 'new',
      grossTotalIncome: Math.round(grossTotalIncome),
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
      totalTaxLiability: Math.round(totalTaxLiability),
      effectiveTaxRate: Number(effectiveTaxRate.toFixed(2)),
      takeHomeIncome: Math.round(takeHomeIncome),
    };
  }

  /**
   * Calculate Section 87A rebate (New Regime only)
   * Rebate: Up to ₹25,000 for income ≤ ₹7 lakh
   */
  private calculateRebate87A(taxableIncome: number, taxLiability: number): number {
    const rebateConfig = this.taxRules.newRegime.rebate87A;

    if (taxableIncome <= rebateConfig.incomeThreshold) {
      return Math.min(taxLiability, rebateConfig.maxRebate);
    }

    return 0;
  }

  /**
   * Calculate tax under Old Regime
   */
  calculateOldRegime(income: IncomeData, deductions: DeductionData): TaxCalculationResult {
    // Step 1: Calculate Gross Total Income
    const grossTotalIncome = this.calculateGrossTotalIncome(income);
    const incomeBreakdown = this.getIncomeBreakdown(income);

    // Step 2: Calculate all deductions
    const deductionBreakdown = this.calculateOldRegimeDeductions(income, deductions);
    const totalDeductions = Object.values(deductionBreakdown).reduce((sum, val) => sum + val, 0);

    // Step 3: Calculate Taxable Income
    const taxableIncome = Math.max(0, grossTotalIncome - totalDeductions);

    // Step 4: Calculate slab-wise tax
    const slabWiseTax = this.calculateSlabWiseTax(
      taxableIncome,
      this.taxRules.oldRegime.slabs
    );
    const taxBeforeSurcharge = slabWiseTax.reduce((sum, slab) => sum + slab.tax, 0);

    // Step 5: Calculate surcharge
    const { surcharge, surchargeRate } = this.calculateSurcharge(
      taxableIncome,
      taxBeforeSurcharge,
      this.taxRules.oldRegime.surcharge.thresholds
    );
    const taxAfterSurcharge = taxBeforeSurcharge + surcharge;

    // Step 6: Calculate cess
    const cessRate = this.taxRules.oldRegime.cess;
    const cess = Math.round((taxAfterSurcharge * cessRate) / 100);

    // Step 7: Calculate total tax liability
    const totalTaxLiability = taxAfterSurcharge + cess;

    // Step 8: Calculate effective tax rate and take-home
    const effectiveTaxRate = grossTotalIncome > 0 
      ? (totalTaxLiability / grossTotalIncome) * 100 
      : 0;
    const takeHomeIncome = grossTotalIncome - totalTaxLiability;

    return {
      regime: 'old',
      grossTotalIncome: Math.round(grossTotalIncome),
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
      totalTaxLiability: Math.round(totalTaxLiability),
      effectiveTaxRate: Number(effectiveTaxRate.toFixed(2)),
      takeHomeIncome: Math.round(takeHomeIncome),
    };
  }

  /**
   * Compare tax liability under both Old and New regimes
   * Provides recommendation and analysis
   */
  compareRegimes(income: IncomeData, deductions: DeductionData): RegimeComparisonResult {
    // Calculate tax under both regimes
    const oldRegime = this.calculateOldRegime(income, deductions);
    const newRegime = this.calculateNewRegime(income, deductions);

    // Determine recommended regime (lower tax liability)
    const recommendedRegime = oldRegime.totalTaxLiability <= newRegime.totalTaxLiability ? 'old' : 'new';
    
    // Calculate savings
    const savings = Math.abs(oldRegime.totalTaxLiability - newRegime.totalTaxLiability);
    const higherTax = Math.max(oldRegime.totalTaxLiability, newRegime.totalTaxLiability);
    const savingsPercentage = higherTax > 0 ? (savings / higherTax) * 100 : 0;

    // Calculate deductions lost in new regime
    const deductionsLost = oldRegime.totalDeductions - newRegime.totalDeductions;

    // Generate analysis
    const oldRegimeBenefits: string[] = [];
    const newRegimeBenefits: string[] = [];

    // Old regime benefits
    if (oldRegime.totalDeductions > 100000) {
      oldRegimeBenefits.push(`You can claim ₹${oldRegime.totalDeductions.toLocaleString('en-IN')} in deductions`);
    }
    if (oldRegime.deductionBreakdown.section80C > 0) {
      oldRegimeBenefits.push(`Section 80C deductions: ₹${oldRegime.deductionBreakdown.section80C.toLocaleString('en-IN')}`);
    }
    if (oldRegime.deductionBreakdown.hra > 0) {
      oldRegimeBenefits.push(`HRA exemption: ₹${oldRegime.deductionBreakdown.hra.toLocaleString('en-IN')}`);
    }
    if (oldRegime.deductionBreakdown.section80D > 0) {
      oldRegimeBenefits.push(`Health insurance deduction: ₹${oldRegime.deductionBreakdown.section80D.toLocaleString('en-IN')}`);
    }

    // New regime benefits
    if (newRegime.rebate87A && newRegime.rebate87A > 0) {
      newRegimeBenefits.push(`Section 87A rebate: ₹${newRegime.rebate87A.toLocaleString('en-IN')}`);
    }
    if (newRegime.effectiveTaxRate < oldRegime.effectiveTaxRate) {
      newRegimeBenefits.push(`Lower effective tax rate: ${newRegime.effectiveTaxRate.toFixed(2)}% vs ${oldRegime.effectiveTaxRate.toFixed(2)}%`);
    }
    newRegimeBenefits.push('Simpler tax filing with fewer deductions to track');
    if (newRegime.taxableIncome <= 700000) {
      newRegimeBenefits.push('Eligible for full tax rebate under Section 87A');
    }

    // Generate recommendation text
    let recommendation: string;
    if (recommendedRegime === 'old') {
      recommendation = `Old Regime is recommended. You will save ₹${savings.toLocaleString('en-IN')} (${savingsPercentage.toFixed(1)}%) by utilizing available deductions.`;
    } else if (savings > 5000) {
      recommendation = `New Regime is recommended. You will save ₹${savings.toLocaleString('en-IN')} (${savingsPercentage.toFixed(1)}%) with lower tax rates.`;
    } else {
      recommendation = `Both regimes result in similar tax liability (difference: ₹${savings.toLocaleString('en-IN')}). Consider the New Regime for simpler filing.`;
    }

    return {
      oldRegime,
      newRegime,
      recommendedRegime,
      savings: Math.round(savings),
      savingsPercentage: Number(savingsPercentage.toFixed(2)),
      deductionsLost: Math.round(deductionsLost),
      analysis: {
        oldRegimeBenefits,
        newRegimeBenefits,
        recommendation,
      },
    };
  }

  /**
   * Calculate Gross Total Income from all sources
   */
  private calculateGrossTotalIncome(income: IncomeData): number {
    let total = 0;

    // Salary income
    total += income.salary.grossSalary;
    total += income.salary.hraReceived;
    total += income.salary.specialAllowance;
    total += income.salary.otherAllowances;
    total -= income.salary.professionalTax;

    // House property income
    if (income.houseProperty) {
      const netAnnualValue = income.houseProperty.annualValue - income.houseProperty.municipalTaxes;
      const standardDeduction = netAnnualValue * 0.3; // 30% standard deduction
      const housePropertyIncome = netAnnualValue - standardDeduction - income.houseProperty.interestOnHomeLoan;
      total += housePropertyIncome;
    }

    // Business income
    if (income.businessIncome) {
      // Check if Section 44AD presumptive taxation applies
      if (income.businessIncome.digitalReceipts > 0 || income.businessIncome.cashReceipts > 0) {
        const presumptiveIncome = this.calculatePresumptiveIncome(
          income.businessIncome.digitalReceipts,
          income.businessIncome.cashReceipts
        );
        
        // Use presumptive income if eligible, otherwise use actual income
        if (presumptiveIncome > 0) {
          total += presumptiveIncome;
        } else {
          // Turnover exceeds ₹2 crore, use actual income
          total += income.businessIncome.grossReceipts - income.businessIncome.expenses;
        }
      } else {
        // No digital/cash receipts specified, use actual income
        total += income.businessIncome.grossReceipts - income.businessIncome.expenses;
      }
    }

    // Capital gains
    if (income.capitalGains) {
      total += income.capitalGains.shortTerm + income.capitalGains.longTerm;
    }

    // Other sources
    if (income.otherSources) {
      total += income.otherSources.interestIncome;
      total += income.otherSources.dividendIncome;
      total += income.otherSources.other;
    }

    return Math.max(0, total);
  }

  /**
   * Get income breakdown by source
   */
  private getIncomeBreakdown(income: IncomeData) {
    return {
      salary: Math.round(
        income.salary.grossSalary +
        income.salary.hraReceived +
        income.salary.specialAllowance +
        income.salary.otherAllowances -
        income.salary.professionalTax
      ),
      houseProperty: income.houseProperty
        ? Math.round(
            income.houseProperty.annualValue -
            income.houseProperty.municipalTaxes -
            income.houseProperty.annualValue * 0.3 -
            income.houseProperty.interestOnHomeLoan
          )
        : 0,
      businessIncome: income.businessIncome
        ? (() => {
            // Check if Section 44AD presumptive taxation applies
            if (income.businessIncome.digitalReceipts > 0 || income.businessIncome.cashReceipts > 0) {
              const presumptiveIncome = this.calculatePresumptiveIncome(
                income.businessIncome.digitalReceipts,
                income.businessIncome.cashReceipts
              );
              
              // Use presumptive income if eligible, otherwise use actual income
              if (presumptiveIncome > 0) {
                return Math.round(presumptiveIncome);
              }
            }
            // Use actual income
            return Math.round(income.businessIncome.grossReceipts - income.businessIncome.expenses);
          })()
        : 0,
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
   * Calculate all deductions under Old Regime
   */
  private calculateOldRegimeDeductions(income: IncomeData, deductions: DeductionData) {
    const rules = this.taxRules.oldRegime.deductions;

    // Section 80C (max ₹1.5 lakh)
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

    // Section 80CCD(1B) - Additional NPS (max ₹50k)
    const section80CCD1B = Math.min(
      deductions.section80CCD1B.npsAdditional,
      rules.section80CCD1B.limit
    );

    // Section 80D - Health insurance
    const selfLimit = deductions.section80D.isSelfSenior
      ? rules.section80D.selfSenior
      : rules.section80D.self;
    const parentsLimit = deductions.section80D.isParentsSenior
      ? rules.section80D.parentsSenior
      : rules.section80D.parents;
    
    const selfPremium = Math.min(deductions.section80D.selfPremium, selfLimit);
    const parentsPremium = Math.min(deductions.section80D.parentsPremium, parentsLimit);
    const preventiveCheckup = Math.min(
      deductions.section80D.preventiveHealthCheckup,
      rules.section80D.preventiveHealthCheckup
    );
    const section80D = selfPremium + parentsPremium + preventiveCheckup;

    // Section 80E - Education loan interest (no limit)
    const section80E = deductions.section80E.educationLoanInterest;

    // Section 80G - Donations (simplified - 50% of donation)
    const section80G = deductions.section80G.donations * 0.5;

    // HRA Exemption (minimum of 3 options)
    const hra = this.calculateHRAExemption(
      deductions.hra.rentPaid,
      deductions.hra.basicSalary,
      income.salary.hraReceived,
      deductions.hra.isMetro
    );

    // Standard Deduction (₹50,000)
    const standardDeduction = rules.standardDeduction.limit;

    return {
      section80C: Math.round(section80C),
      section80CCD1B: Math.round(section80CCD1B),
      section80D: Math.round(section80D),
      section80E: Math.round(section80E),
      section80G: Math.round(section80G),
      hra: Math.round(hra),
      standardDeduction: Math.round(standardDeduction),
    };
  }

  /**
   * Calculate HRA exemption (minimum of 3 options)
   */
  private calculateHRAExemption(
    rentPaid: number,
    basicSalary: number,
    hraReceived: number,
    isMetro: boolean
  ): number {
    if (rentPaid === 0 || hraReceived === 0) {
      return 0;
    }

    const rules = this.taxRules.oldRegime.deductions.hra;

    // Option 1: Actual HRA received
    const option1 = hraReceived;

    // Option 2: Rent paid minus 10% of basic salary
    const option2 = rentPaid - basicSalary * (rules.rentThresholdPercentage / 100);

    // Option 3: 50% of basic (metro) or 40% (non-metro)
    const percentage = isMetro ? rules.metroPercentage : rules.nonMetroPercentage;
    const option3 = basicSalary * (percentage / 100);

    // Return minimum of three options
    return Math.max(0, Math.min(option1, option2, option3));
  }

  /**
   * Calculate presumptive income under Section 44AD
   * For businesses with turnover < ₹2 crore
   * @param digitalReceipts - Digital/online receipts
   * @param cashReceipts - Cash receipts
   * @returns Presumptive income (6% of digital + 8% of cash)
   */
  private calculatePresumptiveIncome(
    digitalReceipts: number,
    cashReceipts: number
  ): number {
    const rules = this.taxRules.presumptiveTaxation.section44AD;
    const totalReceipts = digitalReceipts + cashReceipts;

    // Check if eligible for Section 44AD (turnover < ₹2 crore)
    if (totalReceipts > rules.threshold) {
      // Not eligible for presumptive taxation
      return 0;
    }

    // Calculate presumptive income: 6% of digital + 8% of cash
    const digitalIncome = digitalReceipts * (rules.digitalRate / 100);
    const cashIncome = cashReceipts * (rules.cashRate / 100);

    return digitalIncome + cashIncome;
  }

  /**
   * Calculate slab-wise tax
   */
  private calculateSlabWiseTax(taxableIncome: number, slabs: TaxSlab[]) {
    const result: Array<{
      slab: string;
      income: number;
      rate: number;
      tax: number;
    }> = [];

    let remainingIncome = taxableIncome;

    for (const slab of slabs) {
      if (remainingIncome <= 0) break;

      const slabMin = slab.min;
      const slabMax = slab.max ?? Infinity;
      const slabRange = slabMax - slabMin;

      // Calculate income in this slab
      const incomeInSlab = Math.min(remainingIncome, slabRange);

      if (incomeInSlab > 0) {
        const tax = (incomeInSlab * slab.rate) / 100;

        result.push({
          slab: slab.description,
          income: Math.round(incomeInSlab),
          rate: slab.rate,
          tax: Math.round(tax),
        });

        remainingIncome -= incomeInSlab;
      }
    }

    return result;
  }

  /**
   * Calculate surcharge based on income
   */
  private calculateSurcharge(
    taxableIncome: number,
    taxBeforeSurcharge: number,
    thresholds: Array<{ min: number; max: number | null; rate: number }>
  ): { surcharge: number; surchargeRate: number } {
    for (const threshold of thresholds) {
      const min = threshold.min;
      const max = threshold.max ?? Infinity;

      if (taxableIncome >= min && taxableIncome <= max) {
        const surcharge = (taxBeforeSurcharge * threshold.rate) / 100;
        return {
          surcharge,
          surchargeRate: threshold.rate,
        };
      }
    }

    return { surcharge: 0, surchargeRate: 0 };
  }
}
