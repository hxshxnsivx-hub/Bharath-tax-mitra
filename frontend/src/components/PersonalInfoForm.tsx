import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { db, type SavedDraft } from '../lib/db';

interface PersonalInfo {
  pan: string;
  fullName: string;
  dob: string;
  address: string;
  email: string;
  aadhaar?: string;
}

interface ValidationErrors {
  pan?: string;
  fullName?: string;
  dob?: string;
  address?: string;
  email?: string;
  aadhaar?: string;
}

interface PersonalInfoFormProps {
  sessionId: string;
  initialData?: Partial<PersonalInfo>;
  onSave?: (data: PersonalInfo) => void;
}

export function PersonalInfoForm({ sessionId, initialData, onSave }: PersonalInfoFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<PersonalInfo>({
    pan: initialData?.pan || '',
    fullName: initialData?.fullName || '',
    dob: initialData?.dob || '',
    address: initialData?.address || '',
    email: initialData?.email || '',
    aadhaar: initialData?.aadhaar || '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // PAN validation: AAAAA9999A format
  const validatePAN = (pan: string): string | undefined => {
    if (!pan) return t('form.errors.panRequired');
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (!panRegex.test(pan)) {
      return t('form.errors.panInvalid');
    }
    return undefined;
  };

  // Aadhaar validation: 12 digits (optional)
  const validateAadhaar = (aadhaar: string): string | undefined => {
    if (!aadhaar) return undefined; // Optional field
    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(aadhaar.replace(/\s/g, ''))) {
      return t('form.errors.aadhaarInvalid');
    }
    return undefined;
  };

  // DOB validation: age 18-100, DD/MM/YYYY format
  const validateDOB = (dob: string): string | undefined => {
    if (!dob) return t('form.errors.dobRequired');
    
    // Parse DD/MM/YYYY format
    const parts = dob.split('/');
    if (parts.length !== 3) {
      return t('form.errors.dobFormat');
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return t('form.errors.dobFormat');
    }

    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
      return t('form.errors.dobInvalid');
    }

    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ? age - 1
      : age;

    if (actualAge < 18) {
      return t('form.errors.dobTooYoung');
    }
    if (actualAge > 100) {
      return t('form.errors.dobTooOld');
    }

    return undefined;
  };

  // Email validation
  const validateEmail = (email: string): string | undefined => {
    if (!email) return t('form.errors.emailRequired');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return t('form.errors.emailInvalid');
    }
    return undefined;
  };

  // Full name validation
  const validateFullName = (name: string): string | undefined => {
    if (!name || name.trim().length === 0) {
      return t('form.errors.nameRequired');
    }
    if (name.trim().length < 2) {
      return t('form.errors.nameTooShort');
    }
    return undefined;
  };

  // Address validation
  const validateAddress = (address: string): string | undefined => {
    if (!address || address.trim().length === 0) {
      return t('form.errors.addressRequired');
    }
    if (address.trim().length < 10) {
      return t('form.errors.addressTooShort');
    }
    return undefined;
  };

  // Real-time validation
  const validateField = (field: keyof PersonalInfo, value: string): string | undefined => {
    switch (field) {
      case 'pan':
        return validatePAN(value);
      case 'fullName':
        return validateFullName(value);
      case 'dob':
        return validateDOB(value);
      case 'address':
        return validateAddress(value);
      case 'email':
        return validateEmail(value);
      case 'aadhaar':
        return validateAadhaar(value);
      default:
        return undefined;
    }
  };

  // Auto-save to IndexedDB every 30 seconds
  const autoSave = useCallback(async () => {
    try {
      setIsSaving(true);
      const draft: Omit<SavedDraft, 'draftId'> = {
        sessionId,
        formData: formData as Record<string, any>,
        savedAt: Date.now(),
        autoSave: true,
      };

      await db.savedDrafts.put({
        ...draft,
        draftId: `personal-info-${sessionId}`,
      });

      setLastSaved(new Date());
      setIsSaving(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setIsSaving(false);
    }
  }, [sessionId, formData]);

  // Set up auto-save interval
  useEffect(() => {
    const interval = setInterval(() => {
      autoSave();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoSave]);

  // Load saved draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draft = await db.savedDrafts.get(`personal-info-${sessionId}`);
        if (draft && draft.formData) {
          setFormData(draft.formData as PersonalInfo);
          setLastSaved(new Date(draft.savedAt));
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    };

    loadDraft();
  }, [sessionId]);

  const handleChange = (field: keyof PersonalInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleBlur = (field: keyof PersonalInfo) => {
    const error = validateField(field, formData[field] || '');
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  // Format Aadhaar with masking: XXXX-XXXX-1234
  const formatAadhaar = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 12);
    if (digits.length <= 4) return digits;
    if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
  };

  const maskAadhaar = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 12) return formatAadhaar(value);
    return `XXXX-XXXX-${digits.slice(8)}`;
  };

  const handleAadhaarChange = (value: string) => {
    const formatted = formatAadhaar(value);
    handleChange('aadhaar', formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: ValidationErrors = {
      pan: validatePAN(formData.pan),
      fullName: validateFullName(formData.fullName),
      dob: validateDOB(formData.dob),
      address: validateAddress(formData.address),
      email: validateEmail(formData.email),
      aadhaar: validateAadhaar(formData.aadhaar || ''),
    };

    // Remove undefined errors
    Object.keys(newErrors).forEach(key => {
      if (newErrors[key as keyof ValidationErrors] === undefined) {
        delete newErrors[key as keyof ValidationErrors];
      }
    });

    setErrors(newErrors);

    // If no errors, save
    if (Object.keys(newErrors).length === 0) {
      await autoSave();
      onSave?.(formData);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('form.personalInfo.title')}
          </h2>
          {lastSaved && (
            <div className="text-sm text-gray-500">
              {t('form.lastSaved')}: {lastSaved.toLocaleTimeString()}
              {isSaving && <span className="ml-2 text-blue-600">{t('form.saving')}</span>}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PAN Field */}
          <div>
            <label htmlFor="pan" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.personalInfo.pan')} <span className="text-red-500">*</span>
            </label>
            <input
              id="pan"
              type="text"
              value={formData.pan}
              onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
              onBlur={() => handleBlur('pan')}
              placeholder="AAAAA9999A"
              maxLength={10}
              className={`
                w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${errors.pan ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            {errors.pan && (
              <p className="mt-1 text-sm text-red-600">{errors.pan}</p>
            )}
            {!errors.pan && formData.pan && validatePAN(formData.pan) === undefined && (
              <p className="mt-1 text-sm text-green-600">✓ {t('form.valid')}</p>
            )}
          </div>

          {/* Full Name Field */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.personalInfo.fullName')} <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              onBlur={() => handleBlur('fullName')}
              placeholder={t('form.personalInfo.fullNamePlaceholder')}
              className={`
                w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${errors.fullName ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
            )}
          </div>

          {/* Date of Birth Field */}
          <div>
            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.personalInfo.dob')} <span className="text-red-500">*</span>
            </label>
            <input
              id="dob"
              type="text"
              value={formData.dob}
              onChange={(e) => handleChange('dob', e.target.value)}
              onBlur={() => handleBlur('dob')}
              placeholder="DD/MM/YYYY"
              maxLength={10}
              className={`
                w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${errors.dob ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            {errors.dob && (
              <p className="mt-1 text-sm text-red-600">{errors.dob}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">{t('form.personalInfo.dobHelp')}</p>
          </div>

          {/* Address Field */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.personalInfo.address')} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              onBlur={() => handleBlur('address')}
              placeholder={t('form.personalInfo.addressPlaceholder')}
              rows={3}
              className={`
                w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${errors.address ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address}</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.personalInfo.email')} <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="example@email.com"
              className={`
                w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${errors.email ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Aadhaar Field (Optional) */}
          <div>
            <label htmlFor="aadhaar" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.personalInfo.aadhaar')} <span className="text-gray-500">({t('form.optional')})</span>
            </label>
            <input
              id="aadhaar"
              type="text"
              value={formData.aadhaar ? maskAadhaar(formData.aadhaar) : ''}
              onChange={(e) => handleAadhaarChange(e.target.value)}
              onBlur={() => handleBlur('aadhaar')}
              placeholder="XXXX-XXXX-1234"
              maxLength={14}
              className={`
                w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${errors.aadhaar ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            {errors.aadhaar && (
              <p className="mt-1 text-sm text-red-600">{errors.aadhaar}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">{t('form.personalInfo.aadhaarHelp')}</p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('form.save')}
            </button>
            <button
              type="button"
              onClick={autoSave}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('form.saveDraft')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
