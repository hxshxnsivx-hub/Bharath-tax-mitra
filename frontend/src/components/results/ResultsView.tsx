/**
 * ResultsView
 *
 * The tax-results screen: summary dashboard, regime comparison, and slab-wise
 * breakdown. This module is the heaviest non-critical view in the app, so it
 * is loaded **lazily** (see MainApp's React.lazy import) and excluded from the
 * initial entry chunk. On 2G/3G the JS for this view is only fetched once the
 * user reaches the results step, keeping first paint fast.
 *
 * Requirements: 10.8, 19.4, 19.7 | Compliance: Low-bandwidth accessibility
 */

import { TaxSummaryDashboard } from '../TaxSummaryDashboard';
import { RegimeComparison } from '../RegimeComparison';
import { TaxBreakdown } from '../TaxBreakdown';
import { OfflineBadge } from '../OfflineBadge';
import { ReviewWarnings } from '../ReviewWarnings';
import { validateCrossFields, detectAnomalies, type TaxDataForValidation } from '../../utils/taxValidation';
import { defaultTaxRules } from '../../services/taxRulesService';
import type { RegimeComparisonResult } from '../../../../shared/types/tax-calculation';

export interface ResultsViewProps {
  /** Result of compareRegimes(), or null/undefined when nothing calculated yet. */
  regimeComparison: RegimeComparisonResult | null;
  /** True when the calculation was produced without network (offline badge). */
  calculatedOffline: boolean;
  /** Currently selected regime tab. */
  selectedRegime: 'old' | 'new';
  /** Switch the selected regime. */
  setSelectedRegime: (r: 'old' | 'new') => void;
  /** Completeness percentage for the summary dashboard. */
  completenessScore: number;
  /** Sum of TDS paid across quarters. */
  tdsPaid: number;
  /** Navigate back to the salary step from the empty state. */
  onEnterSalary: () => void;
  /** Wizard form data — drives cross-field validation & anomaly detection (3.1.1/3.1.2). */
  taxData: TaxDataForValidation;
  /** Anomaly IDs the user has explicitly acknowledged (persisted by the caller). */
  acknowledgedAnomalyIds: Set<string>;
  onAcknowledgeAnomaly: (id: string) => void;
}

export default function ResultsView({
  regimeComparison,
  calculatedOffline,
  selectedRegime,
  setSelectedRegime,
  completenessScore,
  tdsPaid,
  onEnterSalary,
  taxData,
  acknowledgedAnomalyIds,
  onAcknowledgeAnomaly,
}: ResultsViewProps) {
  if (!regimeComparison) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">No Calculation Yet</h3>
        <p className="text-gray-500 mb-6 text-sm">
          Please fill in your salary and deductions to calculate tax
        </p>
        <button
          onClick={onEnterSalary}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          Enter Salary Details
        </button>
      </div>
    );
  }

  const result = selectedRegime === 'new' ? regimeComparison.newRegime : regimeComparison.oldRegime;
  const issues = validateCrossFields(taxData, defaultTaxRules);
  const anomalies = detectAnomalies(taxData);

  return (
    <div className="space-y-8">
      {/* Calculated Offline badge — shown when results were produced without network */}
      {calculatedOffline && (
        <div className="flex justify-end">
          <OfflineBadge />
        </div>
      )}

      <ReviewWarnings
        issues={issues}
        anomalies={anomalies}
        acknowledgedIds={acknowledgedAnomalyIds}
        onAcknowledge={onAcknowledgeAnomaly}
      />

      <TaxSummaryDashboard
        result={result}
        comparison={regimeComparison}
        tdsPaid={tdsPaid}
        completenessScore={completenessScore}
        onRegimeSwitch={() => setSelectedRegime(selectedRegime === 'old' ? 'new' : 'old')}
      />

      <RegimeComparison
        comparison={regimeComparison}
        selectedRegime={selectedRegime}
        onRegimeSelect={setSelectedRegime}
      />

      <TaxBreakdown result={result} />
    </div>
  );
}
