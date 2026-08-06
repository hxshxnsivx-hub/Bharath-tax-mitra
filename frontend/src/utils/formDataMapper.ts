/**
 * formDataMapper.ts
 *
 * Maps UI-layer form data (form-data.ts) to calculator input types (tax-calculation.ts).
 *
 * This is the canonical bridge between what users fill in and what the tax engine consumes.
 *
 * Requirements: 5.1 — Calculator accuracy
 */

import type {
  PersonalInfoFormData,
  SalaryIncomeFormData,
  DeductionFormData,
  BusinessInfoFormData,
} from '../../../shared/types/form-data';
import type {
  IncomeData,
  DeductionData,
  PersonalInfo,
} from '../../../shared/types/tax-calculation';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Parse a DD/MM/YYYY string and return a { year, month, day } tuple.
 * Throws if the format is invalid.
 */
function parseDDMMYYYY(dob: string): { year: number; month: number; day: number } {
  const parts = dob.split('/');
  if (parts.length !== 3) {
    throw new Error(`Invalid DOB format "${dob}". Expected DD/MM/YYYY.`);
  }
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    throw new Error(`Invalid DOB value "${dob}". Day/month/year must be numeric.`);
  }
  return { day, month, year };
}

/**
 * Convert DD/MM/YYYY → ISO 8601 string (YYYY-MM-DD).
 */
function toISO8601(dob: string): string {
  const { year, month, day } = parseDDMMYYYY(dob);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Compute age at 31 March of `filingYear`.
 *
 * Per the Income Tax Act, age is computed at the last day of the
 * financial year (31 March) to determine senior citizen status.
 *
 * For FY 2025-26 pass filingYear = 2026.
 * e.g. Born 1 Apr 1965, assessed at 31 Mar 2026 → completed 60 years → age = 60.
 */
function computeAgeAt31March(dob: string, filingYear: number): number {
  const { year: birthYear, month: birthMonth, day: birthDay } = parseDDMMYYYY(dob);

  // 31 March of the filing year (month is 1-based here, then we use JS Date with month 2 = March)
  const assessmentDate = new Date(filingYear, 2, 31); // Month 2 = March (0-indexed)
  const birthDate = new Date(birthYear, birthMonth - 1, birthDay);

  let age = assessmentDate.getFullYear() - birthDate.getFullYear();

  // Subtract 1 if the birthday hasn't occurred yet by 31 March
  const monthDiff = assessmentDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && assessmentDate.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
}

/**
 * Extract the ending calendar year from a financial year string.
 * 'FY2025-26' → 2026
 * 'FY2024-25' → 2025
 */
function filingYearEnd(financialYear: string): number {
  // FY format: 'FY2025-26' or '2025-26'
  const match = financialYear.match(/(\d{4})-(\d{2,4})/);
  if (!match) {
    throw new Error(`Invalid financialYear format "${financialYear}". Expected e.g. 'FY2025-26'.`);
  }
  const startYear = parseInt(match[1], 10);
  // The suffix may be 2 digits ('26') or 4 digits ('2026')
  const suffix = match[2];
  const endYear =
    suffix.length === 4
      ? parseInt(suffix, 10)
      : Math.floor(startYear / 100) * 100 + parseInt(suffix, 10);
  return endYear;
}

// ---------------------------------------------------------------------------
// Public mappers
// ---------------------------------------------------------------------------

/**
 * Map salary and business form data → IncomeData for the tax engine.
 *
 * `businessInfo` is optional — omit it (or pass undefined) if the user has
 * no business income.
 *
 * NOTE: `basicSalary` is not collected in the current SalaryIncomeFormData
 * (the form collects gross salary components). It defaults to 0 here.
 * When the form captures basicSalary, pass it via the form data; the mapper
 * will pick it up automatically once SalaryIncomeFormData includes the field.
 */
export function toIncomeData(
  salaryIncome: Partial<SalaryIncomeFormData>,
  businessInfo?: Partial<BusinessInfoFormData>,
): IncomeData {
  const result: IncomeData = {
    salary: {
      grossSalary: salaryIncome.grossSalary ?? 0,
      // basicSalary is not yet in SalaryIncomeFormData; default to 0 until the
      // form captures it. The HRA engine will use this value — if 0 the HRA
      // exemption will also be 0 (conservative, correct per the formula).
      basicSalary: (salaryIncome as Record<string, unknown>).basicSalary as number ?? 0,
      hraReceived: salaryIncome.hraReceived ?? 0,
      specialAllowance: salaryIncome.specialAllowance ?? 0,
      otherAllowances: salaryIncome.otherAllowances ?? 0,
      professionalTax: salaryIncome.professionalTax ?? 0,
    },
  };

  if (businessInfo) {
    const digital = businessInfo.grossReceiptsDigital ?? 0;
    const cash = businessInfo.grossReceiptsCash ?? 0;
    result.businessIncome = {
      grossReceipts: digital + cash,
      digitalReceipts: digital,
      cashReceipts: cash,
      expenses: 0, // Presumptive — expenses not separately entered
    };
  }

  return result;
}

/**
 * Map deduction form data → DeductionData for the tax engine.
 *
 * `salaryIncome` is accepted for context (e.g. professionalTax mirroring) but
 * basicSalary is intentionally NOT placed in `hra` — the engine sources it
 * from `IncomeData.salary.basicSalary` instead (see type comment in
 * tax-calculation.ts).
 */
export function toDeductionData(
  deductions: Partial<DeductionFormData>,
  salaryIncome: Partial<SalaryIncomeFormData>,
): DeductionData {
  return {
    section80C: {
      lic: deductions.lic ?? 0,
      ppf: deductions.ppf ?? 0,
      elss: deductions.elss ?? 0,
      nsc: deductions.nsc ?? 0,
      homeLoanPrincipal: deductions.homeLoanPrincipal ?? 0,
      tuitionFees: 0,
      sukanyaSamriddhi: 0,
      other: 0,
    },
    section80CCD1B: {
      npsAdditional: deductions.npsAdditional ?? 0,
    },
    section80D: {
      selfPremium: deductions.healthInsuranceSelf ?? 0,
      parentsPremium: deductions.healthInsuranceParents ?? 0,
      preventiveHealthCheckup: 0,
      isSelfSenior: deductions.isSelfSeniorCitizen ?? false,
      isParentsSenior: deductions.isParentSeniorCitizen ?? false,
    },
    section80E: {
      educationLoanInterest: deductions.educationLoanInterest ?? 0,
    },
    section80G: {
      donations: deductions.donations ?? 0,
    },
    hra: {
      rentPaid: deductions.rentPaid ?? 0,
      isMetro: deductions.isMetroCity ?? false,
      // basicSalary deliberately omitted — engine uses IncomeData.salary.basicSalary
    },
    section16: {
      // Mirror professionalTax from salary income for the Section 16(iii) deduction
      professionalTax: salaryIncome.professionalTax ?? 0,
    },
  };
}

/**
 * Map personal info form data → PersonalInfo for the tax engine.
 *
 * Key transformations:
 * - Normalises DOB from DD/MM/YYYY (form display format) to ISO 8601 (YYYY-MM-DD)
 * - Computes age at 31 March of the filing year (per IT Act)
 * - Sets isSeniorCitizen (age >= 60) and isSuperSeniorCitizen (age >= 80)
 *
 * @param personalInfo  Form data from PersonalInfoForm
 * @param financialYear e.g. 'FY2025-26'
 */
export function toPersonalInfo(
  personalInfo: Partial<PersonalInfoFormData>,
  financialYear: string,
): PersonalInfo {
  const dob = personalInfo.dob ?? '';
  const endYear = filingYearEnd(financialYear);
  const age = computeAgeAt31March(dob, endYear);

  return {
    pan: personalInfo.pan ?? '',
    name: personalInfo.fullName ?? '',
    dateOfBirth: toISO8601(dob),
    age,
    isSeniorCitizen: age >= 60,
    isSuperSeniorCitizen: age >= 80,
    // Default to 'resident'; NRI/RNOR support deferred per design doc
    residentialStatus: 'resident',
  };
}

/**
 * Compute total TDS deducted across all four quarters.
 *
 * Returns 0 when no salary income data is available.
 */
export function computeTdsDeducted(salaryIncome: Partial<SalaryIncomeFormData>): number {
  return (
    (salaryIncome.tdsQ1 ?? 0) +
    (salaryIncome.tdsQ2 ?? 0) +
    (salaryIncome.tdsQ3 ?? 0) +
    (salaryIncome.tdsQ4 ?? 0)
  );
}
