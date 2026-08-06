import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MobileNumberInput } from './MobileNumberInput';
import { OTPVerification } from './OTPVerification';
import { RegimeSelection } from './RegimeSelection';
import { db } from '../lib/db';
import { sendOTP, verifyOTP, AuthError } from '../services/authService';

type AuthStep = 'mobile' | 'otp' | 'regime';

interface AuthFlowProps {
  onAuthSuccess?: (userId: string, language: string, regime: 'old' | 'new') => void;
}

export function AuthFlow({ onAuthSuccess }: AuthFlowProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<AuthStep>('mobile');
  const [mobileNumber, setMobileNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMobileSubmit = async (mobile: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await sendOTP(mobile);
      setMobileNumber(mobile);
      setCurrentStep('otp');
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.code === 'RATE_LIMIT') {
          setError(t('auth.errors.rateLimit'));
        } else if (err.code === 'LOCKED') {
          setError(t('auth.errors.locked'));
        } else if (err.code === 'NETWORK_ERROR') {
          setError(t('auth.errors.network'));
        } else {
          setError(t('auth.errors.generic'));
        }
      } else {
        setError(t('auth.errors.generic'));
      }
      console.error('Failed to send OTP:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerify = async (otp: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await verifyOTP(mobileNumber, otp);
      setCurrentStep('regime');
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.code === 'INVALID_OTP') {
          setError(err.message || t('auth.invalidOTP'));
        } else if (err.code === 'LOCKED') {
          setError(t('auth.errors.locked'));
        } else if (err.code === 'NETWORK_ERROR') {
          setError(t('auth.errors.network'));
        } else {
          setError(t('auth.errors.generic'));
        }
      } else {
        setError(t('auth.errors.generic'));
      }
      console.error('Failed to verify OTP:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await sendOTP(mobileNumber);
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.code === 'RATE_LIMIT') {
          setError(t('auth.errors.rateLimit'));
        } else if (err.code === 'LOCKED') {
          setError(t('auth.errors.locked'));
        } else if (err.code === 'NETWORK_ERROR') {
          setError(t('auth.errors.network'));
        } else {
          setError(t('auth.errors.generic'));
        }
      } else {
        setError(t('auth.errors.generic'));
      }
      console.error('Failed to resend OTP:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegimeSelect = async (regime: 'old' | 'new') => {
    setIsLoading(true);
    setError(null);
    try {
      const userId = 'user-' + Date.now();
      const savedLang = await db.getLanguagePreference() || 'en';

      // Save user profile to IndexedDB
      await db.profiles.put({
        userId,
        mobileNumber: mobileNumber,
        languageCode: savedLang,
        preferredRegime: regime,
        authToken: 'local-session-' + Date.now(),
        lastSyncTimestamp: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      onAuthSuccess?.(userId, savedLang, regime);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {currentStep === 'mobile' && (
        <MobileNumberInput onSubmit={handleMobileSubmit} isLoading={isLoading} />
      )}
      {currentStep === 'otp' && (
        <OTPVerification
          mobileNumber={mobileNumber}
          onVerify={handleOTPVerify}
          onResend={handleResendOTP}
          onBack={() => { setCurrentStep('mobile'); setError(null); }}
          isLoading={isLoading}
        />
      )}
      {currentStep === 'regime' && (
        <RegimeSelection onSelect={handleRegimeSelect} isLoading={isLoading} />
      )}
      {error && (
        <div className="mx-auto max-w-sm mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </>
  );
}
