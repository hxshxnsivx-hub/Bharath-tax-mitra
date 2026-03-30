import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatIndianCurrency } from '../utils/currency';
import type { RegimeComparisonResult } from '../../../shared/types/tax-calculation';

interface RegimeComparisonProps {
  comparison: RegimeComparisonResult;
  onRegimeSelect?: (regime: 'old' | 'new') => void;
  selectedRegime?: 'old' | 'new';
}

export function RegimeComparison({
  comparison,
  onRegimeSelect,
  selectedRegime,
}: RegimeComparisonProps) {
  const { t } = useTranslation();
  const [activeRegime, setActiveRegime] = useState<'old' | 'new'>(
    selectedRegime || comparison.recommendedRegime
  );

  const handleRegimeToggle = (regime: 'old' | 'new') => {
    setActiveRegime(regime);
    onRegimeSelect?.(regime);
  };

  const { oldRegime, newRegime, recommendedRegime, savings, savingsPercentage } = comparison;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      {/* Header with Recommendation */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {t('regimeComparison.title')}
        </h2>
        <p className="text-lg text-gray-600">{comparison.analysis.recommendation}</p>
      </div>

      {/* Savings Highlight */}
      {savings > 5000 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4 text-center">
          <p className="text-sm text-green-700 font-medium mb-1">
            {t('regimeComparison.potentialSavings')}
          </p>
          <p className="text-4xl font-bold text-green-600">
            {formatIndianCurrency(savings)}
          </p>
          <p className="text-sm text-green-700 mt-1">
            {t('regimeComparison.savingsPercentage', { percentage: savingsPercentage.toFixed(1) })}
          </p>
        </div>
      )}

      {/* Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Old Regime Card */}
        <div
          className={`
            relative rounded-lg border-2 p-6 transition-all cursor-pointer
            ${
              activeRegime === 'old'
                ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                : 'border-gray-300 hover:border-blue-300'
            }
            ${recommendedRegime === 'old' ? 'bg-blue-50' : 'bg-white'}
          `}
          onClick={() => handleRegimeToggle('old')}
        >
          {/* Recommended Badge */}
          {recommendedRegime === 'old' && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                ✓ {t('regimeComparison.recommended')}
              </span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-gray-900">{t('regimeComparison.oldRegime')}</h3>
            <input
              type="radio"
              checked={activeRegime === 'old'}
              onChange={() => handleRegimeToggle('old')}
              className="w-5 h-5 text-blue-600 focus:ring-blue-500"
            />
          </div>

          {/* Key Metrics */}
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">{t('regimeComparison.grossIncome')}</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatIndianCurrency(oldRegime.grossTotalIncome)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">{t('regimeComparison.deductions')}</span>
              <span className="text-lg font-semibold text-green-600">
                -{formatIndianCurrency(oldRegime.totalDeductions)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">{t('regimeComparison.taxableIncome')}</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatIndianCurrency(oldRegime.taxableIncome)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b-2 border-gray-300">
              <span className="text-sm font-medium text-gray-700">
                {t('regimeComparison.taxLiability')}
              </span>
              <span className="text-2xl font-bold text-red-600">
                {formatIndianCurrency(oldRegime.totalTaxLiability)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">{t('regimeComparison.effectiveRate')}</span>
              <span className="text-lg font-semibold text-gray-900">
                {oldRegime.effectiveTaxRate.toFixed(2)}%
              </span>
            </div>

            <div className="flex justify-between items-center py-2 bg-blue-100 rounded-md px-3">
              <span className="text-sm font-medium text-blue-900">
                {t('regimeComparison.takeHome')}
              </span>
              <span className="text-xl font-bold text-blue-700">
                {formatIndianCurrency(oldRegime.takeHomeIncome)}
              </span>
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              {t('regimeComparison.benefits')}
            </h4>
            <ul className="space-y-1">
              {comparison.analysis.oldRegimeBenefits.map((benefit, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* New Regime Card */}
        <div
          className={`
            relative rounded-lg border-2 p-6 transition-all cursor-pointer
            ${
              activeRegime === 'new'
                ? 'border-purple-500 shadow-lg ring-2 ring-purple-200'
                : 'border-gray-300 hover:border-purple-300'
            }
            ${recommendedRegime === 'new' ? 'bg-purple-50' : 'bg-white'}
          `}
          onClick={() => handleRegimeToggle('new')}
        >
          {/* Recommended Badge */}
          {recommendedRegime === 'new' && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                ✓ {t('regimeComparison.recommended')}
              </span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-gray-900">{t('regimeComparison.newRegime')}</h3>
            <input
              type="radio"
              checked={activeRegime === 'new'}
              onChange={() => handleRegimeToggle('new')}
              className="w-5 h-5 text-purple-600 focus:ring-purple-500"
            />
          </div>

          {/* Key Metrics */}
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">{t('regimeComparison.grossIncome')}</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatIndianCurrency(newRegime.grossTotalIncome)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">{t('regimeComparison.deductions')}</span>
              <span className="text-lg font-semibold text-green-600">
                -{formatIndianCurrency(newRegime.totalDeductions)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">{t('regimeComparison.taxableIncome')}</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatIndianCurrency(newRegime.taxableIncome)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b-2 border-gray-300">
              <span className="text-sm font-medium text-gray-700">
                {t('regimeComparison.taxLiability')}
              </span>
              <span className="text-2xl font-bold text-red-600">
                {formatIndianCurrency(newRegime.totalTaxLiability)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">{t('regimeComparison.effectiveRate')}</span>
              <span className="text-lg font-semibold text-gray-900">
                {newRegime.effectiveTaxRate.toFixed(2)}%
              </span>
            </div>

            <div className="flex justify-between items-center py-2 bg-purple-100 rounded-md px-3">
              <span className="text-sm font-medium text-purple-900">
                {t('regimeComparison.takeHome')}
              </span>
              <span className="text-xl font-bold text-purple-700">
                {formatIndianCurrency(newRegime.takeHomeIncome)}
              </span>
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              {t('regimeComparison.benefits')}
            </h4>
            <ul className="space-y-1">
              {comparison.analysis.newRegimeBenefits.map((benefit, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Deductions Lost Warning */}
      {comparison.deductionsLost > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-yellow-600 mt-0.5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-yellow-900">
                {t('regimeComparison.deductionsLostTitle')}
              </h4>
              <p className="text-sm text-yellow-800 mt-1">
                {t('regimeComparison.deductionsLostMessage', {
                  amount: formatIndianCurrency(comparison.deductionsLost),
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Comparison Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('regimeComparison.metric')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('regimeComparison.oldRegime')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('regimeComparison.newRegime')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('regimeComparison.difference')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4 text-sm text-gray-700">{t('regimeComparison.grossIncome')}</td>
              <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                {formatIndianCurrency(oldRegime.grossTotalIncome)}
              </td>
              <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                {formatIndianCurrency(newRegime.grossTotalIncome)}
              </td>
              <td className="px-6 py-4 text-sm text-right text-gray-500">-</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-700">{t('regimeComparison.deductions')}</td>
              <td className="px-6 py-4 text-sm text-right font-medium text-green-600">
                {formatIndianCurrency(oldRegime.totalDeductions)}
              </td>
              <td className="px-6 py-4 text-sm text-right font-medium text-green-600">
                {formatIndianCurrency(newRegime.totalDeductions)}
              </td>
              <td className="px-6 py-4 text-sm text-right font-medium text-orange-600">
                {formatIndianCurrency(comparison.deductionsLost)}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 text-sm text-gray-700">{t('regimeComparison.taxableIncome')}</td>
              <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                {formatIndianCurrency(oldRegime.taxableIncome)}
              </td>
              <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                {formatIndianCurrency(newRegime.taxableIncome)}
              </td>
              <td className="px-6 py-4 text-sm text-right text-gray-500">
                {formatIndianCurrency(Math.abs(newRegime.taxableIncome - oldRegime.taxableIncome))}
              </td>
            </tr>
            <tr className="bg-red-50">
              <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                {t('regimeComparison.taxLiability')}
              </td>
              <td className="px-6 py-4 text-sm text-right font-bold text-red-600">
                {formatIndianCurrency(oldRegime.totalTaxLiability)}
              </td>
              <td className="px-6 py-4 text-sm text-right font-bold text-red-600">
                {formatIndianCurrency(newRegime.totalTaxLiability)}
              </td>
              <td className="px-6 py-4 text-sm text-right font-bold text-green-600">
                {formatIndianCurrency(savings)}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 text-sm text-gray-700">{t('regimeComparison.effectiveRate')}</td>
              <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                {oldRegime.effectiveTaxRate.toFixed(2)}%
              </td>
              <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                {newRegime.effectiveTaxRate.toFixed(2)}%
              </td>
              <td className="px-6 py-4 text-sm text-right text-gray-500">
                {Math.abs(newRegime.effectiveTaxRate - oldRegime.effectiveTaxRate).toFixed(2)}%
              </td>
            </tr>
            <tr className="bg-blue-50">
              <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                {t('regimeComparison.takeHome')}
              </td>
              <td className="px-6 py-4 text-sm text-right font-bold text-blue-700">
                {formatIndianCurrency(oldRegime.takeHomeIncome)}
              </td>
              <td className="px-6 py-4 text-sm text-right font-bold text-blue-700">
                {formatIndianCurrency(newRegime.takeHomeIncome)}
              </td>
              <td className="px-6 py-4 text-sm text-right font-bold text-green-600">
                {formatIndianCurrency(Math.abs(newRegime.takeHomeIncome - oldRegime.takeHomeIncome))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Action Button */}
      <div className="text-center">
        <button
          onClick={() => handleRegimeToggle(activeRegime === 'old' ? 'new' : 'old')}
          className="px-6 py-3 text-sm font-medium text-blue-600 bg-white border-2 border-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {t('regimeComparison.switchRegime', {
            regime: activeRegime === 'old' ? t('regimeComparison.newRegime') : t('regimeComparison.oldRegime'),
          })}
        </button>
      </div>
    </div>
  );
}
