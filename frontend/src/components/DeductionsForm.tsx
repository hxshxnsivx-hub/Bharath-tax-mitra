import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { db, type SavedDraft } from '../lib/db';
import { formatIndianCurrency, parseIndianCurrency } from '../utils/currency';

interface Deductions {
  // Section 80C (max ₹1.5L)
  lic: number;
  ppf: number;
  elss: number;
  nsc: number;
  homeLoanPrincipal: number;
  
  // Section 80D (Health Insurance)
  healthInsuranceSelf: number;
  healthInsuranceParents: number;
  isSelfSeniorCitizen: boolean;
  isParentSeniorCitizen: boolean;
  
  // HRA
  rentPaid: number;
  landlordPAN: string;
  isMetroCity: boolean;
  basicSalary: number;
  
  // Other deductions
  npsAdditional: number; // 80CCD(1B) - ₹50k
  donations: number; // 80G
  educationLoanInterest: number; // 80E
}

interface ValidationErrors {
  [key: string]: string | undefined;
}

interface DeductionsFormProps {
  sessionId: string;
  initialData?: Partial<Deductions>;
  onSave?: (data: Deductions) => void;
}

const SECTION_80C_LIMIT = 150000; // ₹1.5L
const SECTION_80D_SELF_LIMIT = 25000;
const SECTION_80D_SELF_SENIOR_LIMIT = 50000;
const SECTION_80D_PARENTS_LIMIT = 25000;
const SECTION_80D_PARENTS_SENIOR_LIMIT = 50000;
const SECTION_80CCD1B_LIMIT = 50000; // NPS additional
const RENT_PAN_THRESHOLD = 100000; // ₹1L/year

export function DeductionsForm({ sessionId, initialData, onSave }: DeductionsFormProps) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState<Deductions>({
    lic: initialData?.lic || 0,
    ppf: initialData?.ppf || 0,
    elss: initialData?.elss || 0,
    nsc: initialData?.nsc || 0,
    homeLoanPrincipal: initialData?.homeLoanPrincipal || 0,
    healthInsuranceSelf: initialData?.healthInsuranceSelf || 0,
    healthInsuranceParents: initialData?.healthInsuranceParents || 0,
    isSelfSeniorCitizen: initialData?.isSelfSeniorCitizen || false,
    isParentSeniorCitizen: initialData?.isParentSeniorCitizen || false,
    rentPaid: initialData?.rentPaid || 0,
    landlordPAN: initialData?.landlordPAN || '',
    isMetroCity: initialData?.isMetroCity || false,
    basicSalary: initialData?.basicSalary || 0,
    npsAdditional: initialData?.npsAdditional || 0,
    donations: initialData?.donations || 0,
    educationLoanInterest: initialData?.educationLoanInterest || 0,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate Section 80C total
  const calculate80CTotal = (): number => {
    return (
      formData.lic +
      formData.ppf +
      formData.elss +
      formData.nsc +
      formData.homeLoanPrincipal
    );
  };

  // Calculate Section 80C remaining limit
  const calculate80CRemaining = (): number => {
    return Math.max(0, SECTION_80C_LIMIT - calculate80CTotal());
  };

  // Calculate Section 80D total
  const calculate80DTotal = (): number => {
    const selfLimit = formData.isSelfSeniorCitizen
      ? SECTION_80D_SELF_SENIOR_LIMIT
      : SECTION_80D_SELF_LIMIT;
    const parentsLimit = formData.isParentSeniorCitizen
      ? SECTION_80D_PARENTS_SENIOR_LIMIT
      : SECTION_80D_PARENTS_LIMIT;

    const selfDeduction = Math.min(formData.healthInsuranceSelf, selfLimit);
    const parentsDeduction = Math.min(formData.healthInsuranceParents, parentsLimit);

    return selfDeduction + parentsDeduction;
  };

  // Calculate total deductions
  const calculateTotalDeductions = (): number => {
    const section80C = Math.min(calculate80CTotal(), SECTION_80C_LIMIT);
    const section80D = calculate80DTotal();
    const section80CCD1B = Math.min(formData.npsAdditional, SECTION_80CCD1B_LIMIT);
    const section80G = formData.donations;
    const section80E = formData.educationLoanInterest;

    return section80C + section80D + section80CCD1B + section80G + section80E;
  };

  // Validate PAN format
  const validatePAN = (pan: string): string | undefined => {
    if (!pan) return undefined; // Optional if rent < 1L
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (!panRegex.test(pan)) {
      return t('form.errors.panInvalid');
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

  // Check if landlord PAN is required
  const isLandlordPANRequired = (): boolean => {
    return formData.rentPaid > RENT_PAN_THRESHOLD;
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
        draftId: `deductions-${sessionId}`,
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
        const draft = await db.savedDrafts.get(`deductions-${sessionId}`);
        if (draft && draft.formData) {
          setFormData(draft.formData as unknown as Deductions);
          setLastSaved(new Date(draft.savedAt));
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    };

    loadDraft();
  }, [sessionId]);

  const handleAmountChange = (field: keyof Deductions, value: string) => {
    const numValue = parseIndianCurrency(value);
    setFormData(prev => ({ ...prev, [field]: numValue }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleCheckboxChange = (field: keyof Deductions, checked: boolean) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  };

  const handleTextChange = (field: keyof Deductions, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleBlur = (field: keyof Deductions) => {
    let error: string | undefined;

    if (field === 'landlordPAN') {
      if (isLandlordPANRequired() && !formData.landlordPAN) {
        error = t('deductions.landlordPANRequired');
      } else {
        error = validatePAN(formData.landlordPAN);
      }
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
    const newErrors: ValidationErrors = {};

    // Validate amounts
    Object.keys(formData).forEach(key => {
      if (typeof formData[key as keyof Deductions] === 'number') {
        const error = validateAmount(formData[key as keyof Deductions] as number);
        if (error) newErrors[key] = error;
      }
    });

    // Validate landlord PAN if required
    if (isLandlordPANRequired()) {
      if (!formData.landlordPAN) {
        newErrors.landlordPAN = t('deductions.landlordPANRequired');
      } else {
        const panError = validatePAN(formData.landlordPAN);
        if (panError) newErrors.landlordPAN = panError;
      }
    }

    // Check for anomalies
    const totalDeductions = calculateTotalDeductions();
    const grossIncome = formData.basicSalary * 12; // Approximate
    if (grossIncome > 0 && totalDeductions > grossIncome * 0.5) {
      // Warning: deductions > 50% of gross income
      const confirmed = window.confirm(
        t('deductions.anomalyWarning', {
          deductions: formatIndianCurrency(totalDeductions),
          percentage: ((totalDeductions / grossIncome) * 100).toFixed(1),
        })
      );
      if (!confirmed) return;
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
        <h2 className="text-2xl font-bold text-gray-900">{t('deductions.title')}</h2>
        <p className="mt-1 text-sm text-gray-600">{t('deductions.subtitle')}</p>
        {lastSaved && (
          <p className="mt-2 text-xs text-gray-500">
            {t('form.lastSaved')}: {lastSaved.toLocaleTimeString()}
            {isSaving && <span className="ml-2 text-blue-600">{t('form.saving')}</span>}
          </p>
        )}
      </div>

      {/* Section 80C */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">{t('deductions.section80C')}</h3>
          <div className="text-sm">
            <span className="text-gray-600">{t('deductions.remaining')}: </span>
            <span
              className={`font-bold ${
                calculate80CRemaining() === 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {formatIndianCurrency(calculate80CRemaining())}
            </span>
            <span className="text-gray-500"> / {formatIndianCurrency(SECTION_80C_LIMIT)}</span>
          </div>
        </div>

        {calculate80CTotal() > SECTION_80C_LIMIT && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ {t('deductions.section80CExceeded')}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CurrencyInput
            id="lic"
            label={t('deductions.lic')}
            value={formData.lic}
            onChange={val => handleAmountChange('lic', val)}
            onBlur={() => handleBlur('lic')}
            error={errors.lic}
            tooltip={t('deductions.licTooltip')}
          />

          <CurrencyInput
            id="ppf"
            label={t('deductions.ppf')}
            value={formData.ppf}
            onChange={val => handleAmountChange('ppf', val)}
            onBlur={() => handleBlur('ppf')}
            error={errors.ppf}
            tooltip={t('deductions.ppfTooltip')}
          />

          <CurrencyInput
            id="elss"
            label={t('deductions.elss')}
            value={formData.elss}
            onChange={val => handleAmountChange('elss', val)}
            onBlur={() => handleBlur('elss')}
            error={errors.elss}
            tooltip={t('deductions.elssTooltip')}
          />

          <CurrencyInput
            id="nsc"
            label={t('deductions.nsc')}
            value={formData.nsc}
            onChange={val => handleAmountChange('nsc', val)}
            onBlur={() => handleBlur('nsc')}
            error={errors.nsc}
            tooltip={t('deductions.nscTooltip')}
          />

          <CurrencyInput
            id="homeLoanPrincipal"
            label={t('deductions.homeLoanPrincipal')}
            value={formData.homeLoanPrincipal}
            onChange={val => handleAmountChange('homeLoanPrincipal', val)}
            onBlur={() => handleBlur('homeLoanPrincipal')}
            error={errors.homeLoanPrincipal}
            tooltip={t('deductions.homeLoanPrincipalTooltip')}
          />
        </div>
      </div>

      {/* Section 80D */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">{t('deductions.section80D')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <CurrencyInput
              id="healthInsuranceSelf"
              label={t('deductions.healthInsuranceSelf')}
              value={formData.healthInsuranceSelf}
              onChange={val => handleAmountChange('healthInsuranceSelf', val)}
              onBlur={() => handleBlur('healthInsuranceSelf')}
              error={errors.healthInsuranceSelf}
              tooltip={t('deductions.healthInsuranceSelfTooltip')}
            />
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isSelfSeniorCitizen}
                onChange={e => handleCheckboxChange('isSelfSeniorCitizen', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{t('deductions.isSelfSeniorCitizen')}</span>
              <Tooltip text={t('deductions.seniorCitizenTooltip')} />
            </label>
            <p className="text-xs text-gray-500">
              {t('deductions.limit')}:{' '}
              {formatIndianCurrency(
                formData.isSelfSeniorCitizen
                  ? SECTION_80D_SELF_SENIOR_LIMIT
                  : SECTION_80D_SELF_LIMIT
              )}
            </p>
          </div>

          <div className="space-y-3">
            <CurrencyInput
              id="healthInsuranceParents"
              label={t('deductions.healthInsuranceParents')}
              value={formData.healthInsuranceParents}
              onChange={val => handleAmountChange('healthInsuranceParents', val)}
              onBlur={() => handleBlur('healthInsuranceParents')}
              error={errors.healthInsuranceParents}
              tooltip={t('deductions.healthInsuranceParentsTooltip')}
            />
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isParentSeniorCitizen}
                onChange={e => handleCheckboxChange('isParentSeniorCitizen', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                {t('deductions.isParentSeniorCitizen')}
              </span>
            </label>
            <p className="text-xs text-gray-500">
              {t('deductions.limit')}:{' '}
              {formatIndianCurrency(
                formData.isParentSeniorCitizen
                  ? SECTION_80D_PARENTS_SENIOR_LIMIT
                  : SECTION_80D_PARENTS_LIMIT
              )}
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-900">
            {t('deductions.section80DTotal')}: <span className="font-bold">{formatIndianCurrency(calculate80DTotal())}</span>
          </p>
        </div>
      </div>

      {/* HRA Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">{t('deductions.hraSection')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CurrencyInput
            id="rentPaid"
            label={t('deductions.rentPaid')}
            value={formData.rentPaid}
            onChange={val => handleAmountChange('rentPaid', val)}
            onBlur={() => handleBlur('rentPaid')}
            error={errors.rentPaid}
            tooltip={t('deductions.rentPaidTooltip')}
          />

          <CurrencyInput
            id="basicSalary"
            label={t('deductions.basicSalary')}
            value={formData.basicSalary}
            onChange={val => handleAmountChange('basicSalary', val)}
            onBlur={() => handleBlur('basicSalary')}
            error={errors.basicSalary}
            tooltip={t('deductions.basicSalaryTooltip')}
          />

          <div>
            <label htmlFor="landlordPAN" className="block text-sm font-medium text-gray-700 mb-2">
              {t('deductions.landlordPAN')}{' '}
              {isLandlordPANRequired() && <span className="text-red-500">*</span>}
              <Tooltip text={t('deductions.landlordPANTooltip')} />
            </label>
            <input
              id="landlordPAN"
              type="text"
              value={formData.landlordPAN}
              onChange={e => handleTextChange('landlordPAN', e.target.value.toUpperCase())}
              onBlur={() => handleBlur('landlordPAN')}
              placeholder="AAAAA9999A"
              maxLength={10}
              className={`
                w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase
                ${errors.landlordPAN ? 'border-red-500' : 'border-gray-300'}
              `}
            />
            {errors.landlordPAN && <p className="mt-1 text-sm text-red-600">{errors.landlordPAN}</p>}
            {isLandlordPANRequired() && (
              <p className="mt-1 text-xs text-orange-600">
                {t('deductions.landlordPANNote')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('deductions.cityType')}
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isMetroCity}
                onChange={e => handleCheckboxChange('isMetroCity', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{t('deductions.isMetroCity')}</span>
              <Tooltip text={t('deductions.metroCityTooltip')} />
            </label>
          </div>
        </div>
      </div>

      {/* Other Deductions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">{t('deductions.otherDeductions')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CurrencyInput
            id="npsAdditional"
            label={t('deductions.npsAdditional')}
            value={formData.npsAdditional}
            onChange={val => handleAmountChange('npsAdditional', val)}
            onBlur={() => handleBlur('npsAdditional')}
            error={errors.npsAdditional}
            tooltip={t('deductions.npsAdditionalTooltip')}
          />

          <CurrencyInput
            id="donations"
            label={t('deductions.donations')}
            value={formData.donations}
            onChange={val => handleAmountChange('donations', val)}
            onBlur={() => handleBlur('donations')}
            error={errors.donations}
            tooltip={t('deductions.donationsTooltip')}
          />

          <CurrencyInput
            id="educationLoanInterest"
            label={t('deductions.educationLoanInterest')}
            value={formData.educationLoanInterest}
            onChange={val => handleAmountChange('educationLoanInterest', val)}
            onBlur={() => handleBlur('educationLoanInterest')}
            error={errors.educationLoanInterest}
            tooltip={t('deductions.educationLoanInterestTooltip')}
          />
        </div>
      </div>

      {/* Total Deductions Summary */}
      <div className="bg-green-50 border border-green-200 rounded-md p-4 space-y-2">
        <h3 className="text-lg font-semibold text-green-900">{t('deductions.totalSummary')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">{t('deductions.section80C')}</p>
            <p className="text-lg font-bold text-gray-900">
              {formatIndianCurrency(Math.min(calculate80CTotal(), SECTION_80C_LIMIT))}
            </p>
          </div>
          <div>
            <p className="text-gray-600">{t('deductions.section80D')}</p>
            <p className="text-lg font-bold text-gray-900">
              {formatIndianCurrency(calculate80DTotal())}
            </p>
          </div>
          <div>
            <p className="text-gray-600">{t('deductions.otherSections')}</p>
            <p className="text-lg font-bold text-gray-900">
              {formatIndianCurrency(
                Math.min(formData.npsAdditional, SECTION_80CCD1B_LIMIT) +
                  formData.donations +
                  formData.educationLoanInterest
              )}
            </p>
          </div>
          <div>
            <p className="text-gray-600">{t('deductions.totalDeductions')}</p>
            <p className="text-xl font-bold text-green-700">
              {formatIndianCurrency(calculateTotalDeductions())}
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
