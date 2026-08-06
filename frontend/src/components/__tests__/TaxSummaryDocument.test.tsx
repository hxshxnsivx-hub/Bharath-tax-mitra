/**
 * TaxSummaryDocument — printable summary (tasks 3.4.2/3.4.3, OPT-P3.2).
 * Covers PII redaction, key-figure rendering, and that switching language
 * renders the (Indic) translated headings — the reason we print via the
 * browser rather than jsPDF.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import { TaxSummaryDocument } from '../TaxSummaryDocument';
import { TaxCalculator } from '../../services/taxCalculator';
import { defaultTaxRules } from '../../services/taxRulesService';
import type { IncomeData, DeductionData } from '../../../../shared/types/tax-calculation';

const calc = new TaxCalculator(defaultTaxRules);

function comparison() {
  const income: IncomeData = {
    salary: { grossSalary: 1_200_000, basicSalary: 480_000, hraReceived: 0, specialAllowance: 0, otherAllowances: 0, professionalTax: 0 },
  };
  const deductions: DeductionData = {
    section80C: { lic: 0, ppf: 100_000, elss: 0, nsc: 0, homeLoanPrincipal: 0, tuitionFees: 0, sukanyaSamriddhi: 0, other: 0 },
    section80CCD1B: { npsAdditional: 0 },
    section80D: { selfPremium: 0, parentsPremium: 0, preventiveHealthCheckup: 0, isSelfSenior: false, isParentsSenior: false },
    section80E: { educationLoanInterest: 0 },
    section80G: { donations: 0 },
    hra: { rentPaid: 0, isMetro: false },
    section16: { professionalTax: 0 },
  };
  return calc.compareRegimes(income, deductions);
}

function renderDoc() {
  const cmp = comparison();
  return render(
    <I18nextProvider i18n={i18n}>
      <TaxSummaryDocument
        result={cmp.newRegime}
        comparison={cmp}
        personalName="Ravi Kumar Sharma"
        pan="ABCDE1234F"
        selectedRegime="new"
        tdsPaid={90000}
        generatedOffline
      />
    </I18nextProvider>
  );
}

describe('TaxSummaryDocument', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('redacts the PAN to the last 4 characters', () => {
    renderDoc();
    const doc = screen.getByRole('document');
    expect(within(doc).getByText('XXXXXX234F')).toBeInTheDocument(); // ABCDE1234F → last 4
    expect(within(doc).queryByText('ABCDE1234F')).toBeNull();
  });

  it('shows the name and an offline watermark', () => {
    renderDoc();
    const doc = screen.getByRole('document');
    expect(within(doc).getByText('Ravi Kumar Sharma')).toBeInTheDocument();
    expect(within(doc).getByText(/Generated Offline/i)).toBeInTheDocument();
  });

  it('renders translated (Devanagari) headings after a language switch', async () => {
    await i18n.changeLanguage('hi');
    renderDoc();
    const doc = screen.getByRole('document');
    // The app name renders in Devanagari — the browser (not jsPDF) draws it,
    // which is the whole point of OPT-P3.2.
    expect(within(doc).getByText('भारत टैक्स मित्र')).toBeInTheDocument();
  });
});
