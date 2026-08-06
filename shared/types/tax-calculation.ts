// Income data structure
export interface IncomeData {
  salary: {
    grossSalary: number;
    basicSalary: number;       // Added: required for HRA calculation (Rule 2A) and senior citizen slab selection
    hraReceived: number;
    specialAllowance: number;
    otherAllowances: number;
    professionalTax: number;   // Deductible under Section 16(iii) — NOT subtracted from gross; applied as deduction
  };
  houseProperty?: {
    annualValue: number;
    municipalTaxes: number;
    interestOnHomeLoan: number;
  };
  businessIncome?: {
    grossReceipts: number;
    digitalReceipts: number;
    cashReceipts: number;
    expenses: number;
  };
  capitalGains?: {
    shortTerm: number;
    longTerm: number;
  };
  otherSources?: {
    interestIncome: number;
    dividendIncome: number;
    other: number;
  };
}

// Deduction data structure
export interface DeductionData {
  section80C: {
    lic: number;
    ppf: number;
    elss: number;
    nsc: number;
    homeLoanPrincipal: number;
    tuitionFees: number;
    sukanyaSamriddhi: number;
    other: number;
  };
  section80CCD1B: {
    npsAdditional: number;      // Max ₹50,000 (Section 80CCD(1B))
  };
  section80D: {
    selfPremium: number;
    parentsPremium: number;
    preventiveHealthCheckup: number;
    isSelfSenior: boolean;
    isParentsSenior: boolean;
  };
  section80E: {
    educationLoanInterest: number;
  };
  section80G: {
    donations: number;          // 50% deduction applied by engine
  };
  hra: {
    rentPaid: number;
    isMetro: boolean;
    // NOTE: basicSalary for HRA is sourced from IncomeData.salary.basicSalary (not duplicated here)
    // HRA exemption = min(hraReceived, rentPaid - 10%*basic, 50%/40%*basic)
  };
  section16: {
    professionalTax: number;   // Deduction under Section 16(iii) — separate from gross salary aggregation
    // NOTE: this mirrors IncomeData.salary.professionalTax and is applied as a deduction, not income reduction
  };
}

// Tax calculation result
export interface TaxCalculationResult {
  regime: 'old' | 'new';

  // Income breakdown
  grossTotalIncome: number;
  incomeBreakdown: {
    salary: number;
    houseProperty: number;
    businessIncome: number;
    capitalGains: number;
    otherSources: number;
  };

  // Deductions
  totalDeductions: number;
  deductionBreakdown: {
    section80C: number;
    section80CCD1B: number;
    section80D: number;
    section80E: number;
    section80G: number;
    hra: number;
    standardDeduction: number;
    professionalTax: number;   // Section 16(iii) deduction
  };

  // Taxable income
  taxableIncome: number;

  // Tax calculation
  slabWiseTax: Array<{
    slab: string;
    income: number;
    rate: number;
    tax: number;
  }>;
  taxBeforeSurcharge: number;
  surcharge: number;
  surchargeRate: number;
  taxAfterSurcharge: number;
  cess: number;
  cessRate: number;
  rebate87A: number;           // Present in both regimes (old regime: ₹12,500 up to ₹5L; new regime: ₹25,000 up to ₹7L)
  totalTaxLiability: number;

  // Effective metrics
  effectiveTaxRate: number;
  takeHomeIncome: number;      // grossTotalIncome - totalTaxLiability (pre-TDS figure)
  taxPayableOrRefund?: number; // totalTaxLiability - tdsDeducted (actual cash flow impact, computed by caller)
}

// Personal information
export interface PersonalInfo {
  pan: string;
  name: string;
  dateOfBirth: string;        // ISO 8601: YYYY-MM-DD
  age: number;                // Calculated from DOB at end of previous year (1 April - 31 March)
  isSeniorCitizen: boolean;   // age >= 60: nil slab up to ₹3L (Finance Bill 2025, Paragraph A(II))
  isSuperSeniorCitizen: boolean; // age >= 80: nil slab up to ₹5L (Finance Bill 2025, Paragraph A(III))
  residentialStatus: 'resident' | 'non-resident' | 'rnor';
  // NOTE: NRI/RNOR residentialStatus affects slab applicability.
  // Non-residents do NOT get basic exemption under Old Regime.
  // Current calculator only supports 'resident' — NRI support deferred.
}

// Complete tax filing data
export interface TaxFilingData {
  personalInfo: PersonalInfo;
  income: IncomeData;
  deductions: DeductionData;
  tdsDeducted: number;
  advanceTax: number;
  selfAssessmentTax: number;
  financialYear: string;       // e.g. 'FY2025-26'
  assessmentYear: string;      // e.g. 'AY2025-26'
}

// Regime comparison result
export interface RegimeComparisonResult {
  oldRegime: TaxCalculationResult;
  newRegime: TaxCalculationResult;
  recommendedRegime: 'old' | 'new';
  savings: number;
  savingsPercentage: number;
  deductionsLost: number;
  analysis: {
    oldRegimeBenefits: string[];
    newRegimeBenefits: string[];
    recommendation: string;
  };
}
