// Income data structure
export interface IncomeData {
  salary: {
    grossSalary: number;
    hraReceived: number;
    specialAllowance: number;
    otherAllowances: number;
    professionalTax: number;
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
    npsAdditional: number;
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
    donations: number;
  };
  hra: {
    rentPaid: number;
    isMetro: boolean;
    basicSalary: number;
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
  totalTaxLiability: number;
  
  // Rebate (for new regime)
  rebate87A?: number;
  
  // Effective tax rate
  effectiveTaxRate: number;
  
  // Take-home
  takeHomeIncome: number;
}

// Personal information
export interface PersonalInfo {
  pan: string;
  name: string;
  dateOfBirth: string;
  age: number;
  isSeniorCitizen: boolean;
  isSuperSeniorCitizen: boolean;
  residentialStatus: 'resident' | 'non-resident' | 'rnor';
}

// Complete tax filing data
export interface TaxFilingData {
  personalInfo: PersonalInfo;
  income: IncomeData;
  deductions: DeductionData;
  tdsDeducted: number;
  advanceTax: number;
  selfAssessmentTax: number;
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
