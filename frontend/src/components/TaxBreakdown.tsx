import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatIndianCurrency } from '../utils/currency';
import type { TaxCalculationResult } from '../../../shared/types/tax-calculation';

interface TaxBreakdownProps {
  result: TaxCalculationResult;
  regime: 'old' | 'new';
}

export function TaxBreakdown({ result, regime }: TaxBreakdownProps) {
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['income']));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const AccordionSection = ({
    id,
    title,
    children,
  }: {
    id: string;
    title: string;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections.has(id);

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform ${
              isExpanded ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isExpanded && <div className="px-6 py-4 bg-white">{children}</div>}
      </div>
    );
  };

  const DataRow = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
    <div className={`flex justify-between items-center py-2 ${highlight ? 'font-semibold' : ''}`}>
      <span className="text-sm text-gray-700">{label}</span>
      <span className={`text-sm ${highlight ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
        {value}
      </span>
    </div>
  );

  return (
    <div className="space-y-4 max-w-4xl mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('taxBreakdown.title')} - {regime === 'old' ? t('regimeComparison.oldRegime') : t('regimeComparison.newRegime')}
        </h2>
        <p className="text-sm text-gray-600 mt-1">{t('taxBreakdown.subtitle')}</p>
      </div>

      {/* Income Breakdown */}
      <AccordionSection id="income" title={t('taxBreakdown.incomeBreakdown')}>
        <div className="space-y-2">
          <DataRow label={t('taxBreakdown.salaryIncome')} value={formatIndianCurrency(result.grossTotalIncome)} />
          <DataRow label={t('taxBreakdown.houseProperty')} value={formatIndianCurrency(0)} />
          <DataRow label={t('taxBreakdown.businessIncome')} value={formatIndianCurrency(0)} />
          <DataRow label={t('taxBreakdown.capitalGains')} value={formatIndianCurrency(0)} />
          <DataRow label={t('taxBreakdown.otherIncome')} value={formatIndianCurrency(0)} />
          <div className="border-t-2 border-gray-300 mt-2 pt-2">
            <DataRow
              label={t('taxBreakdown.grossTotalIncome')}
              value={formatIndianCurrency(result.grossTotalIncome)}
              highlight
            />
          </div>
        </div>
      </AccordionSection>

      {/* Deductions Breakdown */}
      <AccordionSection id="deductions" title={t('taxBreakdown.deductionsBreakdown')}>
        <div className="space-y-2">
          <DataRow
            label={t('taxBreakdown.standardDeduction')}
            value={formatIndianCurrency(result.deductionBreakdown.standardDeduction)}
          />
          {regime === 'old' && (
            <>
              <DataRow
                label={t('taxBreakdown.section80C')}
                value={formatIndianCurrency(result.deductionBreakdown.section80C)}
              />
              <DataRow
                label={t('taxBreakdown.section80D')}
                value={formatIndianCurrency(result.deductionBreakdown.section80D)}
              />
              <DataRow
                label={t('taxBreakdown.hraExemption')}
                value={formatIndianCurrency(result.deductionBreakdown.hra)}
              />
              <DataRow
                label={t('taxBreakdown.otherDeductions')}
                value={formatIndianCurrency(result.deductionBreakdown.other)}
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

          {/* Slab-wise Calculation */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              {t('taxBreakdown.slabWiseCalculation')}
            </h4>
            <SlabTable regime={regime} taxableIncome={result.taxableIncome} />
          </div>

          {/* Tax Components */}
          <div className="space-y-2 mt-4">
            <DataRow
              label={t('taxBreakdown.taxOnSlabs')}
              value={formatIndianCurrency(result.taxBreakdown.slabTax)}
            />
            {result.taxBreakdown.surcharge > 0 && (
              <DataRow
                label={t('taxBreakdown.surcharge')}
                value={formatIndianCurrency(result.taxBreakdown.surcharge)}
              />
            )}
            <DataRow
              label={t('taxBreakdown.cess')}
              value={formatIndianCurrency(result.taxBreakdown.cess)}
            />
            {result.rebate87A && result.rebate87A > 0 && (
              <DataRow
                label={t('taxBreakdown.rebate87A')}
                value={`-${formatIndianCurrency(result.rebate87A)}`}
              />
            )}
            <div className="border-t-2 border-red-300 mt-2 pt-2">
              <DataRow
                label={t('taxBreakdown.finalTaxLiability')}
                value={formatIndianCurrency(result.totalTaxLiability)}
                highlight
              />
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* How is my tax calculated? */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          {t('taxBreakdown.howCalculated')}
        </h3>
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
          {result.rebate87A && result.rebate87A > 0 && (
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

// Slab Table Component
function SlabTable({ regime, taxableIncome }: { regime: 'old' | 'new'; taxableIncome: number }) {
  const { t } = useTranslation();

  const oldRegimeSlabs = [
    { from: 0, to: 250000, rate: 0 },
    { from: 250000, to: 500000, rate: 5 },
    { from: 500000, to: 1000000, rate: 20 },
    { from: 1000000, to: Infinity, rate: 30 },
  ];

  const newRegimeSlabs = [
    { from: 0, to: 300000, rate: 0 },
    { from: 300000, to: 700000, rate: 5 },
    { from: 700000, to: 1000000, rate: 10 },
    { from: 1000000, to: 1200000, rate: 15 },
    { from: 1200000, to: 1500000, rate: 20 },
    { from: 1500000, to: Infinity, rate: 30 },
  ];

  const slabs = regime === 'old' ? oldRegimeSlabs : newRegimeSlabs;

  const getSlabColor = (rate: number): string => {
    if (rate === 0) return 'bg-green-100 text-green-800';
    if (rate === 5) return 'bg-yellow-100 text-yellow-800';
    if (rate === 10) return 'bg-orange-100 text-orange-800';
    if (rate === 15) return 'bg-red-100 text-red-800';
    if (rate === 20) return 'bg-red-200 text-red-900';
    return 'bg-red-300 text-red-950';
  };

  const isSlabApplicable = (from: number, to: number): boolean => {
    return taxableIncome > from;
  };

  const calculateSlabTax = (from: number, to: number, rate: number): number => {
    if (taxableIncome <= from) return 0;
    const applicableIncome = Math.min(taxableIncome, to) - from;
    return (applicableIncome * rate) / 100;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
              {t('taxBreakdown.incomeRange')}
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
          {slabs.map((slab, index) => {
            const applicable = isSlabApplicable(slab.from, slab.to);
            const slabTax = calculateSlabTax(slab.from, slab.to, slab.rate);

            return (
              <tr
                key={index}
                className={applicable ? 'bg-blue-50' : 'bg-white'}
              >
                <td className="px-4 py-3 text-gray-700">
                  {formatIndianCurrency(slab.from)} -{' '}
                  {slab.to === Infinity ? t('taxBreakdown.above') : formatIndianCurrency(slab.to)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${getSlabColor(slab.rate)}`}>
                    {slab.rate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  {applicable ? formatIndianCurrency(slabTax) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
