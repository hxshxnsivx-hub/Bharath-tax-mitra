/**
 * Build calculator inputs (IncomeData / DeductionData) from wizard form state.
 *
 * Moved out of MainApp.tsx (OPT-P1.2 lint pass) so the page file only exports
 * components — required for Vite fast-refresh (react-refresh/only-export-components).
 *
 * NOTE: these helpers overlap with `formDataMapper.toIncomeData/toDeductionData`;
 * consolidating the two is tracked under OPT-A2 (single source of truth).
 */

import type {
  SalaryIncomeFormData,
  DeductionFormData,
  BusinessInfoFormData,
} from '../../../shared/types/form-data';
import type { IncomeData, DeductionData } from '../../../shared/types/tax-calculation';

export function buildIncomeData(
  salary: Partial<SalaryIncomeFormData> | null | undefined,
  business?: Partial<BusinessInfoFormData> | null,
): IncomeData {
  return {
    salary: {
      grossSalary: salary?.grossSalary || 0,
      basicSalary: salary?.basicSalary || 0,        // required for HRA + senior slab
      hraReceived: salary?.hraReceived || 0,
      specialAllowance: salary?.specialAllowance || 0,
      otherAllowances: salary?.otherAllowances || 0,
      professionalTax: salary?.professionalTax || 0, // Section 16 deduction (NOT subtracted from gross)
    },
    otherSources: {
      interestIncome: salary?.interestIncome || 0,
      dividendIncome: 0,
      other: 0,
    },
    businessIncome: business
      ? {
          grossReceipts: (business.grossReceiptsDigital || 0) + (business.grossReceiptsCash || 0),
          digitalReceipts: business.grossReceiptsDigital || 0,
          cashReceipts: business.grossReceiptsCash || 0,
          expenses: 0,
        }
      : undefined,
  };
}

export function buildDeductionData(
  deductions: Partial<DeductionFormData> | null | undefined,
  salary?: Partial<SalaryIncomeFormData> | null,
): DeductionData {
  const profTax = salary?.professionalTax || 0;
  const empty: DeductionData = {
    section80C: { lic: 0, ppf: 0, elss: 0, nsc: 0, homeLoanPrincipal: 0, tuitionFees: 0, sukanyaSamriddhi: 0, other: 0 },
    section80CCD1B: { npsAdditional: 0 },
    section80D: { selfPremium: 0, parentsPremium: 0, preventiveHealthCheckup: 0, isSelfSenior: false, isParentsSenior: false },
    section80E: { educationLoanInterest: 0 },
    section80G: { donations: 0 },
    hra: { rentPaid: 0, isMetro: false },               // basicSalary removed — sourced from IncomeData
    section16: { professionalTax: profTax },
  };

  if (!deductions) return empty;

  return {
    section80C: {
      lic: deductions.lic || 0,
      ppf: deductions.ppf || 0,
      elss: deductions.elss || 0,
      nsc: deductions.nsc || 0,
      homeLoanPrincipal: deductions.homeLoanPrincipal || 0,
      tuitionFees: deductions.tuitionFees || 0,
      sukanyaSamriddhi: deductions.sukanyaSamriddhi || 0,
      other: deductions.other80C || 0,
    },
    section80CCD1B: { npsAdditional: deductions.npsAdditional || 0 },
    section80D: {
      selfPremium: deductions.healthInsuranceSelf || 0,
      parentsPremium: deductions.healthInsuranceParents || 0,
      preventiveHealthCheckup: deductions.preventiveHealthCheckup || 0,
      isSelfSenior: deductions.isSelfSeniorCitizen || false,
      isParentsSenior: deductions.isParentSeniorCitizen || false,
    },
    section80E: { educationLoanInterest: deductions.educationLoanInterest || 0 },
    section80G: { donations: deductions.donations || 0 },
    hra: {
      rentPaid: deductions.rentPaid || 0,
      isMetro: deductions.isMetroCity || false,         // basicSalary removed — sourced from IncomeData
    },
    section16: { professionalTax: profTax },            // sourced from salary form (design HIGH-2)
  };
}
