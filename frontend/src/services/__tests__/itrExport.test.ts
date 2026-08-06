/**
 * ITR-1 export: generator + validator (tasks 3.2.1 / 3.2.2 / OPT-P3.1).
 *
 * Proves the generated JSON conforms to the schema of record, that tax figures
 * are carried faithfully from the engine result, and that validation surfaces
 * field-path errors (Req 17).
 */

import { describe, it, expect } from 'vitest';
import { TaxCalculator } from '../taxCalculator';
import { defaultTaxRules } from '../taxRulesService';
import { buildITR1, splitName, type ITRExportInput } from '../itrExport';
import { validateITR1 } from '../itrValidator';
import type { IncomeData, DeductionData } from '../../../../shared/types/tax-calculation';

const calc = new TaxCalculator(defaultTaxRules);

function baseInput(): ITRExportInput {
  const income: IncomeData = {
    salary: {
      grossSalary: 1_200_000, basicSalary: 480_000, hraReceived: 200_000,
      specialAllowance: 0, otherAllowances: 0, professionalTax: 2_400,
    },
    otherSources: { interestIncome: 15_000, dividendIncome: 0, other: 0 },
  };
  const deductions: DeductionData = {
    section80C: { lic: 0, ppf: 100_000, elss: 0, nsc: 0, homeLoanPrincipal: 0, tuitionFees: 0, sukanyaSamriddhi: 0, other: 0 },
    section80CCD1B: { npsAdditional: 0 },
    section80D: { selfPremium: 25_000, parentsPremium: 0, preventiveHealthCheckup: 0, isSelfSenior: false, isParentsSenior: false },
    section80E: { educationLoanInterest: 0 },
    section80G: { donations: 0 },
    hra: { rentPaid: 240_000, isMetro: true },
    section16: { professionalTax: 2_400 },
  };
  const comparison = calc.compareRegimes(income, deductions);
  const result = comparison[comparison.recommendedRegime === 'old' ? 'oldRegime' : 'newRegime'];

  return {
    personalInfo: { pan: 'abcde1234f', fullName: 'Ravi Kumar Sharma', dob: '15/06/1990', aadhaar: '1234-5678-7676', address: 'MG Road, Bengaluru, Karnataka - 560001' },
    salary: { grossSalary: 1_200_000, employerName: 'Acme Technologies Pvt Ltd', employerTAN: 'BLRA12345E' },
    result,
    tdsPaid: 90_000,
  };
}

describe('splitName', () => {
  it('handles 1/2/3+ word names and always yields a surname', () => {
    expect(splitName('Ravi')).toEqual({ FirstName: 'Ravi', SurName: 'Ravi' });
    expect(splitName('Ravi Sharma')).toEqual({ FirstName: 'Ravi', SurName: 'Sharma' });
    expect(splitName('Ravi Kumar Sharma')).toEqual({ FirstName: 'Ravi', MiddleName: 'Kumar', SurName: 'Sharma' });
    expect(splitName('A B C D')).toEqual({ FirstName: 'A', MiddleName: 'B C', SurName: 'D' });
  });
});

describe('buildITR1 + validateITR1', () => {
  it('generates schema-valid ITR-1 JSON', () => {
    const itr = buildITR1(baseInput());
    const { valid, errors } = validateITR1(itr);
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });

  it('carries engine tax figures faithfully and uppercases/normalises PII', () => {
    const input = baseInput();
    const itr = buildITR1(input).ITR.ITR1.Form_ITR1;
    expect(itr.PersonalInfo.PAN).toBe('ABCDE1234F'); // uppercased
    expect(itr.PersonalInfo.DOB).toBe('1990-06-15'); // DD/MM/YYYY → ISO
    expect(itr.PersonalInfo.AadhaarCardNo).toBe('123456787676'); // dashes stripped
    expect(itr.PersonalInfo.Name).toEqual({ FirstName: 'Ravi', MiddleName: 'Kumar', SurName: 'Sharma' });
    expect(itr.TaxComputation.GrossTaxLiability).toBe(input.result.totalTaxLiability);
    expect(itr.TaxComputation.Rebate87A).toBe(input.result.rebate87A);
    expect(itr.TaxComputation.EducationCess).toBe(input.result.cess);
    expect(itr.ITR1_IncomeDeductions.TotalIncomeAfterDeductions).toBe(input.result.taxableIncome);
  });

  it('computes refund/liability from taxes paid and includes bank details when refund due', () => {
    const input = baseInput();
    input.tdsPaid = 250_000; // overpaid → refund expected
    input.bank = { ifsc: 'hdfc0001234', bankName: 'HDFC Bank', accountNo: '50100123456789' };
    const form = buildITR1(input).ITR.ITR1.Form_ITR1;
    expect(form.Refund?.RefundDue).toBeGreaterThan(0);
    expect(form.Refund?.BankAccountDtls?.IFSCCode).toBe('HDFC0001234');
    const { valid } = validateITR1(buildITR1(input));
    expect(valid).toBe(true);
  });

  it('flags an invalid PAN with a field-path error (Req 17)', () => {
    const input = baseInput();
    input.personalInfo = { ...input.personalInfo, pan: 'NOTAPAN' };
    const { valid, errors } = validateITR1(buildITR1(input));
    expect(valid).toBe(false);
    expect(errors.some((e) => e.path.includes('PAN'))).toBe(true);
  });
});
