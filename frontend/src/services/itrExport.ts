/**
 * ITR-1 JSON generator (task 3.2.1).
 *
 * Maps the app's internal filing data to the IT-Portal ITR-1 JSON shape
 * (shared/schemas/itr1-fy2025-26.schema.json). Tax figures come straight from
 * the pinned engine result (TaxCalculationResult) — this layer only reshapes,
 * it never re-derives tax. Runs fully client-side (offline export, Req 8.6).
 */

import type { ITR1Export, ITR1SalaryDtl } from '../../../shared/types/itr';
import type { PersonalInfoFormData, SalaryIncomeFormData } from '../../../shared/types/form-data';
import type { TaxCalculationResult } from '../../../shared/types/tax-calculation';

const SW_VERSION = '1.0.0';
const SW_NAME = 'BharatTaxMitra';

export interface BankDetails {
  ifsc: string;
  bankName?: string;
  accountNo: string;
}

export interface ITRExportInput {
  personalInfo: Partial<PersonalInfoFormData>;
  salary: Partial<SalaryIncomeFormData>;
  /** The chosen regime's computed result (single source of tax figures). */
  result: TaxCalculationResult;
  /** Total TDS already deducted (sum across quarters). */
  tdsPaid: number;
  advanceTax?: number;
  selfAssessmentTax?: number;
  /** Bank details required only when a refund is due. */
  bank?: BankDetails;
  /** ISO date the JSON is created; defaults to today. */
  creationDate?: string;
}

/** Split a display name into First / Middle / Surname (IT Portal requires a surname). */
export function splitName(fullName: string): { FirstName: string; MiddleName?: string; SurName: string } {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { FirstName: '', SurName: '' };
  if (parts.length === 1) return { FirstName: parts[0], SurName: parts[0] };
  if (parts.length === 2) return { FirstName: parts[0], SurName: parts[1] };
  return { FirstName: parts[0], MiddleName: parts.slice(1, -1).join(' '), SurName: parts[parts.length - 1] };
}

/** Parse "line, city, State - 560001" style address into components; best-effort. */
function parseAddress(address: string | undefined) {
  const pin = (address ?? '').match(/\b(\d{6})\b/)?.[1] ?? '';
  return {
    LocalityOrArea: (address ?? '').split(',')[0]?.trim() || undefined,
    CityOrTownOrDistrict: (address ?? '').split(',')[1]?.trim() || 'NA',
    StateCode: (address ?? '').split(',')[2]?.replace(/\d|-/g, '').trim() || 'NA',
    PinCode: pin || '000000',
    CountryCode: '91' as const,
  };
}

function round(n: number): number {
  return Math.max(0, Math.round(n || 0));
}

export function buildITR1(input: ITRExportInput): ITR1Export {
  const { personalInfo: p, salary: s, result, tdsPaid } = input;
  const advanceTax = round(input.advanceTax ?? 0);
  const selfAssessmentTax = round(input.selfAssessmentTax ?? 0);
  const totalTaxesPaid = round(tdsPaid) + advanceTax + selfAssessmentTax;

  // Salary block — figures reconcile with result.deductionBreakdown.
  const grossSalary = round(s.grossSalary ?? result.incomeBreakdown.salary);
  const standardDeduction = round(result.deductionBreakdown.standardDeduction);
  const taxOnEmployment = round(result.deductionBreakdown.professionalTax);
  const netSalary = Math.max(0, grossSalary - standardDeduction - taxOnEmployment);

  const salaryDtl: ITR1SalaryDtl = {
    EmployerName: s.employerName || 'NA',
    TAN: s.employerTAN || undefined,
    GrossSalary: grossSalary,
    Allowances: round((s.hraReceived ?? 0) + (s.specialAllowance ?? 0) + (s.otherAllowances ?? 0)),
    PerquisitesValue: 0,
    ProfitsInLieuOfSalary: 0,
    TotalSalary: grossSalary,
    StandardDeduction: standardDeduction,
    EntertainmentAllowance: 0,
    TaxOnEmployment: taxOnEmployment,
    NetSalary: netSalary,
  };

  // Tax computation — straight from the engine result.
  const taxPayableOnTI = Math.max(0, round(result.taxBeforeSurcharge) - round(result.rebate87A));
  const grossTaxLiability = round(result.totalTaxLiability);
  const refundDue = Math.max(0, totalTaxesPaid - grossTaxLiability);

  const itr: ITR1Export = {
    ITR: {
      ITR1: {
        CreationInfo: {
          SWVersionNo: SW_VERSION,
          SWCreatedBy: SW_NAME,
          JSONCreatedBy: SW_NAME,
          JSONCreationDate: input.creationDate ?? new Date().toISOString().slice(0, 10),
        },
        Form_ITR1: {
          PersonalInfo: {
            AssesseeType: 'Individual',
            PAN: (p.pan || '').toUpperCase(),
            ...(p.aadhaar ? { AadhaarCardNo: p.aadhaar.replace(/\D/g, '') } : {}),
            DOB: toISODate(p.dob),
            Name: splitName(p.fullName ?? ''),
            Address: parseAddress(p.address),
          },
          FilingStatus: {
            ReturnFiledUnderSec: '11',
            SeventhProviso139: 'N',
            OriginalOrRevised: 'O',
          },
          ITR1_IncomeDeductions: {
            Salary: { SalaryDtls: [salaryDtl] },
            TotalIncomeAfterDeductions: round(result.taxableIncome),
          },
          TaxComputation: {
            TotalTaxPayable: grossTaxLiability,
            Rebate87A: round(result.rebate87A),
            TaxPayableOnTI: taxPayableOnTI,
            Surcharge: round(result.surcharge),
            EducationCess: round(result.cess),
            GrossTaxLiability: grossTaxLiability,
            Section89: 0,
            NetTaxLiability: grossTaxLiability,
          },
          TaxPaid: {
            ...(tdsPaid > 0
              ? {
                  TDS: {
                    TDSonSalary: {
                      TDSonSalaryDtls: [
                        { TAN: s.employerTAN || undefined, EmployerName: s.employerName || undefined, TaxDeducted: round(tdsPaid) },
                      ],
                    },
                  },
                }
              : {}),
            AdvanceTax: advanceTax,
            SelfAssessmentTax: selfAssessmentTax,
            TotalTaxesPaid: totalTaxesPaid,
          },
          Refund: {
            RefundDue: refundDue,
            ...(refundDue > 0 && input.bank
              ? {
                  BankAccountDtls: {
                    IFSCCode: input.bank.ifsc.toUpperCase(),
                    ...(input.bank.bankName ? { BankName: input.bank.bankName } : {}),
                    BankAccountNo: input.bank.accountNo,
                  },
                }
              : {}),
          },
        },
      },
    },
  };

  // Other-sources block (interest/dividend), only if present on the result.
  const os = result.incomeBreakdown.otherSources;
  if (os > 0) {
    itr.ITR.ITR1.Form_ITR1.ITR1_IncomeDeductions.IncomeFromOS = {
      IncOthThanOwnRaceHorse: {
        OthersInc: { OthersIncDtls: [{ SourceDescription: 'Income from Other Sources', IncAmt: round(os) }] },
      },
    };
  }

  return itr;
}

/** Normalise a DD/MM/YYYY or ISO date string to YYYY-MM-DD. */
function toISODate(dob: string | undefined): string {
  if (!dob) return '1900-01-01';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;
  const m = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return dob;
}
