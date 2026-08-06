/**
 * Cross-field validation & anomaly detection (tasks 3.1.1 / 3.1.2).
 */

import { describe, it, expect } from 'vitest';
import { validateCrossFields, detectAnomalies, type TaxDataForValidation } from '../taxValidation';
import { defaultTaxRules } from '../../services/taxRulesService';
import type { SalaryIncomeFormData, DeductionFormData } from '../../../../shared/types/form-data';

function salary(over: Partial<SalaryIncomeFormData> = {}): SalaryIncomeFormData {
  return {
    grossSalary: 0, basicSalary: 0, hraReceived: 0, specialAllowance: 0, otherAllowances: 0,
    standardDeduction: 50000, professionalTax: 0, otherDeductions: 0,
    tdsQ1: 0, tdsQ2: 0, tdsQ3: 0, tdsQ4: 0, employerTAN: '', employerName: '',
    ...over,
  };
}

function deductions(over: Partial<DeductionFormData> = {}): DeductionFormData {
  return {
    lic: 0, ppf: 0, elss: 0, nsc: 0, homeLoanPrincipal: 0,
    healthInsuranceSelf: 0, healthInsuranceParents: 0,
    isSelfSeniorCitizen: false, isParentSeniorCitizen: false,
    rentPaid: 0, landlordPAN: '', isMetroCity: false,
    npsAdditional: 0, donations: 0, educationLoanInterest: 0,
    ...over,
  };
}

function data(over: Partial<TaxDataForValidation> = {}): TaxDataForValidation {
  return { personalInfo: {}, salary: null, deductions: null, business: null, ...over };
}

describe('validateCrossFields (3.1.1)', () => {
  it('flags rent paid with no HRA received', () => {
    const issues = validateCrossFields(
      data({ salary: salary({ grossSalary: 600000, hraReceived: 0 }), deductions: deductions({ rentPaid: 120000 }) }),
      defaultTaxRules
    );
    expect(issues.map((i) => i.id)).toContain('hra-without-received');
  });

  it('requires landlord PAN when rent exceeds ₹1L/year', () => {
    const issues = validateCrossFields(
      data({ salary: salary({ hraReceived: 200000 }), deductions: deductions({ rentPaid: 150000, landlordPAN: '' }) }),
      defaultTaxRules
    );
    expect(issues.map((i) => i.id)).toContain('landlord-pan-required');
  });

  it('does not require landlord PAN when rent is under ₹1L/year', () => {
    const issues = validateCrossFields(
      data({ salary: salary({ hraReceived: 50000 }), deductions: deductions({ rentPaid: 90000, landlordPAN: '' }) }),
      defaultTaxRules
    );
    expect(issues.map((i) => i.id)).not.toContain('landlord-pan-required');
  });

  it('flags TDS exceeding gross salary', () => {
    const issues = validateCrossFields(
      data({ salary: salary({ grossSalary: 500000, tdsQ1: 200000, tdsQ2: 200000, tdsQ3: 200000, tdsQ4: 0 }) }),
      defaultTaxRules
    );
    expect(issues.map((i) => i.id)).toContain('tds-exceeds-salary');
  });

  it('flags Section 80C total over the statutory cap', () => {
    const issues = validateCrossFields(
      data({ deductions: deductions({ ppf: 100000, elss: 100000 }) }), // 200000 > 150000 cap
      defaultTaxRules
    );
    expect(issues.map((i) => i.id)).toContain('80c-exceeds-limit');
  });

  it('applies the senior-citizen 80D cap, not the standard one', () => {
    const standard = validateCrossFields(
      data({ deductions: deductions({ healthInsuranceSelf: 30000, isSelfSeniorCitizen: false }) }),
      defaultTaxRules
    );
    expect(standard.map((i) => i.id)).toContain('80d-self-exceeds-limit'); // 30k > 25k standard cap

    const senior = validateCrossFields(
      data({ deductions: deductions({ healthInsuranceSelf: 30000, isSelfSeniorCitizen: true }) }),
      defaultTaxRules
    );
    expect(senior.map((i) => i.id)).not.toContain('80d-self-exceeds-limit'); // 30k < 50k senior cap
  });

  it('flags total deductions exceeding gross total income', () => {
    const issues = validateCrossFields(
      data({
        salary: salary({ grossSalary: 100000 }),
        deductions: deductions({ ppf: 150000 }), // deductions > income
      }),
      defaultTaxRules
    );
    expect(issues.map((i) => i.id)).toContain('deductions-exceed-income');
  });

  it('returns no issues for a clean, well-formed return', () => {
    const issues = validateCrossFields(
      data({
        salary: salary({ grossSalary: 1200000, basicSalary: 480000, hraReceived: 100000, tdsQ1: 20000 }),
        deductions: deductions({ ppf: 100000, healthInsuranceSelf: 20000, rentPaid: 60000 }),
      }),
      defaultTaxRules
    );
    expect(issues).toEqual([]);
  });
});

describe('detectAnomalies (3.1.2)', () => {
  it('flags TDS above 50% of gross salary', () => {
    const anomalies = detectAnomalies(
      data({ salary: salary({ grossSalary: 400000, tdsQ1: 250000 }) })
    );
    expect(anomalies.map((a) => a.id)).toContain('high-tds-ratio');
  });

  it('flags HRA above 50% of basic salary', () => {
    const anomalies = detectAnomalies(
      data({ salary: salary({ basicSalary: 200000, hraReceived: 150000 }) })
    );
    expect(anomalies.map((a) => a.id)).toContain('high-hra-ratio');
  });

  it('returns no anomalies for typical, well-proportioned figures', () => {
    const anomalies = detectAnomalies(
      data({ salary: salary({ grossSalary: 1200000, basicSalary: 480000, hraReceived: 100000, tdsQ1: 20000, tdsQ2: 20000 }) })
    );
    expect(anomalies).toEqual([]);
  });

  it('returns no anomalies when salary has not been entered yet', () => {
    expect(detectAnomalies(data())).toEqual([]);
  });
});
