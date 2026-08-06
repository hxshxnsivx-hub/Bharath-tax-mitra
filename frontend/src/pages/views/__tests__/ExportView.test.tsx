/**
 * ExportView — end-to-end export UI (tasks 3.2.3 / 3.3.2 / 3.3.3).
 * Proves the view generates a schema-valid ITR JSON, gates on completeness,
 * and wires a real file download.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n/config';
import { OfflineProvider } from '../../../contexts/OfflineContext';
import ExportView from '../ExportView';
import { TaxCalculator } from '../../../services/taxCalculator';
import { defaultTaxRules } from '../../../services/taxRulesService';
import { validateITR1 } from '../../../services/itrValidator';
import type { IncomeData, DeductionData } from '../../../../../shared/types/tax-calculation';

const calc = new TaxCalculator(defaultTaxRules);

function comparison() {
  const income: IncomeData = {
    salary: { grossSalary: 1_200_000, basicSalary: 480_000, hraReceived: 0, specialAllowance: 0, otherAllowances: 0, professionalTax: 0 },
  };
  const deductions: DeductionData = {
    section80C: { lic: 0, ppf: 0, elss: 0, nsc: 0, homeLoanPrincipal: 0, tuitionFees: 0, sukanyaSamriddhi: 0, other: 0 },
    section80CCD1B: { npsAdditional: 0 },
    section80D: { selfPremium: 0, parentsPremium: 0, preventiveHealthCheckup: 0, isSelfSenior: false, isParentsSenior: false },
    section80E: { educationLoanInterest: 0 },
    section80G: { donations: 0 },
    hra: { rentPaid: 0, isMetro: false },
    section16: { professionalTax: 0 },
  };
  return calc.compareRegimes(income, deductions);
}

function renderExport(props: Partial<React.ComponentProps<typeof ExportView>> = {}) {
  const defaults: React.ComponentProps<typeof ExportView> = {
    regimeComparison: comparison(),
    completenessScore: 90,
    personalInfo: { pan: 'abcde1234f', fullName: 'Ravi Sharma', dob: '15/06/1990', address: 'MG Road, Bengaluru, Karnataka - 560001' },
    salary: { grossSalary: 1_200_000, employerName: 'Acme', tdsQ1: 30000 } as never,
    selectedRegime: 'new',
    tdsPaid: 90000,
  };
  return render(
    <I18nextProvider i18n={i18n}>
      <OfflineProvider>
        <ExportView {...defaults} {...props} />
      </OfflineProvider>
    </I18nextProvider>
  );
}

describe('ExportView', () => {
  beforeEach(() => {
    // jsdom lacks URL.createObjectURL / revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('gates export until the return is complete enough', () => {
    renderExport({ completenessScore: 40 });
    expect(screen.getByText(/Complete your filing first/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download ITR JSON/i })).toBeNull();
  });

  it('shows a valid-ready state and the return summary once complete', () => {
    renderExport();
    expect(screen.getByText(/ready to file/i)).toBeInTheDocument();
    expect(screen.getByText('ABCDE1234F')).toBeInTheDocument(); // PAN uppercased in summary
  });

  it('triggers the browser print flow for the PDF summary (OPT-P3.2)', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderExport({ tdsPaid: 0, salary: { grossSalary: 1_200_000, employerName: 'Acme' } as never });
    fireEvent.click(screen.getByRole('button', { name: /Download PDF Summary/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(document.body.classList.contains('printing')).toBe(true);
    document.body.classList.remove('printing');
  });

  it('requires bank details before download when a refund is due (task 3.3.1)', () => {
    // Default persona: ₹90k TDS > tax → refund due → bank form appears, download gated.
    renderExport();
    expect(screen.getByText(/Where should we send your refund/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download ITR JSON/i })).toBeDisabled();
    expect(screen.getByText(/Add bank details to claim your refund/i)).toBeInTheDocument();
  });

  it('downloads a schema-valid ITR JSON with a PAN-stamped filename', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    // jsdom's Blob has no .text(); capture the JSON parts via a constructor spy.
    const parts: string[] = [];
    const OrigBlob = globalThis.Blob;
    class SpyBlob extends OrigBlob {
      constructor(blobParts?: BlobPart[], options?: BlobPropertyBag) {
        super(blobParts, options);
        if (blobParts) parts.push(blobParts.map(String).join(''));
      }
    }
    vi.stubGlobal('Blob', SpyBlob);

    // Tax-owed persona (no TDS) → no refund → no bank gate on download.
    renderExport({ tdsPaid: 0, salary: { grossSalary: 1_200_000, employerName: 'Acme' } as never });
    fireEvent.click(screen.getByRole('button', { name: /Download ITR JSON/i }));

    expect(clickSpy).toHaveBeenCalled();
    expect(screen.getByText('ITR1_ABCDE1234F_AY2025-26.json')).toBeInTheDocument();

    // The downloaded content must itself be a schema-valid ITR-1 payload.
    expect(parts).toHaveLength(1);
    const parsed = JSON.parse(parts[0]);
    expect(validateITR1(parsed).valid).toBe(true);
    expect(parsed.ITR.ITR1.Form_ITR1.PersonalInfo.PAN).toBe('ABCDE1234F');
  });
});
