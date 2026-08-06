/**
 * ExportView — generate, validate, and download the ITR-1 JSON (tasks 3.2.3,
 * 3.3.2, 3.3.3). Fully client-side so export works offline (Req 8.6).
 *
 * Loaded lazily so its JS (generator + validator + schema) stays out of the
 * initial chunk.
 */

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { buildITR1, type BankDetails } from '../../services/itrExport';
import { validateITR1 } from '../../services/itrValidator';
import { BankDetailsForm } from '../../components/BankDetailsForm';
import { TaxSummaryDocument } from '../../components/TaxSummaryDocument';
import { useOffline } from '../../contexts/OfflineContext';
import { celebrate } from '../../utils/celebrate';
import type { RegimeComparisonResult } from '../../../../shared/types/tax-calculation';
import type { PersonalInfoFormData, SalaryIncomeFormData } from '../../../../shared/types/form-data';

interface ExportViewProps {
  regimeComparison: RegimeComparisonResult | null;
  completenessScore: number;
  personalInfo: Partial<PersonalInfoFormData>;
  salary: Partial<SalaryIncomeFormData> | null;
  selectedRegime: 'old' | 'new';
  tdsPaid: number;
}

const MIN_COMPLETENESS = 80;

export default function ExportView({
  regimeComparison,
  completenessScore,
  personalInfo,
  salary,
  selectedRegime,
  tdsPaid,
}: ExportViewProps) {
  const { t } = useTranslation();
  const { isOnline } = useOffline();
  const [downloaded, setDownloaded] = useState(false);
  const [bank, setBank] = useState<BankDetails | null>(null);

  const enoughData = regimeComparison !== null && completenessScore >= MIN_COMPLETENESS;

  // Build + validate the ITR JSON, re-running when inputs (incl. bank) change.
  const { itr, validation, json } = useMemo(() => {
    if (!regimeComparison) return { itr: null, validation: null, json: '' };
    const result = selectedRegime === 'old' ? regimeComparison.oldRegime : regimeComparison.newRegime;
    const built = buildITR1({ personalInfo, salary: salary ?? {}, result, tdsPaid, bank: bank ?? undefined });
    return { itr: built, validation: validateITR1(built), json: JSON.stringify(built, null, 2) };
  }, [regimeComparison, selectedRegime, personalInfo, salary, tdsPaid, bank]);

  // A refund is due → bank details are required before download (per 3.2.1).
  const refundDue = itr?.ITR.ITR1.Form_ITR1.Refund?.RefundDue ?? 0;
  const needsBank = refundDue > 0;
  const bankReady = !needsBank || bank !== null;

  const pan = (personalInfo.pan || 'ITR').toUpperCase();
  const fileName = `ITR1_${pan}_AY2025-26.json`;

  const handleDownload = () => {
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    // Mark the moment (OPT-UI.8) — a first-time filer just produced a valid
    // return. No-op under prefers-reduced-motion.
    celebrate();
  };

  // PDF summary via the browser's native print → "Save as PDF" (OPT-P3.2):
  // Indic scripts render correctly, offline, with no font-embedding weight.
  const handlePrintPdf = () => {
    document.body.classList.add('printing');
    const cleanup = () => {
      document.body.classList.remove('printing');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1000); // fallback if afterprint doesn't fire
  };

  const chosenResult =
    regimeComparison &&
    (selectedRegime === 'old' ? regimeComparison.oldRegime : regimeComparison.newRegime);

  // ── Not enough data yet ────────────────────────────────────────────────
  if (!enoughData) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <header className="mb-6">
          <div className="eyebrow text-[hsl(var(--gold-deep))]">{t('export.eyebrow', { defaultValue: 'Filing · Export' })}</div>
          <h2 className="font-display text-3xl font-semibold text-foreground">{t('export.title', { defaultValue: 'Export your return' })}</h2>
        </header>
        <div className="hairline rounded-2xl bg-card p-8 shadow-elevated">
          <div className="font-display text-lg font-semibold text-foreground">
            {t('export.finishFirst', { defaultValue: 'Complete your filing first' })}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('export.completenessHint', {
              defaultValue: 'Your return is {{pct}}% complete. Reach {{min}}% to generate the ITR JSON.',
              pct: completenessScore,
              min: MIN_COMPLETENESS,
            })}
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-deep))] transition-all"
              style={{ width: `${completenessScore}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  const isValid = validation?.valid ?? false;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow text-[hsl(var(--gold-deep))]">{t('export.eyebrow', { defaultValue: 'Filing · Export' })}</div>
          <h2 className="font-display text-3xl font-semibold text-foreground">{t('export.title', { defaultValue: 'Export your return' })}</h2>
        </div>
        {!isOnline && (
          <span className="hairline rounded-full bg-card px-3 py-1 text-xs text-muted-foreground">
            {t('export.offlineBadge', { defaultValue: 'Generated offline' })}
          </span>
        )}
      </header>

      {/* Validation status */}
      <div
        className={`hairline rounded-2xl p-5 shadow-elevated ${
          isValid ? 'bg-[hsl(var(--gold)/0.06)]' : 'bg-destructive/5'
        }`}
      >
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-lg">{isValid ? '✓' : '⚠'}</span>
          <span className="font-semibold text-foreground">
            {isValid
              ? t('export.valid', { defaultValue: 'ITR-1 JSON is valid and ready to file' })
              : t('export.invalid', { defaultValue: 'A few fields need attention before filing' })}
          </span>
        </div>
        {!isValid && validation && (
          <ul className="mt-3 space-y-1">
            {validation.errors.slice(0, 8).map((e, i) => (
              <li key={i} className="text-sm text-destructive">
                <code className="font-mono text-xs">{e.path}</code> — {e.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Key figures preview */}
      {itr && (
        <div className="hairline mt-4 rounded-2xl bg-card p-6 shadow-elevated">
          <div className="eyebrow mb-3 text-muted-foreground">{t('export.summary', { defaultValue: 'Return summary' })}</div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {(() => {
              const f = itr.ITR.ITR1.Form_ITR1;
              const rows: Array<[string, string | number]> = [
                [t('export.pan', { defaultValue: 'PAN' }), f.PersonalInfo.PAN],
                [t('export.form', { defaultValue: 'Form' }), 'ITR-1 (Sahaj) · AY 2025-26'],
                [t('export.totalIncome', { defaultValue: 'Total income' }), `₹${f.ITR1_IncomeDeductions.TotalIncomeAfterDeductions.toLocaleString('en-IN')}`],
                [t('export.taxLiability', { defaultValue: 'Net tax liability' }), `₹${f.TaxComputation.NetTaxLiability.toLocaleString('en-IN')}`],
                [t('export.taxesPaid', { defaultValue: 'Taxes paid' }), `₹${f.TaxPaid.TotalTaxesPaid.toLocaleString('en-IN')}`],
                [t('export.refund', { defaultValue: 'Refund due' }), `₹${(f.Refund?.RefundDue ?? 0).toLocaleString('en-IN')}`],
              ];
              return rows.map(([k, v]) => (
                <div key={k} className="flex flex-col">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="figure-display font-semibold text-foreground">{v}</dd>
                </div>
              ));
            })()}
          </dl>
        </div>
      )}

      {/* Bank details — required only when a refund is due (task 3.3.1) */}
      {needsBank && (
        <div className="mt-4">
          <BankDetailsForm onChange={setBank} />
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={handleDownload}
          disabled={!isValid || !bankReady}
          className="btn-gold rounded-xl px-8 py-3 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('export.download', { defaultValue: 'Download ITR JSON' })}
        </button>
        <button
          onClick={handlePrintPdf}
          className="hairline rounded-xl bg-card px-6 py-3 font-semibold text-foreground transition-colors hover:bg-secondary/60"
        >
          {t('export.downloadPdf', { defaultValue: 'Download PDF Summary' })}
        </button>
        <span className="font-mono text-xs text-muted-foreground">{fileName}</span>
        {isValid && !bankReady && (
          <span className="text-sm text-muted-foreground">
            {t('export.needBank', { defaultValue: 'Add bank details to claim your refund' })}
          </span>
        )}
        {downloaded && (
          <span className="text-sm text-[hsl(var(--gold-deep))]">
            {t('export.downloaded', { defaultValue: 'Saved — upload it at incometax.gov.in' })}
          </span>
        )}
      </div>

      {/* Raw JSON preview */}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          {t('export.previewJson', { defaultValue: 'Preview JSON' })}
        </summary>
        <pre className="mt-2 max-h-96 overflow-auto rounded-xl bg-ink p-4 text-xs leading-relaxed text-white/80">
          {json}
        </pre>
      </details>

      {/* Printable PDF summary — portaled to <body> (a sibling of #root) so the
          print stylesheet can hide the app and output only the A4 document. */}
      {regimeComparison && chosenResult &&
        createPortal(
          <TaxSummaryDocument
            result={chosenResult}
            comparison={regimeComparison}
            personalName={personalInfo.fullName}
            pan={personalInfo.pan}
            selectedRegime={selectedRegime}
            tdsPaid={tdsPaid}
            generatedOffline={!isOnline}
          />,
          document.body
        )}
    </div>
  );
}
