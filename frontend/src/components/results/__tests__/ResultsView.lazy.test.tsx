import { describe, it, expect, vi } from 'vitest';
import { lazy, Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n/config';
import { ResultsSkeleton } from '../../feedback/Skeleton';
import type { RegimeComparisonResult, TaxCalculationResult } from '../../../../../shared/types/tax-calculation';

// Lazily import the heavy results view exactly as MainApp does, so this test
// exercises the React.lazy + Suspense code-splitting path (skeleton fallback
// shows first, then the resolved chunk renders).
const ResultsView = lazy(() => import('../ResultsView'));

const baseRegime = (regime: 'old' | 'new'): TaxCalculationResult => ({
  regime,
  grossTotalIncome: 1500000,
  incomeBreakdown: { salary: 1500000, houseProperty: 0, businessIncome: 0, capitalGains: 0, otherSources: 0 },
  totalDeductions: regime === 'old' ? 200000 : 50000,
  taxableIncome: regime === 'old' ? 1300000 : 1450000,
  totalTaxLiability: regime === 'old' ? 195000 : 165000,
  effectiveTaxRate: regime === 'old' ? 13.0 : 11.0,
  takeHomeIncome: regime === 'old' ? 1305000 : 1335000,
  deductionBreakdown: {
    standardDeduction: 50000,
    section80C: regime === 'old' ? 150000 : 0,
    section80CCD1B: 0,
    section80D: 0,
    section80E: 0,
    section80G: 0,
    hra: 0,
    professionalTax: 0,
  },
  slabWiseTax: [{ slab: '₹5L - ₹10L', income: 500000, rate: 20, tax: 100000 }],
  taxBeforeSurcharge: regime === 'old' ? 187500 : 158654,
  surcharge: 0,
  surchargeRate: 0,
  taxAfterSurcharge: regime === 'old' ? 187500 : 158654,
  cess: regime === 'old' ? 7500 : 6346,
  cessRate: 4,
  rebate87A: 0,
});

const mockComparison: RegimeComparisonResult = {
  oldRegime: baseRegime('old'),
  newRegime: baseRegime('new'),
  recommendedRegime: 'new',
  savings: 30000,
  savingsPercentage: 15.38,
  deductionsLost: 150000,
  analysis: {
    oldRegimeBenefits: ['You can claim ₹2,00,000 in deductions'],
    newRegimeBenefits: ['Lower effective tax rate: 11.00% vs 13.00%'],
    recommendation: 'New Regime is recommended. You will save ₹30,000 (15.4%).',
  },
};

function renderLazy(regimeComparison: RegimeComparisonResult | null) {
  return render(
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={<ResultsSkeleton />}>
        <ResultsView
          regimeComparison={regimeComparison}
          calculatedOffline={false}
          selectedRegime="new"
          setSelectedRegime={vi.fn()}
          completenessScore={100}
          tdsPaid={0}
          onEnterSalary={vi.fn()}
          taxData={{ personalInfo: {}, salary: null, deductions: null, business: null }}
          acknowledgedAnomalyIds={new Set()}
          onAcknowledgeAnomaly={vi.fn()}
        />
      </Suspense>
    </I18nextProvider>
  );
}

describe('ResultsView (lazy + Suspense)', () => {
  it('shows the skeleton fallback first, then resolves the heavy results content', async () => {
    renderLazy(mockComparison);

    // Before the lazy chunk resolves, the skeleton fallback is visible.
    expect(screen.getByTestId('results-skeleton')).toBeInTheDocument();

    // After the dynamic import resolves, the real results render and the
    // skeleton is removed.
    expect(
      await screen.findByText(/Tax Regime Comparison/i, {}, { timeout: 15000 })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('results-skeleton')).not.toBeInTheDocument();
  });

  it('renders the empty state behind Suspense when no calculation exists', async () => {
    renderLazy(null);

    expect(
      await screen.findByText(/No Calculation Yet/i, {}, { timeout: 15000 })
    ).toBeInTheDocument();
  });
});
