import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface RegimeSelectionProps {
  onSelect: (regime: 'old' | 'new') => void;
  isLoading?: boolean;
}

export function RegimeSelection({ onSelect, isLoading = false }: RegimeSelectionProps) {
  const { t } = useTranslation();
  const [selectedRegime, setSelectedRegime] = useState<'old' | 'new' | null>(null);

  const handleSelect = (regime: 'old' | 'new') => {
    setSelectedRegime(regime);
  };

  const handleContinue = () => {
    if (selectedRegime) {
      onSelect(selectedRegime);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('regime.select')}
        </h2>
        <p className="text-gray-600 mb-6">
          Choose the tax regime that works best for you
        </p>

        <div className="space-y-4 mb-6">
          <button
            onClick={() => handleSelect('old')}
            className={`
              w-full p-4 rounded-lg border-2 text-left transition-all
              ${
                selectedRegime === 'old'
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {t('regime.old')}
                </h3>
                <p className="text-sm text-gray-600">
                  {t('regime.oldDescription')}
                </p>
              </div>
              {selectedRegime === 'old' && (
                <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </button>

          <button
            onClick={() => handleSelect('new')}
            className={`
              w-full p-4 rounded-lg border-2 text-left transition-all
              ${
                selectedRegime === 'new'
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {t('regime.new')}
                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Recommended
                  </span>
                </h3>
                <p className="text-sm text-gray-600">
                  {t('regime.newDescription')}
                </p>
              </div>
              {selectedRegime === 'new' && (
                <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </button>
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedRegime || isLoading}
          className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? t('common.loading') : t('common.continue')}
        </button>

        <div className="mt-6 flex items-center justify-center">
          <div className="flex gap-1">
            {[0, 1, 2].map((step) => (
              <div
                key={step}
                className={`h-2 w-8 rounded-full ${
                  step === 2 ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
