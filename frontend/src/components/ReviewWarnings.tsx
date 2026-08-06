/**
 * ReviewWarnings — cross-field validation issues & dismissable anomalies
 * (tasks 3.1.1 / 3.1.2).
 *
 * Validation issues are informational (the calculator already clamps the
 * underlying numbers) but always visible — they explain why an entered figure
 * didn't fully count. Anomalies require an explicit "I've reviewed this"
 * acknowledgement per anomaly (Req 12: user must override with confirmation);
 * dismissed IDs are kept in state by the caller so a data change that
 * re-triggers the same anomaly surfaces it again.
 */

import { useTranslation } from 'react-i18next';
import type { ValidationIssue, Anomaly } from '../utils/taxValidation';

interface ReviewWarningsProps {
  issues: ValidationIssue[];
  anomalies: Anomaly[];
  acknowledgedIds: Set<string>;
  onAcknowledge: (id: string) => void;
}

export function ReviewWarnings({ issues, anomalies, acknowledgedIds, onAcknowledge }: ReviewWarningsProps) {
  const { t } = useTranslation();
  const pendingAnomalies = anomalies.filter((a) => !acknowledgedIds.has(a.id));

  if (issues.length === 0 && anomalies.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="review-warnings">
      {issues.length > 0 && (
        <div className="hairline rounded-2xl bg-card p-5 shadow-elevated">
          <div className="eyebrow mb-3 text-[hsl(var(--gold-deep))]">
            {t('review.issuesTitle', { defaultValue: 'Please review' })}
          </div>
          <ul className="space-y-2">
            {issues.map((issue) => (
              <li key={issue.id} className="flex items-start gap-2 text-sm">
                <span aria-hidden className="mt-0.5 text-amber-600">⚠</span>
                <span className="text-foreground">{t(issue.messageKey, { defaultValue: issue.defaultMessage })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {anomalies.length > 0 && (
        <div className="hairline rounded-2xl bg-card p-5 shadow-elevated" data-testid="anomaly-section">
          <div className="eyebrow mb-3 text-destructive">
            {t('review.anomaliesTitle', { defaultValue: 'Review Warnings' })}
          </div>
          <ul className="space-y-3">
            {anomalies.map((anomaly) => {
              const acknowledged = acknowledgedIds.has(anomaly.id);
              return (
                <li key={anomaly.id} className={`rounded-xl border p-3 ${acknowledged ? 'border-secondary bg-secondary/30' : 'border-destructive/30 bg-destructive/5'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className={`text-sm ${acknowledged ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {t(anomaly.messageKey, { defaultValue: anomaly.defaultMessage })}
                    </span>
                    {!acknowledged && (
                      <button
                        type="button"
                        onClick={() => onAcknowledge(anomaly.id)}
                        className="hairline shrink-0 rounded-lg bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                      >
                        {t('review.acknowledge', { defaultValue: "I've reviewed this" })}
                      </button>
                    )}
                    {acknowledged && (
                      <span className="shrink-0 text-xs text-[hsl(var(--gold-deep))]">
                        {t('review.acknowledged', { defaultValue: 'Reviewed ✓' })}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {pendingAnomalies.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t('review.pendingHint', {
                defaultValue: '{{count}} warning(s) need your review before you export.',
                count: pendingAnomalies.length,
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
