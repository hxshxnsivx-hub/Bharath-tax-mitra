/**
 * UI-layer form state types for Bharat Tax Mitra.
 *
 * These are distinct from the calculator's input types in `tax-calculation.ts`.
 * They use friendly field names that match what each form component collects,
 * and are the canonical shape stored in IndexedDB drafts.
 *
 * Requirements: 20.5, 1.4 — Data loss prevention / auto-save
 */

// ---------------------------------------------------------------------------
// Personal Information
// ---------------------------------------------------------------------------

/**
 * Personal info as collected by PersonalInfoForm.
 * Note: `dob` is stored as DD/MM/YYYY (display format) at the UI layer.
 */
export interface PersonalInfoFormData {
  pan: string;
  fullName: string;
  /** DD/MM/YYYY format as entered in the form */
  dob: string;
  address: string;
  email: string;
  /** Optional — Aadhaar number */
  aadhaar?: string;
}

// ---------------------------------------------------------------------------
// Salary Income
// ---------------------------------------------------------------------------

/**
 * Salary income as collected by SalaryIncomeForm.
 * Matches the local `SalaryIncome` interface in SalaryIncomeForm.tsx.
 */
export interface SalaryIncomeFormData {
  grossSalary: number;
  /**
   * Basic salary component — required for HRA exemption (Rule 2A) and senior
   * citizen slab selection (rework HIGH-5). Collected by SalaryIncomeForm.
   */
  basicSalary: number;
  /** HRA received from employer */
  hraReceived: number;
  specialAllowance: number;
  otherAllowances: number;
  /** Standard deduction — auto-filled to ₹50,000 */
  standardDeduction: number;
  professionalTax: number;
  otherDeductions: number;
  /** TDS deducted per quarter */
  tdsQ1: number;
  tdsQ2: number;
  tdsQ3: number;
  tdsQ4: number;
  employerTAN: string;
  employerName: string;
  /**
   * Bank/other interest income (optional — no dedicated form field yet; mapped
   * into IncomeData.otherSources by buildIncomeData when present).
   */
  interestIncome?: number;
}

// ---------------------------------------------------------------------------
// Deductions
// ---------------------------------------------------------------------------

/**
 * Deduction details as collected by DeductionsForm.
 * Covers 80C, 80D, HRA, and other common deductions.
 */
export interface DeductionFormData {
  // Section 80C (aggregate cap ₹1.5L)
  lic: number;
  ppf: number;
  elss: number;
  nsc: number;
  homeLoanPrincipal: number;
  /** 80C — tuition fees (optional; no dedicated form field yet) */
  tuitionFees?: number;
  /** 80C — Sukanya Samriddhi deposits (optional; no dedicated form field yet) */
  sukanyaSamriddhi?: number;
  /** 80C — other eligible investments (optional; no dedicated form field yet) */
  other80C?: number;

  // Section 80D — Health Insurance
  healthInsuranceSelf: number;
  healthInsuranceParents: number;
  /** 80D — preventive health checkup, max ₹5,000 (optional; no form field yet) */
  preventiveHealthCheckup?: number;
  isSelfSeniorCitizen: boolean;
  isParentSeniorCitizen: boolean;

  // HRA — basicSalary is sourced from SalaryIncomeForm, not entered here
  rentPaid: number;
  /** PAN of landlord (required when rent > ₹1L/year) */
  landlordPAN: string;
  isMetroCity: boolean;

  // Other deductions
  /** Section 80CCD(1B) — additional NPS contribution, max ₹50,000 */
  npsAdditional: number;
  /** Section 80G — charitable donations (50% deduction applied by engine) */
  donations: number;
  /** Section 80E — education loan interest */
  educationLoanInterest: number;
}

// ---------------------------------------------------------------------------
// Business Income (Presumptive — Section 44AD)
// ---------------------------------------------------------------------------

/**
 * Business income as collected by BusinessIncomeForm.
 * Uses presumptive taxation under Section 44AD.
 */
export interface BusinessInfoFormData {
  /** Type of business — e.g. 'retail', 'services', 'trading' */
  businessType: string;
  /** Gross receipts received via digital modes (6% rate applies) */
  grossReceiptsDigital: number;
  /** Gross receipts received via cash (8% rate applies) */
  grossReceiptsCash: number;
  /** Calculated presumptive income (auto-computed from receipts) */
  presumptiveIncome: number;
}

// ---------------------------------------------------------------------------
// Composite form state
// ---------------------------------------------------------------------------

/**
 * The complete UI form state held in the `useTaxForm` hook and persisted to
 * IndexedDB. All sub-sections are Partial<> so the user can save at any stage.
 *
 * Requirements: 1.4, 20.5
 */
export interface TaxFormData {
  personalInfo: Partial<PersonalInfoFormData>;
  salaryIncome: Partial<SalaryIncomeFormData>;
  deductions: Partial<DeductionFormData>;
  businessInfo: Partial<BusinessInfoFormData>;
  /** Tax regime chosen by the user */
  selectedRegime: 'old' | 'new';
  /** Financial year string, e.g. 'FY2025-26' */
  financialYear: string;
  /** Unix timestamp (ms) of the last successful auto-save */
  lastSavedAt?: number;
}
