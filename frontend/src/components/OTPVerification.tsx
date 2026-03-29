import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface OTPVerificationProps {
  mobileNumber: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
  isLoading?: boolean;
  onBack: () => void;
}

export function OTPVerification({
  mobileNumber,
  onVerify,
  onResend,
  isLoading = false,
  onBack,
}: OTPVerificationProps) {
  const { t } = useTranslation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (newOtp.every(digit => digit !== '') && index === 5) {
      handleSubmit(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setOtp(newOtp);

    // Focus last filled input or first empty
    const lastFilledIndex = pastedData.length - 1;
    inputRefs.current[Math.min(lastFilledIndex + 1, 5)]?.focus();

    // Auto-submit if 6 digits pasted
    if (pastedData.length === 6) {
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = (otpValue: string) => {
    if (otpValue.length !== 6) {
      setError(t('auth.invalidOTP'));
      return;
    }
    onVerify(otpValue);
  };

  const handleResend = () => {
    if (canResend) {
      setCountdown(30);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      setError('');
      onResend();
      inputRefs.current[0]?.focus();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <button
          onClick={onBack}
          className="mb-4 text-blue-600 hover:text-blue-700 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('common.back')}
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('auth.verifyOTP')}
        </h2>
        <p className="text-gray-600 mb-6">
          {t('auth.enterOTP')}
          <br />
          <span className="font-semibold">+91 {mobileNumber}</span>
        </p>

        <div className="mb-6">
          <div className="flex justify-center gap-2 mb-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={`
                  w-12 h-14 text-center text-2xl font-semibold border-2 rounded-lg
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  ${error ? 'border-red-500' : 'border-gray-300'}
                `}
                disabled={isLoading}
              />
            ))}
          </div>
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
        </div>

        <button
          onClick={() => handleSubmit(otp.join(''))}
          disabled={isLoading || otp.some(d => d === '')}
          className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mb-4"
        >
          {isLoading ? t('common.loading') : t('auth.verifyOTP')}
        </button>

        <div className="text-center">
          {canResend ? (
            <button
              onClick={handleResend}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('auth.resendOTP')}
            </button>
          ) : (
            <p className="text-gray-500 text-sm">
              {t('auth.resendIn', { seconds: countdown })}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center">
          <div className="flex gap-1">
            {[0, 1, 2].map((step) => (
              <div
                key={step}
                className={`h-2 w-8 rounded-full ${
                  step === 1 ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
