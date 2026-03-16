import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileNumberInput } from './MobileNumberInput';
import { OTPVerification } from './OTPVerification';
import { RegimeSelection } from './RegimeSelection';
import { db } from '../lib/db';

type AuthStep = 'mobile' | 'otp' | 'regime';

export function AuthFlow() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<AuthStep>('mobile');
  const [mobileNumber, setMobileNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleMobileSubmit = async (mobile: string) => {
    setIsLoading(true);
    try {
      // TODO: Call backend API to send OTP
      // await fetch('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ mobile }) });
      
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMobileNumber(mobile);
      setCurrentStep('otp');
    } catch (error) {
      console.error('Failed to send OTP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerify = async (_otp: string) => {
    setIsLoading(true);
    try {
      // TODO: Call backend API to verify OTP
      // const response = await fetch('/api/auth/verify-otp', {
      //   method: 'POST',
      //   body: JSON.stringify({ mobile: mobileNumber, otp })
      // });
      
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCurrentStep('regime');
    } catch (error) {
      console.error('Failed to verify OTP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    try {
      // TODO: Call backend API to resend OTP
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to resend OTP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegimeSelect = async (regime: 'old' | 'new') => {
    setIsLoading(true);
    try {
      // Save user profile to IndexedDB
      await db.profiles.add({
        userId: 'user-' + Date.now(),
        mobileNumber: mobileNumber,
        languageCode: 'en', // Will be updated from language selector
        preferredRegime: regime,
        lastSyncTimestamp: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Navigate to home
      navigate('/home');
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
          onBack={() => setCurrentStep('mobile')}
          isLoading={isLoading}
        />
      )}
      {currentStep === 'regime' && (
        <RegimeSelection onSelect={handleRegimeSelect} isLoading={isLoading} />
      )}
    </>
  );
}
