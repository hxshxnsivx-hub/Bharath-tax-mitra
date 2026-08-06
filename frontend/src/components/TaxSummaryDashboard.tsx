import { useTranslation } from 'react-i18next';
import { formatIndianCurrency } from '../utils/currency';
import { AnimatedFigure } from './AnimatedFigure';
import { RegimeComparisonChart } from './charts/RegimeComparisonChart';
import type { TaxCalculationResult, RegimeComparisonResult } from '../../../shared/types/tax-calculation';

interface TaxSummaryDashboardProps {
  result: TaxCalculationResult;
  comparison?: RegimeComparisonResult;
  tdsPaid?: number;
  completenessScore: number;
  onRegimeSwitch?: () => void;
}

export function TaxSummaryDashboard({
  result,
  comparison,
  tdsPaid = 0,
  completenessScore,
  onRegimeSwitch,
}: TaxSummaryDashboardProps) {
  const { t } = useTranslation();

  // taxPayableOrRefund = totalTaxLiability - tdsPaid
  // Positive => amount due (pay more); zero or negative => refund expected
  const taxPayableOrRefund = result.totalTaxLiability - tdsPaid;
  const isAmountDue = taxPayableOrRefund > 0;

  const MetricCard = ({
    title,
    value,
    subtitle,
    color = 'blue',
    icon,
  }: {
    title: string;
    value: React.ReactNode;
    subtitle?: string;
    color?: 'blue' | 'green' | 'red' | 'purple' | 'orange';
    icon?: React.ReactNode;
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-900',
      green: 'bg-green-50 border-green-200 text-green-900',
      red: 'bg-red-50 border-red-200 text-red-900',
      purple: 'bg-purple-50 border-purple-200 text-purple-900',
      orange: 'bg-orange-50 border-orange-200 text-orange-900',
    };

    return (
      <div className={`border-2 rounded-lg p-6 ${colorClasses[color]}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium opacity-80 mb-1">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
          </div>
          {icon && <div className="ml-4">{icon}</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('taxSummary.title')}</h2>
        <p className="text-lg text-gray-600">{t('taxSummary.subtitle')}</p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{t('taxSummary.returnProgress')}</span>
          <span className="text-sm font-bold text-gray-900">{completenessScore}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              completenessScore >= 80 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${completenessScore}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {completenessScore >= 80
            ? t('taxSummary.readyToFile')
            : t('taxSummary.completeRemaining')}
        </p>
      </div>

      {/* Primary Metrics: TDS Paid | Amount Due / Refund Expected | Effective Tax Rate */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. TDS Paid */}
        <MetricCard
          title={t('taxSummary.tdsPaid')}
          value={<AnimatedFigure value={tdsPaid} />}
          color="orange"
          icon={
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />

        {/* 2. Amount Due (red) or Refund Expected (green) */}
        <MetricCard
          title={isAmountDue ? t('taxSummary.amountDue') : t('taxSummary.refundExpected')}
          value={<AnimatedFigure value={Math.abs(taxPayableOrRefund)} />}
          subtitle={isAmountDue ? t('taxSummary.amountDueSubtitle') : t('taxSummary.refundExpectedSubtitle')}
          color={isAmountDue ? 'red' : 'green'}
          icon={
            isAmountDue ? (
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 13l-5 5m0 0l-5-5m5 5V6"
                />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 11l5-5m0 0l5 5m-5-5v12"
                />
              </svg>
            )
          }
        />

        {/* 3. Effective Tax Rate */}
        <MetricCard
          title={t('taxSummary.effectiveRate')}
          value={`${result.effectiveTaxRate.toFixed(2)}%`}
          subtitle={t('taxSummary.ofGrossIncome')}
          color="purple"
          icon={
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
        />
      </div>

      {/* Secondary Metrics: Total Income | Tax Liability | Total Deductions | Taxable Income */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('taxSummary.totalIncome')}
          value={<AnimatedFigure value={result.grossTotalIncome} />}
          color="blue"
          icon={
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        <MetricCard
          title={t('taxSummary.taxLiability')}
          value={<AnimatedFigure value={result.totalTaxLiability} />}
          color="red"
          icon={
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        <MetricCard
          title={t('taxSummary.totalDeductions')}
          value={<AnimatedFigure value={result.totalDeductions} />}
          color="green"
          icon={
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        <MetricCard
          title={t('taxSummary.taxableIncome')}
          value={<AnimatedFigure value={result.taxableIncome} />}
          color="purple"
          icon={
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          }
        />
      </div>

      {/* Regime Recommendation */}
      {comparison && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                {t('taxSummary.regimeRecommendation')}
              </h3>
              <p className="text-sm text-indigo-800 mb-3">{comparison.analysis.recommendation}</p>
              {comparison.savings > 5000 && (
                <p className="text-2xl font-bold text-indigo-600">
                  {t('taxSummary.savePotential', { amount: formatIndianCurrency(comparison.savings) })}
                </p>
              )}
            </div>
            {onRegimeSwitch && (
              <button
                onClick={onRegimeSwitch}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {t('taxSummary.switchRegime')}
              </button>
            )}
          </div>

          {/* Regime comparison chart (OPT-UI.3) — emphasis form: recommended
              regime in the focus hue, the other in de-emphasis gray. The metric
              cards above are the numeric relief channel. */}
          <div className="mt-4 rounded-lg bg-white/70 p-4">
            <RegimeComparisonChart comparison={comparison} />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="flex items-center justify-center px-6 py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {t('taxSummary.viewBreakdown')}
        </button>

        <button className="flex items-center justify-center px-6 py-4 bg-white border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {t('taxSummary.downloadPDF')}
        </button>

        <button className="flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          {t('taxSummary.exportJSON')}
        </button>
      </div>
    </div>
  );
}
