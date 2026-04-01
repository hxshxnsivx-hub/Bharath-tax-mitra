import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { db, type SavedDraft } from '../lib/db';
import { formatIndianCurrency, parseIndianCurrency } from '../utils/currency';

interface SalaryIncome {
  grossSalary: number;
  hra: number;
  specialAllowance: number;
  otherAllowances: number;
  standardDeduction: number;
  professionalTax: number;
  otherDeductions: number;
  tdsQ1: number;
  tdsQ2: number;
  tdsQ3: number;
  tdsQ4: number;
  employerTAN: string;
  employerName: string;
}

interface ValidationErrors {
  grossSalary?: string;
  hra?: string;
  specialAllowance?: string;
  otherAllowances?: string;
  professionalTax?: string;
  otherDeductions?: string;
  tdsQ1?: string;
  tdsQ2?: string;
  tdsQ3?: string;
  tdsQ4?: string;
  employerTAN?: string;
  employerName?: string;
}

interface SalaryIncomeFormProps {
  sessionId: string;
  initialData?: Partial<SalaryIncome>;
  onSave?: (data: SalaryIncome) => void;
}

const MAX_AMOUNT = 1000000000; // 10 crores
const STANDARD_DEDUCTION = 50000; // Auto-filled ₹50k

export function SalaryIncomeForm({ sessionId, initialData, onSave }: SalaryIncomeFormProps) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState<SalaryIncome>({
    grossSalary: initialData?.grossSalary || 0,
    hra: initialData?.hra || 0,
    specialAllowance: initialData?.specialAllowance || 0,
    otherAllowances: initialData?.otherAllowances || 0,
    standardDeduction: STANDARD_DEDUCTION,
    professionalTax: initialData?.professionalTax || 0,
    otherDeductions: initialData?.otherDeductions || 0,
    tdsQ1: initialData?.tdsQ1 || 0,
    tdsQ2: initialData?.tdsQ2 || 0,
    tdsQ3: initialData?.tdsQ3 || 0,
    tdsQ4: initialData?.tdsQ4 || 0,
    employerTAN: initialData?.employerTAN || '',
    employerName: initialData?.employerName || '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Validate numeric field (non-negative, max 10 crores)
  const validateAmount = (value: number): string | undefined => {
    if (value < 0) {
      return t('form.errors.amountNegative');
    }
    if (value > MAX_AMOUNT) {
      return t('form.errors.amountTooLarge');
    }
    return undefined;
  };

  // Validate TAN format: AAAA99999A
  const validateTAN = (tan: string): string | undefined => {
    if (!tan) return t('form.errors.tanRequired');
    const tanRegex = /^[A-Z]{4}[0-9]{5}[A-Z]$/;
    if (!tanRegex.test(tan)) {
      return t('form.errors.tanInvalid');
    }
    return undefined;
  };

  // Validate employer name
  const validateEmployerName = (name: string): string | undefined => {
    if (!name || name.trim().length === 0) {
      return t('form.errors.employerNameRequired');
    }
    if (name.trim().length < 2) {
      return t('form.errors.employerNameTooShort');
    }
    return undefined;
  };

  // Calculate net taxable salary in real-time
  const calculateNetTaxableSalary = (): number => {
    const totalIncome = formData.grossSalary + formData.hra + formData.specialAllowance + formData.otherAllowances;
    const totalDeductions = formData.standardDeduction + formData.professionalTax + formData.otherDeductions;
    return Math.max(0, totalIncome - totalDeductions);
  };

  // Calculate total TDS
  const calculateTotalTDS = (): number => {
    return formData.tdsQ1 + formData.tdsQ2 + formData.tdsQ3 + formData.tdsQ4;
  };

  // Auto-save to IndexedDB every 30 seconds
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
        draftId: `salary-income-${sessionId}`,
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
        const draft = await db.savedDrafts.get(`salary-income-${sessionId}`);
        if (draft && draft.formData) {
          setFormData(draft.formData as unknown as SalaryIncome);
          setLastSaved(new Date(draft.savedAt));
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    };

    loadDraft();
  }, [sessionId]);

  const handleAmountChange = (field: keyof SalaryIncome, value: string) => {
    const numValue = parseIndianCurrency(value);
    setFormData(prev => ({ ...prev, [field]: numValue }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleTextChange = (field: keyof SalaryIncome, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleBlur = (field: keyof SalaryIncome) => {
    let error: string | undefined;
    
    if (field === 'employerTAN') {
      error = validateTAN(formData[field] as string);
    } else if (field === 'employerName') {
      error = validateEmployerName(formData[field] as string);
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
      grossSalary: validateAmount(formData.grossSalary),
      hra: validateAmount(formData.hra),
      specialAllowance: validateAmount(formData.specialAllowance),
      otherAllowances: validateAmount(formData.otherAllowances),
      professionalTax: validateAmount(formData.professionalTax),
      otherDeductions: validateAmount(formData.otherDeductions),
      tdsQ1: validateAmount(formData.tdsQ1),
      tdsQ2: validateAmount(formData.tdsQ2),
      tdsQ3: validateAmount(formData.tdsQ3),
      tdsQ4: validateAmount(formData.tdsQ4),
      employerTAN: validateTAN(formData.employerTAN),
      employerName: validateEmployerName(formData.employerName),
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

  // Tooltip component for contextual help
  const Tooltip = ({ text }: { text: string }) => (
    <div className="group relative inline-block ml-2">
      <span className="cursor-help text-blue-600 hover:text-blue-800">
        <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
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
    required = false 
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
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="0"
          className={`
            w-full pl-8 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${error ? 'border-red-500' : 'border-gray-300'}
          `}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">{t('salaryIncome.title')}</h2>
        <p className="mt-1 text-sm text-gray-600">{t('salaryIncome.subtitle')}</p>
        {lastSaved && (
          <p className="mt-2 text-xs text-gray-500">
            {t('form.lastSaved')}: {lastSaved.toLocaleTimeString()}
            {isSaving && <span className="ml-2 text-blue-600">{t('form.saving')}</span>}
          </p>
        )}
      </div>

      {/* Employer Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">{t('salaryIncome.employerDetails')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="employerName" className="block text-sm font-medium text-gray-700 mb-2">
              {t('salaryIncome.employerName')} <span className="text-red-500">*</span>
            </label>
            <input
              id="employerName"
              type="text"
              value={formData.employerName}
              onChange={(e) => handleTextChange('employerName', e.target.value)}
              onBlur={() => handleBlur('employerName')}
              placeholder={t('salaryIncome.employerNamePlaceholder')}
              className={`
                w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${errors.employerName ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            {errors.employerName && (
              <p className="mt-1 text-sm text-red-600">{errors.employerName}</p>
            )}
          </div>

          <div>
            <label htmlFor="employerTAN" className="block text-sm font-medium text-gray-700 mb-2">
              {t('salaryIncome.employerTAN')} <span className="text-red-500">*</span>
              <Tooltip text={t('salaryIncome.tanTooltip')} />
            </label>
            <input
              id="employerTAN"
              type="text"
              value={formData.employerTAN}
              onChange={(e) => handleTextChange('employerTAN', e.target.value.toUpperCase())}
              onBlur={() => handleBlur('employerTAN')}
              placeholder="AAAA99999A"
              maxLength={10}
              className={`
                w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase
                ${errors.employerTAN ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            {errors.employerTAN && (
              <p className="mt-1 text-sm text-red-600">{errors.employerTAN}</p>
            )}
          </div>
        </div>
      </div>

      {/* Income Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">{t('salaryIncome.incomeSection')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CurrencyInput
            id="grossSalary"
            label={t('salaryIncome.grossSalary')}
            value={formData.grossSalary}
            onChange={(val) => handleAmountChange('grossSalary', val)}
            onBlur={() => handleBlur('grossSalary')}
            error={errors.grossSalary}
            tooltip={t('salaryIncome.grossSalaryTooltip')}
            required
          />

          <CurrencyInput
            id="hra"
            label={t('salaryIncome.hra')}
            value={formData.hra}
            onChange={(val) => handleAmountChange('hra', val)}
            onBlur={() => handleBlur('hra')}
            error={errors.hra}
            tooltip={t('salaryIncome.hraTooltip')}
          />

          <CurrencyInput
            id="specialAllowance"
            label={t('salaryIncome.specialAllowance')}
            value={formData.specialAllowance}
            onChange={(val) => handleAmountChange('specialAllowance', val)}
            onBlur={() => handleBlur('specialAllowance')}
            error={errors.specialAllowance}
            tooltip={t('salaryIncome.specialAllowanceTooltip')}
          />

          <CurrencyInput
            id="otherAllowances"
            label={t('salaryIncome.otherAllowances')}
            value={formData.otherAllowances}
            onChange={(val) => handleAmountChange('otherAllowances', val)}
            onBlur={() => handleBlur('otherAllowances')}
            error={errors.otherAllowances}
            tooltip={t('salaryIncome.otherAllowancesTooltip')}
          />
        </div>
      </div>

      {/* Deductions Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">{t('salaryIncome.deductionsSection')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="standardDeduction" className="block text-sm font-medium text-gray-700 mb-2">
              {t('salaryIncome.standardDeduction')}
              <Tooltip text={t('salaryIncome.standardDeductionTooltip')} />
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">₹</span>
              <input
                id="standardDeduction"
                type="text"
                value={formatIndianCurrency(STANDARD_DEDUCTION).replace('₹', '').trim()}
                disabled
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">{t('salaryIncome.standardDeductionNote')}</p>
          </div>

          <CurrencyInput
            id="professionalTax"
            label={t('salaryIncome.professionalTax')}
            value={formData.professionalTax}
            onChange={(val) => handleAmountChange('professionalTax', val)}
            onBlur={() => handleBlur('professionalTax')}
            error={errors.professionalTax}
            tooltip={t('salaryIncome.professionalTaxTooltip')}
          />

          <CurrencyInput
            id="otherDeductions"
            label={t('salaryIncome.otherDeductions')}
            value={formData.otherDeductions}
            onChange={(val) => handleAmountChange('otherDeductions', val)}
            onBlur={() => handleBlur('otherDeductions')}
            error={errors.otherDeductions}
            tooltip={t('salaryIncome.otherDeductionsTooltip')}
          />
        </div>
      </div>

      {/* TDS Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">{t('salaryIncome.tdsSection')}</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CurrencyInput
            id="tdsQ1"
            label={t('salaryIncome.tdsQ1')}
            value={formData.tdsQ1}
            onChange={(val) => handleAmountChange('tdsQ1', val)}
            onBlur={() => handleBlur('tdsQ1')}
            error={errors.tdsQ1}
            tooltip={t('salaryIncome.tdsQ1Tooltip')}
          />

          <CurrencyInput
            id="tdsQ2"
            label={t('salaryIncome.tdsQ2')}
            value={formData.tdsQ2}
            onChange={(val) => handleAmountChange('tdsQ2', val)}
            onBlur={() => handleBlur('tdsQ2')}
            error={errors.tdsQ2}
            tooltip={t('salaryIncome.tdsQ2Tooltip')}
          />

          <CurrencyInput
            id="tdsQ3"
            label={t('salaryIncome.tdsQ3')}
            value={formData.tdsQ3}
            onChange={(val) => handleAmountChange('tdsQ3', val)}
            onBlur={() => handleBlur('tdsQ3')}
            error={errors.tdsQ3}
            tooltip={t('salaryIncome.tdsQ3Tooltip')}
          />

          <CurrencyInput
            id="tdsQ4"
            label={t('salaryIncome.tdsQ4')}
            value={formData.tdsQ4}
            onChange={(val) => handleAmountChange('tdsQ4', val)}
            onBlur={() => handleBlur('tdsQ4')}
            error={errors.tdsQ4}
            tooltip={t('salaryIncome.tdsQ4Tooltip')}
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm font-medium text-blue-900">
            {t('salaryIncome.totalTDS')}: <span className="text-lg">{formatIndianCurrency(calculateTotalTDS())}</span>
          </p>
        </div>
      </div>

      {/* Calculated Summary */}
      <div className="bg-green-50 border border-green-200 rounded-md p-4 space-y-2">
        <h3 className="text-lg font-semibold text-green-900">{t('salaryIncome.calculatedSummary')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">{t('salaryIncome.totalIncome')}</p>
            <p className="text-xl font-bold text-gray-900">
              {formatIndianCurrency(
                formData.grossSalary + formData.hra + formData.specialAllowance + formData.otherAllowances
              )}
            </p>
          </div>
          <div>
            <p className="text-gray-600">{t('salaryIncome.totalDeductions')}</p>
            <p className="text-xl font-bold text-gray-900">
              {formatIndianCurrency(
                formData.standardDeduction + formData.professionalTax + formData.otherDeductions
              )}
            </p>
          </div>
          <div>
            <p className="text-gray-600">{t('salaryIncome.netTaxableSalary')}</p>
            <p className="text-xl font-bold text-green-700">
              {formatIndianCurrency(calculateNetTaxableSalary())}
            </p>
          </div>
        </div>
      </div>

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
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {t('form.continue')}
        </button>
      </div>
    </form>
  );
}
