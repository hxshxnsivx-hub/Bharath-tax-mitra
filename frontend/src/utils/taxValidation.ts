/**
 * Cross-field validation & anomaly detection (tasks 3.1.1 / 3.1.2).
 *
 * Pure functions over the wizard's TaxDataState — no React, no side effects.
 * Two distinct outputs:
 *   - ValidationIssue[]  — blocking-severity data problems (3.1.1): the
 *     calculator already clamps these internally (e.g. Math.min against the
 *     80C cap), so without this layer the user never learns *why* a figure
 *     they entered didn't move their tax.
 *   - Anomaly[]          — dismissable warnings (3.1.2), require explicit
 *     user override before proceeding (Req 12.1-12.8).
 *
 * Scope note: anomalies 2 (Form-16 vs AIS), 4 (missing AIS interest), and 6
 * (prior-year variation) are NOT implemented — they need document extraction
 * (Phase 2, not built) or persisted prior-year sessions (not built). Anomaly 3
 * ("duplicate income entries") doesn't apply to this single-entry wizard flow
 * without multi-document ingestion. Implementing them now would mean faking
 * a check against data that doesn't exist. Anomalies 1 and 5 are implemented
 * for real, against data the wizard actually collects.
 */

import type {
  PersonalInfoFormData,
  SalaryIncomeFormData,
  DeductionFormData,
  BusinessInfoFormData,
} from '../../../shared/types/form-data';
import type { TaxRules } from '../../../shared/types/tax-rules';

export interface TaxDataForValidation {
  personalInfo: Partial<PersonalInfoFormData>;
  salary: SalaryIncomeFormData | null;
  deductions: DeductionFormData | null;
  business: BusinessInfoFormData | null;
}

export interface ValidationIssue {
  id: string;
  /** Dot-path into the relevant form section, for field highlighting. */
  field: string;
  messageKey: string;
  /**
   * i18next fallback text via t(messageKey, {defaultValue}). For messages
   * with a runtime-computed rupee amount baked in (the 80C/80D cap checks
   * below), do NOT add a matching key to the locale files — a real key match
   * wins over defaultValue and would render a static string that's lost the
   * actual number. Leave those keys unset so they always fall back to this
   * dynamic text; only add locale keys for messages with no embedded numbers.
   */
  defaultMessage: string;
}

export interface Anomaly {
  id: string;
  messageKey: string;
  defaultMessage: string;
}

function sumTds(s: SalaryIncomeFormData): number {
  return (s.tdsQ1 || 0) + (s.tdsQ2 || 0) + (s.tdsQ3 || 0) + (s.tdsQ4 || 0);
}

function sum80C(d: DeductionFormData): number {
  return (
    (d.lic || 0) +
    (d.ppf || 0) +
    (d.elss || 0) +
    (d.nsc || 0) +
    (d.homeLoanPrincipal || 0) +
    (d.tuitionFees || 0) +
    (d.sukanyaSamriddhi || 0) +
    (d.other80C || 0)
  );
}

/**
 * 3.1.1 — Cross-field validation rules.
 * Every rule here checks something the calculator silently clamps, so the
 * user understands why a number they entered didn't fully count.
 */
export function validateCrossFields(
  data: TaxDataForValidation,
  rules: TaxRules
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { salary, deductions, business } = data;

  // HRA vs Rent: exemption via rent paid requires HRA actually received.
  if (deductions && deductions.rentPaid > 0 && (!salary || (salary.hraReceived || 0) === 0)) {
    issues.push({
      id: 'hra-without-received',
      field: 'deductions.rentPaid',
      messageKey: 'validation.hraWithoutReceived',
      defaultMessage: 'Rent paid is entered but no HRA was received in salary — HRA exemption cannot be claimed.',
    });
  }

  // Landlord PAN required when rent > ₹1L/year (IT Act requirement).
  if (deductions && deductions.rentPaid > 100_000 && !deductions.landlordPAN?.trim()) {
    issues.push({
      id: 'landlord-pan-required',
      field: 'deductions.landlordPAN',
      messageKey: 'validation.landlordPanRequired',
      defaultMessage: "Rent paid exceeds ₹1,00,000/year — landlord's PAN is required.",
    });
  }

  if (salary) {
    // TDS vs Salary: cannot exceed gross salary.
    const tds = sumTds(salary);
    if (tds > (salary.grossSalary || 0) && salary.grossSalary > 0) {
      issues.push({
        id: 'tds-exceeds-salary',
        field: 'salary.tdsQ1',
        messageKey: 'validation.tdsExceedsSalary',
        defaultMessage: 'Total TDS across quarters exceeds gross salary — please check the quarterly figures.',
      });
    }
  }

  if (deductions) {
    // 80C limit: flag when the user entered more than the statutory cap.
    const total80C = sum80C(deductions);
    const cap80C = rules.oldRegime.deductions.section80C.limit;
    if (total80C > cap80C) {
      issues.push({
        id: '80c-exceeds-limit',
        field: 'deductions.lic',
        messageKey: 'validation.section80CExceeded',
        defaultMessage: `Section 80C total (₹${total80C.toLocaleString('en-IN')}) exceeds the ₹${cap80C.toLocaleString('en-IN')} cap — only the cap will be applied.`,
      });
    }

    // 80D limits: self and parents checked against their own (senior-aware) caps.
    const selfCap = deductions.isSelfSeniorCitizen
      ? rules.oldRegime.deductions.section80D.selfSenior
      : rules.oldRegime.deductions.section80D.self;
    if ((deductions.healthInsuranceSelf || 0) > selfCap) {
      issues.push({
        id: '80d-self-exceeds-limit',
        field: 'deductions.healthInsuranceSelf',
        messageKey: 'validation.section80DSelfExceeded',
        defaultMessage: `Self health insurance premium exceeds the ₹${selfCap.toLocaleString('en-IN')} limit — only the cap will be applied.`,
      });
    }
    const parentsCap = deductions.isParentSeniorCitizen
      ? rules.oldRegime.deductions.section80D.parentsSenior
      : rules.oldRegime.deductions.section80D.parents;
    if ((deductions.healthInsuranceParents || 0) > parentsCap) {
      issues.push({
        id: '80d-parents-exceeds-limit',
        field: 'deductions.healthInsuranceParents',
        messageKey: 'validation.section80DParentsExceeded',
        defaultMessage: `Parents' health insurance premium exceeds the ₹${parentsCap.toLocaleString('en-IN')} limit — only the cap will be applied.`,
      });
    }
  }

  // Deductions vs Income: total claimed deductions should not swamp income —
  // a strong signal of a data-entry mistake (e.g. an extra zero).
  if (salary && deductions) {
    const totalIncome =
      (salary.grossSalary || 0) + (business?.presumptiveIncome || 0);
    const totalDeductionsClaimed =
      sum80C(deductions) +
      (deductions.npsAdditional || 0) +
      (deductions.healthInsuranceSelf || 0) +
      (deductions.healthInsuranceParents || 0) +
      (deductions.educationLoanInterest || 0) +
      (deductions.donations || 0);
    if (totalIncome > 0 && totalDeductionsClaimed > totalIncome) {
      issues.push({
        id: 'deductions-exceed-income',
        field: 'deductions',
        messageKey: 'validation.deductionsExceedIncome',
        defaultMessage: 'Total deductions claimed exceed your gross total income — please review the entered amounts.',
      });
    }
  }

  return issues;
}

/**
 * 3.1.2 — Anomaly detection. Dismissable: the caller tracks acknowledged IDs
 * and re-shows anything not yet confirmed (Req: explicit override).
 */
export function detectAnomalies(data: TaxDataForValidation): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const { salary } = data;
  if (!salary) return anomalies;

  // Anomaly 1: TDS > 50% of salary.
  const tds = sumTds(salary);
  if (salary.grossSalary > 0 && tds > salary.grossSalary * 0.5) {
    anomalies.push({
      id: 'high-tds-ratio',
      messageKey: 'anomaly.highTds',
      defaultMessage: 'TDS deducted is more than 50% of your gross salary — this is unusually high. Please verify the quarterly TDS figures.',
    });
  }

  // Anomaly 5: HRA > 50% of basic salary.
  if (salary.basicSalary > 0 && (salary.hraReceived || 0) > salary.basicSalary * 0.5) {
    anomalies.push({
      id: 'high-hra-ratio',
      messageKey: 'anomaly.highHra',
      defaultMessage: 'HRA received is more than 50% of your basic salary — this is unusually high. Please verify with your Form-16.',
    });
  }

  return anomalies;
}
