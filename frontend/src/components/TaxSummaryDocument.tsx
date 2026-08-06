/**
 * TaxSummaryDocument — printable A4 tax-computation summary (tasks 3.4.2/3.4.3,
 * OPT-P3.2).
 *
 * Rendered into a print-isolated container and produced as a PDF via the
 * browser's native "Save as PDF" (window.print). This is deliberately NOT
 * jsPDF: the browser renders Devanagari/Tamil/Telugu/Bengali/Gujarati natively,
 * so a Hindi/Tamil summary comes out correct instead of as tofu boxes — with
 * zero font-embedding weight and full offline support.
 *
 * PII is redacted to the last 4 characters (design privacy requirement).
 */

import { useTranslation } from 'react-i18next';
import { formatIndianCurrency } from '../utils/currency';
import { redactPAN } from '../utils/pii';
import type { TaxCalculationResult, RegimeComparisonResult } from '../../../shared/types/tax-calculation';

interface TaxSummaryDocumentProps {
  result: TaxCalculationResult;
  comparison: RegimeComparisonResult;
  personalName?: string;
  pan?: string;
  selectedRegime: 'old' | 'new';
  tdsPaid: number;
  generatedOffline?: boolean;
}

// PII masking comes from the shared util (task 4.1.3) so redaction can never
// drift between this document and the rest of the UI.

export function TaxSummaryDocument({
  result,
  comparison,
  personalName,
  pan,
  selectedRegime,
  tdsPaid,
  generatedOffline,
}: TaxSummaryDocumentProps) {
  const { t } = useTranslation();
  const payableOrRefund = result.totalTaxLiability - tdsPaid;
  const isRefund = payableOrRefund < 0;
  const generatedOn = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <div className={`tsd-row ${strong ? 'tsd-row-strong' : ''}`}>
      <span>{label}</span>
      <span className="tsd-num">{value}</span>
    </div>
  );

  const d = result.deductionBreakdown;
  const inc = result.incomeBreakdown;

  return (
    <div id="tax-summary-print" className="tsd" role="document" aria-label="Tax computation summary">
      {/* Masthead */}
      <header className="tsd-head">
        <div>
          <div className="tsd-brand">{t('app.name')}</div>
          <div className="tsd-eyebrow">{t('summaryDoc.title', { defaultValue: 'Tax Computation Summary' })}</div>
        </div>
        <div className="tsd-head-meta">
          <div>{t('summaryDoc.ay', { defaultValue: 'Assessment Year' })}: 2025-26</div>
          <div>{t('summaryDoc.generatedOn', { defaultValue: 'Generated' })}: {generatedOn}</div>
        </div>
      </header>

      {generatedOffline && (
        <div className="tsd-watermark">{t('summaryDoc.offline', { defaultValue: 'Generated Offline' })}</div>
      )}

      {/* Assessee */}
      <section className="tsd-section">
        <div className="tsd-grid2">
          <Row label={t('summaryDoc.name', { defaultValue: 'Name' })} value={personalName || '—'} />
          <Row label={t('summaryDoc.pan', { defaultValue: 'PAN' })} value={redactPAN(pan)} />
          <Row
            label={t('summaryDoc.regime', { defaultValue: 'Tax Regime' })}
            value={selectedRegime === 'old' ? t('regimeComparison.oldRegime') : t('regimeComparison.newRegime')}
          />
          <Row label={t('summaryDoc.recommended', { defaultValue: 'Recommended' })} value={
            comparison.recommendedRegime === 'old' ? t('regimeComparison.oldRegime') : t('regimeComparison.newRegime')
          } />
        </div>
      </section>

      {/* Income */}
      <section className="tsd-section">
        <h2 className="tsd-h2">{t('taxBreakdown.incomeBreakdown', { defaultValue: 'Income' })}</h2>
        <Row label={t('taxBreakdown.salaryIncome', { defaultValue: 'Salary' })} value={formatIndianCurrency(inc.salary)} />
        {inc.houseProperty !== 0 && <Row label={t('taxBreakdown.houseProperty', { defaultValue: 'House Property' })} value={formatIndianCurrency(inc.houseProperty)} />}
        {inc.businessIncome > 0 && <Row label={t('taxBreakdown.businessIncome', { defaultValue: 'Business' })} value={formatIndianCurrency(inc.businessIncome)} />}
        {inc.capitalGains > 0 && <Row label={t('taxBreakdown.capitalGains', { defaultValue: 'Capital Gains' })} value={formatIndianCurrency(inc.capitalGains)} />}
        {inc.otherSources > 0 && <Row label={t('taxBreakdown.otherIncome', { defaultValue: 'Other Sources' })} value={formatIndianCurrency(inc.otherSources)} />}
        <Row label={t('taxBreakdown.grossTotalIncome', { defaultValue: 'Gross Total Income' })} value={formatIndianCurrency(result.grossTotalIncome)} strong />
      </section>

      {/* Deductions */}
      <section className="tsd-section">
        <h2 className="tsd-h2">{t('taxBreakdown.deductionsBreakdown', { defaultValue: 'Deductions' })}</h2>
        <Row label={t('taxBreakdown.standardDeduction', { defaultValue: 'Standard Deduction' })} value={formatIndianCurrency(d.standardDeduction)} />
        {d.professionalTax > 0 && <Row label={t('taxBreakdown.professionalTax', { defaultValue: 'Professional Tax' })} value={formatIndianCurrency(d.professionalTax)} />}
        {d.section80C > 0 && <Row label={t('taxBreakdown.section80C', { defaultValue: 'Section 80C' })} value={formatIndianCurrency(d.section80C)} />}
        {d.section80CCD1B > 0 && <Row label={t('taxBreakdown.section80CCD1B', { defaultValue: 'Section 80CCD(1B)' })} value={formatIndianCurrency(d.section80CCD1B)} />}
        {d.section80D > 0 && <Row label={t('taxBreakdown.section80D', { defaultValue: 'Section 80D' })} value={formatIndianCurrency(d.section80D)} />}
        {d.section80E > 0 && <Row label={t('taxBreakdown.section80E', { defaultValue: 'Section 80E' })} value={formatIndianCurrency(d.section80E)} />}
        {d.section80G > 0 && <Row label={t('taxBreakdown.section80G', { defaultValue: 'Section 80G' })} value={formatIndianCurrency(d.section80G)} />}
        {d.hra > 0 && <Row label={t('taxBreakdown.hraExemption', { defaultValue: 'HRA Exemption' })} value={formatIndianCurrency(d.hra)} />}
        <Row label={t('taxBreakdown.totalDeductions', { defaultValue: 'Total Deductions' })} value={formatIndianCurrency(result.totalDeductions)} strong />
      </section>

      {/* Tax computation */}
      <section className="tsd-section">
        <h2 className="tsd-h2">{t('taxBreakdown.taxCalculation', { defaultValue: 'Tax Computation' })}</h2>
        <Row label={t('taxBreakdown.taxableIncome', { defaultValue: 'Taxable Income' })} value={formatIndianCurrency(result.taxableIncome)} />
        <Row label={t('taxBreakdown.taxOnSlabs', { defaultValue: 'Tax on Slabs' })} value={formatIndianCurrency(result.taxBeforeSurcharge)} />
        {result.rebate87A > 0 && <Row label={t('taxBreakdown.rebate87A', { defaultValue: 'Rebate u/s 87A' })} value={`- ${formatIndianCurrency(result.rebate87A)}`} />}
        {result.surcharge > 0 && <Row label={`${t('taxBreakdown.surcharge', { defaultValue: 'Surcharge' })} (${result.surchargeRate}%)`} value={formatIndianCurrency(result.surcharge)} />}
        <Row label={`${t('taxBreakdown.cess', { defaultValue: 'Health & Education Cess' })} (${result.cessRate}%)`} value={formatIndianCurrency(result.cess)} />
        <Row label={t('taxBreakdown.finalTaxLiability', { defaultValue: 'Total Tax Liability' })} value={formatIndianCurrency(result.totalTaxLiability)} strong />
      </section>

      {/* Taxes paid & outcome */}
      <section className="tsd-section">
        <Row label={t('taxSummary.tdsPaid', { defaultValue: 'Taxes Paid (TDS etc.)' })} value={formatIndianCurrency(tdsPaid)} />
        <Row
          label={isRefund ? t('taxSummary.refundExpected', { defaultValue: 'Refund Expected' }) : t('taxSummary.amountDue', { defaultValue: 'Amount Payable' })}
          value={formatIndianCurrency(Math.abs(payableOrRefund))}
          strong
        />
      </section>

      {/* Regime comparison */}
      <section className="tsd-section">
        <h2 className="tsd-h2">{t('regimeComparison.title', { defaultValue: 'Regime Comparison' })}</h2>
        <div className="tsd-grid2">
          <Row label={t('regimeComparison.oldRegime')} value={formatIndianCurrency(comparison.oldRegime.totalTaxLiability)} />
          <Row label={t('regimeComparison.newRegime')} value={formatIndianCurrency(comparison.newRegime.totalTaxLiability)} />
        </div>
        {comparison.savings > 0 && (
          <p className="tsd-note">{comparison.analysis.recommendation}</p>
        )}
      </section>

      <footer className="tsd-foot">
        {t('summaryDoc.disclaimer', {
          defaultValue:
            'This is a computation summary generated by Bharat Tax Mitra for your records. Verify all figures before filing. Not a substitute for professional tax advice.',
        })}
      </footer>
    </div>
  );
}
