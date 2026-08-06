import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface MobileNumberInputProps {
  onSubmit: (mobileNumber: string) => void;
  isLoading?: boolean;
}

export function MobileNumberInput({ onSubmit, isLoading = false }: MobileNumberInputProps) {
  const { t } = useTranslation();
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');

  const validateMobileNumber = (number: string): boolean => {
    // Indian mobile number: 10 digits, starts with 6-9
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(number);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(value);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateMobileNumber(mobileNumber)) {
      setError(t('auth.invalidMobile'));
      return;
    }

    onSubmit(mobileNumber);
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 pt-14">
      <div className="hairline bg-card rounded-2xl shadow-elevated p-8">
        <div className="eyebrow mb-3 text-[hsl(var(--gold-deep))]">{t('app.name')}</div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          {t('auth.welcome')}
        </h2>
        <p className="text-muted-foreground mb-6">{t('auth.enterMobile')}</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="mobile"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {t('auth.mobileNumber')}
            </label>
            <div className="flex items-center">
              <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-700 rounded-l-md">
                +91
              </span>
              <input
                id="mobile"
                type="tel"
                value={mobileNumber}
                onChange={handleChange}
                placeholder="9876543210"
                className={`
                  flex-1 px-4 py-2 border rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  ${error ? 'border-red-500' : 'border-gray-300'}
                `}
                disabled={isLoading}
                autoFocus
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || mobileNumber.length !== 10}
            className="btn-gold w-full py-3 px-4 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? t('common.loading') : t('auth.sendOTP')}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>{t('auth.otpFooter')}</p>
        </div>
      </div>
    </div>
  );
}
