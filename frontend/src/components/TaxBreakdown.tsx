import { useTranslation } from 'react-i18next';
import { formatIndianCurrency } from '../utils/currency';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { DeductionCompositionChart } from './charts/DeductionCompositionChart';
import { SlabTaxChart } from './charts/SlabTaxChart';
import type { TaxCalculationResult } from '../../../shared/types/tax-calculation';

interface TaxBreakdownProps {
  result: TaxCalculationResult;
  /** Optional — defaults to result.regime. Kept for backward-compat callers. */
  regime?: 'old' | 'new';
}

export function TaxBreakdown({ result, regime: regimeProp }: TaxBreakdownProps) {
  const { t } = useTranslation();
  // Derive regime from the result itself — single source of truth
  const regime = regimeProp ?? result.regime;

  // Radix-based section (OPT-UI.1 first consumer): keyboard navigation and
  // aria-expanded/aria-controls come from the ui/accordion primitive; the
  // hand-rolled expand/collapse this replaces had neither.
  const AccordionSection = ({
    id,
    title,
    children,
  }: {
    id: string;
    title: string;
    children: React.ReactNode;
  }) => (
    <AccordionItem value={id}>
      <AccordionTrigger>
        <span className="text-lg">{title}</span>
      </AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  );

  const DataRow = ({
    label,
    value,
    highlight = false,
  }: {
    label: string;
    value: string;
    highlight?: boolean;
  }) => (
    <div className={`flex justify-between items-center py-2 ${highlight ? 'font-semibold' : ''}`}>
      <span className="text-sm text-gray-700">{label}</span>
      <span className={`text-sm ${highlight ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
        {value}
      </span>
    </div>
  );

  const { incomeBreakdown, deductionBreakdown } = result;

  return (
    <div className="space-y-4 max-w-4xl mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('taxBreakdown.title')} -{' '}
          {regime === 'old' ? t('regimeComparison.oldRegime') : t('regimeComparison.newRegime')}
        </h2>
        <p className="text-sm text-gray-600 mt-1">{t('taxBreakdown.subtitle')}</p>
      </div>

      <Accordion type="multiple" defaultValue={['income']} className="space-y-4">
      {/* Income Breakdown — driven by result.incomeBreakdown */}
      <AccordionSection id="income" title={t('taxBreakdown.incomeBreakdown')}>
        <div className="space-y-2">
          <DataRow
            label={t('taxBreakdown.salaryIncome')}
            value={formatIndianCurrency(incomeBreakdown.salary)}
          />
          <DataRow
            label={t('taxBreakdown.houseProperty')}
            value={formatIndianCurrency(incomeBreakdown.houseProperty)}
          />
          <DataRow
            label={t('taxBreakdown.businessIncome')}
            value={formatIndianCurrency(incomeBreakdown.businessIncome)}
          />
          <DataRow
            label={t('taxBreakdown.capitalGains')}
            value={formatIndianCurrency(incomeBreakdown.capitalGains)}
          />
          <DataRow
            label={t('taxBreakdown.otherIncome')}
            value={formatIndianCurrency(incomeBreakdown.otherSources)}
          />
          <div className="border-t-2 border-gray-300 mt-2 pt-2">
            <DataRow
              label={t('taxBreakdown.grossTotalIncome')}
              value={formatIndianCurrency(result.grossTotalIncome)}
              highlight
            />
          </div>
        </div>
      </AccordionSection>

      {/* Deductions Breakdown — driven by result.deductionBreakdown */}
      <AccordionSection id="deductions" title={t('taxBreakdown.deductionsBreakdown')}>
        <div className="space-y-2">
          <DataRow
            label={t('taxBreakdown.standardDeduction')}
            value={formatIndianCurrency(deductionBreakdown.standardDeduction)}
          />
          {/* Professional Tax (Section 16(iii)) — allowed in both regimes */}
          {deductionBreakdown.professionalTax > 0 && (
            <DataRow
              label={t('taxBreakdown.professionalTax')}
              value={formatIndianCurrency(deductionBreakdown.professionalTax)}
            />
          )}

          {regime === 'old' && (
            <>
              <DataRow
                label={t('taxBreakdown.section80C')}
                value={formatIndianCurrency(deductionBreakdown.section80C)}
              />
              <DataRow
                label={t('taxBreakdown.section80CCD1B')}
                value={formatIndianCurrency(deductionBreakdown.section80CCD1B)}
              />
              <DataRow
                label={t('taxBreakdown.section80D')}
                value={formatIndianCurrency(deductionBreakdown.section80D)}
              />
              <DataRow
                label={t('taxBreakdown.section80E')}
                value={formatIndianCurrency(deductionBreakdown.section80E)}
              />
              <DataRow
                label={t('taxBreakdown.section80G')}
                value={formatIndianCurrency(deductionBreakdown.section80G)}
              />
              <DataRow
                label={t('taxBreakdown.hraExemption')}
                value={formatIndianCurrency(deductionBreakdown.hra)}
              />
            </>
          )}
          {regime === 'new' && (
            <p className="text-sm text-gray-500 italic">
              {t('taxBreakdown.newRegimeDeductionsNote')}
            </p>
          )}
          <div className="border-t-2 border-gray-300 mt-2 pt-2">
            <DataRow
              label={t('taxBreakdown.totalDeductions')}
              value={formatIndianCurrency(result.totalDeductions)}
              highlight
            />
          </div>

          {/* Composition chart (OPT-UI.3) — part-to-whole stacked bar; the
              DataRow list above is its table view / relief channel. */}
          {result.totalDeductions > 0 && (
            <div className="mt-4">
              <DeductionCompositionChart result={result} />
            </div>
          )}
        </div>
      </AccordionSection>

      {/* Tax Calculation */}
      <AccordionSection id="taxCalculation" title={t('taxBreakdown.taxCalculation')}>
        <div className="space-y-4">
          {/* Taxable Income */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <DataRow
              label={t('taxBreakdown.taxableIncome')}
              value={formatIndianCurrency(result.taxableIncome)}
              highlight
            />
          </div>

          {/* Slab-wise Calculation — driven by result.slabWiseTax */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              {t('taxBreakdown.slabWiseCalculation')}
            </h4>
            {/* Ordinal-ramp chart (OPT-UI.3); SlabTable below is its table view. */}
            <SlabTaxChart slabWiseTax={result.slabWiseTax} />
            <SlabTable slabWiseTax={result.slabWiseTax} />
          </div>

          {/* Tax Components — top-level fields */}
          <div className="space-y-2 mt-4">
            <DataRow
              label={t('taxBreakdown.taxOnSlabs')}
              value={formatIndianCurrency(result.taxBeforeSurcharge)}
            />
            {result.surcharge > 0 && (
              <DataRow
                label={`${t('taxBreakdown.surcharge')} (${result.surchargeRate}%)`}
                value={formatIndianCurrency(result.surcharge)}
              />
            )}
            {result.rebate87A > 0 && (
              <DataRow
                label={t('taxBreakdown.rebate87A')}
                value={`-${formatIndianCurrency(result.rebate87A)}`}
              />
            )}
            <DataRow
              label={`${t('taxBreakdown.cess')} (${result.cessRate}%)`}
              value={formatIndianCurrency(result.cess)}
            />
            <div className="border-t-2 border-red-300 mt-2 pt-2">
              <DataRow
                label={t('taxBreakdown.finalTaxLiability')}
                value={formatIndianCurrency(result.totalTaxLiability)}
                highlight
              />
            </div>
            <DataRow
              label={t('taxBreakdown.effectiveRate')}
              value={`${result.effectiveTaxRate.toFixed(2)}%`}
            />
          </div>
        </div>
      </AccordionSection>
      </Accordion>

      {/* How is my tax calculated? */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">{t('taxBreakdown.howCalculated')}</h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="font-bold mr-2">1.</span>
            <span>{t('taxBreakdown.step1')}</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-2">2.</span>
            <span>{t('taxBreakdown.step2')}</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-2">3.</span>
            <span>{t('taxBreakdown.step3')}</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-2">4.</span>
            <span>{t('taxBreakdown.step4')}</span>
          </li>
          {result.rebate87A > 0 && (
            <li className="flex items-start">
              <span className="font-bold mr-2">5.</span>
              <span>{t('taxBreakdown.step5')}</span>
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}

/**
 * SlabTable — renders the actual slab-wise tax computed by the engine.
 * Driven entirely by `result.slabWiseTax` so it always matches the
 * tax rules JSON (no hardcoded slab boundaries).
 */
function SlabTable({
  slabWiseTax,
}: {
  slabWiseTax: TaxCalculationResult['slabWiseTax'];
}) {
  const { t } = useTranslation();

  const getSlabColor = (rate: number): string => {
    if (rate === 0) return 'bg-green-100 text-green-800';
    if (rate === 5) return 'bg-yellow-100 text-yellow-800';
    if (rate === 10) return 'bg-orange-100 text-orange-800';
    if (rate === 15) return 'bg-red-100 text-red-800';
    if (rate === 20) return 'bg-red-200 text-red-900';
    return 'bg-red-300 text-red-950';
  };

  if (slabWiseTax.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">{t('taxBreakdown.noTaxableSlabs')}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
              {t('taxBreakdown.incomeRange')}
            </th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase">
              {t('taxBreakdown.incomeInSlab')}
            </th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase">
              {t('taxBreakdown.rate')}
            </th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase">
              {t('taxBreakdown.taxAmount')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {slabWiseTax.map((slab, index) => (
            <tr key={index} className="bg-blue-50">
              <td className="px-4 py-3 text-gray-700">{slab.slab}</td>
              <td className="px-4 py-3 text-right text-gray-700">
                {formatIndianCurrency(slab.income)}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${getSlabColor(slab.rate)}`}
                >
                  {slab.rate}%
                </span>
              </td>
              <td className="px-4 py-3 text-right font-medium text-gray-900">
                {formatIndianCurrency(slab.tax)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
