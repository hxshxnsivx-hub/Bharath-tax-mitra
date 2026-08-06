export interface TaxSlab {
  min: number;
  max: number | null;
  rate: number;
  description: string;
}

export interface SurchargeThreshold {
  min: number;
  max: number | null;
  rate: number;
  description: string;
}

export interface Section80C {
  limit: number;
  description: string;
  items: string[];
}

export interface Section80D {
  self: number;
  selfSenior: number;
  parents: number;
  parentsSenior: number;
  description: string;
  preventiveHealthCheckup: number;
}

export interface StandardDeduction {
  limit: number;
  description: string;
}

export interface HRAExemption {
  metroPercentage: number;
  nonMetroPercentage: number;
  rentThresholdPercentage: number;
  description: string;
}

export interface OldRegimeDeductions {
  section80C: Section80C;
  section80CCD1B: {
    limit: number;
    description: string;
  };
  section80D: Section80D;
  section80E: {
    limit: number | null;
    description: string;
  };
  section80G: {
    limit: number | null;
    description: string;
  };
  standardDeduction: StandardDeduction;
  hra: HRAExemption;
}

export interface NewRegimeDeductions {
  standardDeduction: StandardDeduction;
}

export interface Rebate87A {
  incomeThreshold: number;
  maxRebate: number;
  description: string;
}

export interface TaxRegime {
  name: string;
  slabs: TaxSlab[];
  surcharge: {
    thresholds: SurchargeThreshold[];
  };
  cess: number;
}

export interface OldRegime extends TaxRegime {
  deductions: OldRegimeDeductions;
  rebate87A: Rebate87A;
  seniorCitizenSlabs: TaxSlab[];
  superSeniorCitizenSlabs: TaxSlab[];
}

export interface NewRegime extends TaxRegime {
  rebate87A: Rebate87A;
  deductions: NewRegimeDeductions;
}

export interface PresumptiveTaxation {
  section44AD: {
    threshold: number;
    thresholdDigitalOnly: number; // ₹3Cr when cash receipts <= 5% of total (Finance Act 2023)
    digitalRate: number;
    cashRate: number;
    description: string;
  };
  section44ADA: {
    threshold: number;
    thresholdDigitalOnly: number; // ₹75L when cash receipts <= 5% of total
    rate: number;
    description: string;
  };
}

export interface ValidationRules {
  maxTDSPercentage: number;
  maxHRAPercentage: number;
  maxDeductionPercentage: number;
  minAge: number;
  maxAge: number;
  seniorCitizenAge: number;
  superSeniorCitizenAge: number;
}

export interface TaxRules {
  version: string;
  financialYear: string;
  assessmentYear: string;
  effectiveFrom: string;
  effectiveTo: string;
  oldRegime: OldRegime;
  newRegime: NewRegime;
  presumptiveTaxation: PresumptiveTaxation;
  validationRules: ValidationRules;
}
