/**
 * formDataMapper.test.ts
 *
 * Unit tests for the formDataMapper utility.
 * Covers toPersonalInfo (DOB normalisation, age computation, senior citizen flags),
 * toIncomeData, toDeductionData, and computeTdsDeducted.
 *
 * Requirements: 5.1 — Calculator accuracy
 */

import { describe, it, expect } from 'vitest';
import {
  toPersonalInfo,
  toIncomeData,
  toDeductionData,
  computeTdsDeducted,
} from '../formDataMapper';
import type { PersonalInfoFormData, SalaryIncomeFormData, DeductionFormData } from '../../../../shared/types/form-data';

// ---------------------------------------------------------------------------
// toPersonalInfo — age computation & senior citizen flags
// ---------------------------------------------------------------------------

describe('toPersonalInfo', () => {
  const base: Partial<PersonalInfoFormData> = {
    pan: 'ABCDE1234F',
    fullName: 'Test User',
    dob: '01/01/1990',
    address: '123 Main St',
    email: 'test@example.com',
  };

  describe('age at 31 March of filing year', () => {
    it('born 01/04/1965 filing FY2025-26 → age 60, isSeniorCitizen = true', () => {
      // Birthday is 1 April 1965.
      // Assessment date: 31 March 2026.
      // 31 Mar 2026 is BEFORE 1 Apr 2026, so the person has not yet turned 61 → age = 60.
      const result = toPersonalInfo({ ...base, dob: '01/04/1965' }, 'FY2025-26');
      expect(result.age).toBe(60);
      expect(result.isSeniorCitizen).toBe(true);
      expect(result.isSuperSeniorCitizen).toBe(false);
    });

    it('born 01/04/1945 filing FY2025-26 → age 80, isSuperSeniorCitizen = true', () => {
      const result = toPersonalInfo({ ...base, dob: '01/04/1945' }, 'FY2025-26');
      expect(result.age).toBe(80);
      expect(result.isSeniorCitizen).toBe(true);
      expect(result.isSuperSeniorCitizen).toBe(true);
    });

    it('born 01/04/1985 filing FY2025-26 → age 40, neither senior', () => {
      const result = toPersonalInfo({ ...base, dob: '01/04/1985' }, 'FY2025-26');
      expect(result.age).toBe(40);
      expect(result.isSeniorCitizen).toBe(false);
      expect(result.isSuperSeniorCitizen).toBe(false);
    });

    it('person who turns 60 on 31 March itself is a senior citizen', () => {
      // Born 31/03/1966, assessment at 31 Mar 2026 → exactly 60 years completed
      const result = toPersonalInfo({ ...base, dob: '31/03/1966' }, 'FY2025-26');
      expect(result.age).toBe(60);
      expect(result.isSeniorCitizen).toBe(true);
    });

    it('person who turns 60 on 01 April is NOT yet senior at 31 March', () => {
      // Born 01/04/1966, at 31 Mar 2026 they are still 59
      const result = toPersonalInfo({ ...base, dob: '01/04/1966' }, 'FY2025-26');
      expect(result.age).toBe(59);
      expect(result.isSeniorCitizen).toBe(false);
    });
  });

  describe('DOB normalisation to ISO 8601', () => {
    it('15/08/1980 → dateOfBirth "1980-08-15"', () => {
      const result = toPersonalInfo({ ...base, dob: '15/08/1980' }, 'FY2025-26');
      expect(result.dateOfBirth).toBe('1980-08-15');
    });

    it('single-digit day/month are zero-padded', () => {
      const result = toPersonalInfo({ ...base, dob: '01/01/1990' }, 'FY2025-26');
      expect(result.dateOfBirth).toBe('1990-01-01');
    });
  });

  describe('field mapping', () => {
    it('maps pan and fullName correctly', () => {
      const result = toPersonalInfo(
        { pan: 'XYZAB9876Z', fullName: 'Ramesh Kumar', dob: '01/07/1980', address: '', email: '' },
        'FY2025-26',
      );
      expect(result.pan).toBe('XYZAB9876Z');
      expect(result.name).toBe('Ramesh Kumar');
    });

    it('defaults residentialStatus to "resident"', () => {
      const result = toPersonalInfo({ ...base, dob: '01/01/1990' }, 'FY2025-26');
      expect(result.residentialStatus).toBe('resident');
    });
  });

  describe('different financial years', () => {
    it('FY2024-25 assesses age at 31 March 2025', () => {
      // Born 01/04/1965 → at 31 Mar 2025 still 59
      const result = toPersonalInfo({ ...base, dob: '01/04/1965' }, 'FY2024-25');
      expect(result.age).toBe(59);
      expect(result.isSeniorCitizen).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// toIncomeData
// ---------------------------------------------------------------------------

describe('toIncomeData', () => {
  it('maps grossSalary and hraReceived to salary income correctly', () => {
    const salary: Partial<SalaryIncomeFormData> = {
      grossSalary: 500000,
      hraReceived: 120000,
      specialAllowance: 50000,
      otherAllowances: 10000,
      professionalTax: 2400,
    };
    const result = toIncomeData(salary);
    expect(result.salary.grossSalary).toBe(500000);
    expect(result.salary.hraReceived).toBe(120000);
    expect(result.salary.specialAllowance).toBe(50000);
    expect(result.salary.otherAllowances).toBe(10000);
    expect(result.salary.professionalTax).toBe(2400);
  });

  it('has no businessIncome when businessInfo is omitted', () => {
    const result = toIncomeData({ grossSalary: 300000 });
    expect(result.businessIncome).toBeUndefined();
  });

  it('maps businessInfo to businessIncome with correct totals', () => {
    const result = toIncomeData(
      { grossSalary: 200000 },
      { grossReceiptsDigital: 800000, grossReceiptsCash: 200000 },
    );
    expect(result.businessIncome).toBeDefined();
    expect(result.businessIncome!.grossReceipts).toBe(1000000);
    expect(result.businessIncome!.digitalReceipts).toBe(800000);
    expect(result.businessIncome!.cashReceipts).toBe(200000);
  });

  it('defaults all salary fields to 0 when form data is empty', () => {
    const result = toIncomeData({});
    expect(result.salary.grossSalary).toBe(0);
    expect(result.salary.hraReceived).toBe(0);
    expect(result.salary.specialAllowance).toBe(0);
    expect(result.salary.otherAllowances).toBe(0);
    expect(result.salary.professionalTax).toBe(0);
    expect(result.salary.basicSalary).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// toDeductionData
// ---------------------------------------------------------------------------

describe('toDeductionData', () => {
  it('maps rentPaid through hra output', () => {
    const deductions: Partial<DeductionFormData> = {
      rentPaid: 180000,
      isMetroCity: true,
    };
    const result = toDeductionData(deductions, {});
    expect(result.hra.rentPaid).toBe(180000);
    expect(result.hra.isMetro).toBe(true);
  });

  it('basicSalary is NOT present in hra output', () => {
    const deductions: Partial<DeductionFormData> = {
      rentPaid: 120000,
      isMetroCity: false,
    };
    const result = toDeductionData(deductions, { grossSalary: 600000 });
    // The hra object must not carry basicSalary — it's sourced from IncomeData by the engine
    expect('basicSalary' in result.hra).toBe(false);
  });

  it('maps section 80C fields correctly', () => {
    const deductions: Partial<DeductionFormData> = {
      lic: 20000,
      ppf: 50000,
      elss: 30000,
      nsc: 10000,
      homeLoanPrincipal: 40000,
    };
    const result = toDeductionData(deductions, {});
    expect(result.section80C.lic).toBe(20000);
    expect(result.section80C.ppf).toBe(50000);
    expect(result.section80C.elss).toBe(30000);
    expect(result.section80C.nsc).toBe(10000);
    expect(result.section80C.homeLoanPrincipal).toBe(40000);
    // Unmapped fields default to 0
    expect(result.section80C.tuitionFees).toBe(0);
    expect(result.section80C.sukanyaSamriddhi).toBe(0);
  });

  it('maps npsAdditional to section80CCD1B', () => {
    const result = toDeductionData({ npsAdditional: 50000 }, {});
    expect(result.section80CCD1B.npsAdditional).toBe(50000);
  });

  it('maps health insurance fields to section80D', () => {
    const result = toDeductionData(
      {
        healthInsuranceSelf: 25000,
        healthInsuranceParents: 50000,
        isSelfSeniorCitizen: false,
        isParentSeniorCitizen: true,
      },
      {},
    );
    expect(result.section80D.selfPremium).toBe(25000);
    expect(result.section80D.parentsPremium).toBe(50000);
    expect(result.section80D.isSelfSenior).toBe(false);
    expect(result.section80D.isParentsSenior).toBe(true);
  });

  it('mirrors professionalTax from salaryIncome to section16', () => {
    const result = toDeductionData({}, { professionalTax: 2400 });
    expect(result.section16.professionalTax).toBe(2400);
  });

  it('maps educationLoanInterest to section80E', () => {
    const result = toDeductionData({ educationLoanInterest: 60000 }, {});
    expect(result.section80E.educationLoanInterest).toBe(60000);
  });

  it('maps donations to section80G', () => {
    const result = toDeductionData({ donations: 10000 }, {});
    expect(result.section80G.donations).toBe(10000);
  });

  it('defaults all deduction fields to 0 when form data is empty', () => {
    const result = toDeductionData({}, {});
    expect(result.section80C.lic).toBe(0);
    expect(result.section80CCD1B.npsAdditional).toBe(0);
    expect(result.section80D.selfPremium).toBe(0);
    expect(result.section80E.educationLoanInterest).toBe(0);
    expect(result.section80G.donations).toBe(0);
    expect(result.hra.rentPaid).toBe(0);
    expect(result.section16.professionalTax).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeTdsDeducted
// ---------------------------------------------------------------------------

describe('computeTdsDeducted', () => {
  it('sums all four quarters correctly', () => {
    const salary: Partial<SalaryIncomeFormData> = {
      tdsQ1: 10000,
      tdsQ2: 15000,
      tdsQ3: 12000,
      tdsQ4: 8000,
    };
    expect(computeTdsDeducted(salary)).toBe(45000);
  });

  it('returns 0 when no TDS data is provided', () => {
    expect(computeTdsDeducted({})).toBe(0);
  });

  it('handles partial quarters (only some non-zero)', () => {
    expect(computeTdsDeducted({ tdsQ1: 5000 })).toBe(5000);
    expect(computeTdsDeducted({ tdsQ1: 0, tdsQ2: 0, tdsQ3: 20000, tdsQ4: 0 })).toBe(20000);
  });
});
