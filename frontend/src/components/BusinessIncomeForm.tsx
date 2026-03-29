import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { db, type SavedDraft } from '../lib/db';
import { formatIndianCurrency, parseIndianCurrency } from '../utils/currency';

interface BusinessIncome {
  businessType: string;
  grossReceiptsDigital: number;
  grossReceiptsCash: number;
  presumptiveIncome: number;
}

interface ValidationErrors {
  businessType?: string;
  grossReceiptsDigital?: string;
  grossReceiptsCash?: string;
}

interface BusinessIncomeFormProps {
  sessionId: string;
  initialData?: Partial<BusinessIncome>;
  onSave?: (data: BusinessIncome) => void;
}

const SECTION_44AD_THRESHOLD = 20000000; // ₹2 crores
const DIGITAL_RATE = 0.06; // 6% for digital receipts
const CASH_RATE = 0.08; // 8% for cash receipts

const BUSINESS_TYPES = [
  'retail',
  'wholesale',
  'manufacturing',
  'services',
  'professional',
  'trading',
  'other',
];

export function BusinessIncomeForm({ sessionId, initialData, onSave }: BusinessIncomeFormProps) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState<BusinessIncome>({
    businessType: initialData?.businessType || '',
    grossReceiptsDigital: initialData?.grossReceiptsDigital || 0,
    grossReceiptsCash: initialData?.grossReceiptsCash || 0,
    presumptiveIncome: initialData?.presumptiveIncome || 0,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate total gross receipts
  const calculateTotalReceipts = (): number => {
    return formData.grossReceiptsDigital + formData.grossReceiptsCash;
  };

  // Calculate presumptive income (Section 44AD)
  const calculatePresumptiveIncome = (): number => {
    const digitalIncome = formData.grossReceiptsDigital * DIGITAL_RATE;
    const cashIncome = formData.grossReceiptsCash * CASH_RATE;
    return Math.round(digitalIncome + cashIncome);
  };

  // Check if eligible for Section 44AD
  const isEligibleFor44AD = (): boolean => {
    return calculateTotalReceipts() <= SECTION_44AD_THRESHOLD;
  };

  // Update presumptive income when receipts change
  useEffect(() => {
    const calculatedIncome = calculatePresumptiveIncome();
    setFormData(prev => ({ ...prev, presumptiveIncome: calculatedIncome }));
  }, [formData.grossReceiptsDigital, formData.grossReceiptsCash]);

  // Validate business type
  const validateBusinessType = (type: string): string | undefined => {
    if (!type || type.trim().length === 0) {
      return t('form.errors.businessTypeRequired');
    }
    return undefined;
  };

  // Validate amount
  const validateAmount = (value: number): string | undefined => {
    if (value < 0) {
      return t('form.errors.amountNegative');
    }
    if (value > 10000000000) {
      return t('form.errors.amountTooLarge');
    }
    return undefined;
  };

  // Auto-save to IndexedDB
  const autoSave = useCallback(async () => {
    try {
      setIsSaving(true);
      const draft: Omit<SavedDraft, 'draftId'> = {
        sessionId,
        formData: formData as unknown as Record<string, any>,
        savedAt: Date.now(),
        autoSave: true,
      };

      await db.savedDrafts.put({
        ...draft,
        draftId: `business-income-${sessionId}`,
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
        const draft = await db.savedDrafts.get(`business-income-${sessionId}`);
        if (draft && draft.formData) {
          setFormData(draft.formData as unknown as BusinessIncome);
          setLastSaved(new Date(draft.savedAt));
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    };

    loadDraft();
  }, [sessionId]);

  const handleAmountChange = (field: keyof BusinessIncome, value: string) => {
    const numValue = parseIndianCurrency(value);
    setFormData(prev => ({ ...prev, [field]: numValue }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleBusinessTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, businessType: value }));
    setErrors(prev => ({ ...prev, businessType: undefined }));
  };

  const handleBlur = (field: keyof BusinessIncome) => {
    let error: string | undefined;

    if (field === 'businessType') {
      error = validateBusinessType(formData[field] as string);
    } else if (typeof formData[field] === 'number') {
      error = validateAmount(formData[field] as number);
    }

    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: ValidationErrors = {
      businessType: validateBusinessType(formData.businessType),
      grossReceiptsDigital: validateAmount(formData.grossReceiptsDigital),
      grossReceiptsCash: validateAmount(formData.grossReceiptsCash),
    };

    // Remove undefined errors
    Object.keys(newErrors).forEach(key => {
      if (newErrors[key as keyof ValidationErrors] === undefined) {
        delete newErrors[key as keyof ValidationErrors];
      }
    });

    // Check if total receipts are zero
    if (calculateTotalReceipts() === 0) {
      newErrors.grossReceiptsDigital = t('businessIncome.noReceiptsError');
    }

    setErrors(newErrors);

    // If no errors, save
    if (Object.keys(newErrors).length === 0) {
      await autoSave();
      onSave?.(formData);
    }
  };

  // Tooltip component
  const Tooltip = ({ text }: { text: string }) => (
    <div className="group relative inline-block ml-2">
      <span className="cursor-help text-blue-600 hover:text-blue-800">
        <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-1 text-sm text-white bg-gray-900 rounded-lg shadow-lg -left-24">
        {text}
      </div>
    </div>
  );

  // Currency input component
  const CurrencyInput = ({
    id,
    label,
    value,
    onChange,
    onBlur,
    error,
    tooltip,
    required = false,
  }: {
    id: string;
    label: string;
    value: number;
    onChange: (value: string) => void;
    onBlur: () => void;
    error?: string;
    tooltip?: string;
    required?: boolean;
  }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-2 text-gray-500">₹</span>
        <input
          id={id}
          type="text"
          value={value > 0 ? formatIndianCurrency(value).replace('₹', '').trim() : ''}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="0"
          className={`
            w-full pl-8 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${error ? 'border-red-500' : 'border-gray-300'}
          `}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">{t('businessIncome.title')}</h2>
        <p className="mt-1 text-sm text-gray-600">{t('businessIncome.subtitle')}</p>
        {lastSaved && (
          <p className="mt-2 text-xs text-gray-500">
            {t('form.lastSaved')}: {lastSaved.toLocaleTimeString()}
            {isSaving && <span className="ml-2 text-blue-600">{t('form.saving')}</span>}
          </p>
        )}
      </div>

      {/* Section 44AD Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          {t('businessIncome.section44ADInfo')}
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>{t('businessIncome.section44ADPoint1')}</li>
          <li>{t('businessIncome.section44ADPoint2')}</li>
          <li>{t('businessIncome.section44ADPoint3')}</li>
        </ul>
      </div>

      {/* Business Type */}
      <div>
        <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
          {t('businessIncome.businessType')} <span className="text-red-500">*</span>
          <Tooltip text={t('businessIncome.businessTypeTooltip')} />
        </label>
        <select
          id="businessType"
          value={formData.businessType}
          onChange={e => handleBusinessTypeChange(e.target.value)}
          onBlur={() => handleBlur('businessType')}
          className={`
            w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${errors.businessType ? 'border-red-500' : 'border-gray-300'}
          `}
        >
          <option value="">{t('businessIncome.selectBusinessType')}</option>
          {BUSINESS_TYPES.map(type => (
            <option key={type} value={type}>
              {t(`businessIncome.businessTypes.${type}`)}
            </option>
          ))}
        </select>
        {errors.businessType && <p className="mt-1 text-sm text-red-600">{errors.businessType}</p>}
      </div>

      {/* Gross Receipts */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">{t('businessIncome.grossReceipts')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CurrencyInput
            id="grossReceiptsDigital"
            label={t('businessIncome.grossReceiptsDigital')}
            value={formData.grossReceiptsDigital}
            onChange={val => handleAmountChange('grossReceiptsDigital', val)}
            onBlur={() => handleBlur('grossReceiptsDigital')}
            error={errors.grossReceiptsDigital}
            tooltip={t('businessIncome.grossReceiptsDigitalTooltip')}
          />

          <CurrencyInput
            id="grossReceiptsCash"
            label={t('businessIncome.grossReceiptsCash')}
            value={formData.grossReceiptsCash}
            onChange={val => handleAmountChange('grossReceiptsCash', val)}
            onBlur={() => handleBlur('grossReceiptsCash')}
            error={errors.grossReceiptsCash}
            tooltip={t('businessIncome.grossReceiptsCashTooltip')}
          />
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
          <p className="text-sm font-medium text-gray-700">
            {t('businessIncome.totalGrossReceipts')}:{' '}
            <span className="text-lg font-bold text-gray-900">
              {formatIndianCurrency(calculateTotalReceipts())}
            </span>
          </p>
        </div>
      </div>

      {/* Eligibility Check */}
      {!isEligibleFor44AD() && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-600 mt-0.5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-red-900">
                {t('businessIncome.notEligibleTitle')}
              </h4>
              <p className="text-sm text-red-800 mt-1">
                {t('businessIncome.notEligibleMessage', {
                  amount: formatIndianCurrency(calculateTotalReceipts()),
                  threshold: formatIndianCurrency(SECTION_44AD_THRESHOLD),
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Presumptive Income Calculation */}
      {isEligibleFor44AD() && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 space-y-3">
          <h3 className="text-lg font-semibold text-green-900">
            {t('businessIncome.presumptiveIncomeCalculation')}
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">{t('businessIncome.digitalReceipts')}:</span>
              <span className="font-medium text-gray-900">
                {formatIndianCurrency(formData.grossReceiptsDigital)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">{t('businessIncome.digitalRate')}:</span>
              <span className="font-medium text-gray-900">6%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">{t('businessIncome.digitalIncome')}:</span>
              <span className="font-medium text-green-700">
                {formatIndianCurrency(Math.round(formData.grossReceiptsDigital * DIGITAL_RATE))}
              </span>
            </div>

            <div className="border-t border-green-300 my-2"></div>

            <div className="flex justify-between">
              <span className="text-gray-700">{t('businessIncome.cashReceipts')}:</span>
              <span className="font-medium text-gray-900">
                {formatIndianCurrency(formData.grossReceiptsCash)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">{t('businessIncome.cashRate')}:</span>
              <span className="font-medium text-gray-900">8%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">{t('businessIncome.cashIncome')}:</span>
              <span className="font-medium text-green-700">
                {formatIndianCurrency(Math.round(formData.grossReceiptsCash * CASH_RATE))}
              </span>
            </div>

            <div className="border-t-2 border-green-400 my-2"></div>

            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-green-900">
                {t('businessIncome.totalPresumptiveIncome')}:
              </span>
              <span className="text-2xl font-bold text-green-700">
                {formatIndianCurrency(formData.presumptiveIncome)}
              </span>
            </div>
          </div>

          <p className="text-xs text-green-800 mt-2">
            {t('businessIncome.presumptiveIncomeNote')}
          </p>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <button
          type="button"
          onClick={autoSave}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSaving ? t('form.saving') : t('form.saveNow')}
        </button>

        <button
          type="submit"
          disabled={!isEligibleFor44AD()}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('form.continue')}
        </button>
      </div>
    </form>
  );
}
