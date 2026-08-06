import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RegimeComparison } from '../RegimeComparison';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import type { RegimeComparisonResult } from '../../../../shared/types/tax-calculation';

const mockComparison: RegimeComparisonResult = {
  oldRegime: {
    regime: 'old',
    grossTotalIncome: 1500000,
    incomeBreakdown: { salary: 1500000, houseProperty: 0, businessIncome: 0, capitalGains: 0, otherSources: 0 },
    totalDeductions: 200000,
    taxableIncome: 1300000,
    totalTaxLiability: 195000,
    effectiveTaxRate: 13.0,
    takeHomeIncome: 1305000,
    deductionBreakdown: {
      standardDeduction: 50000,
      section80C: 150000,
      section80CCD1B: 0,
      section80D: 0,
      section80E: 0,
      section80G: 0,
      hra: 0,
      professionalTax: 0,
    },
    slabWiseTax: [
      { slab: '₹2.5L - ₹5L', income: 250000, rate: 5, tax: 12500 },
      { slab: '₹5L - ₹10L', income: 500000, rate: 20, tax: 100000 },
      { slab: 'Above ₹10L', income: 300000, rate: 30, tax: 90000 },
    ],
    taxBeforeSurcharge: 187500,
    surcharge: 0,
    surchargeRate: 0,
    taxAfterSurcharge: 187500,
    cess: 7500,
    cessRate: 4,
    rebate87A: 0,
  },
  newRegime: {
    regime: 'new',
    grossTotalIncome: 1500000,
    incomeBreakdown: { salary: 1500000, houseProperty: 0, businessIncome: 0, capitalGains: 0, otherSources: 0 },
    totalDeductions: 50000,
    taxableIncome: 1450000,
    totalTaxLiability: 165000,
    effectiveTaxRate: 11.0,
    takeHomeIncome: 1335000,
    deductionBreakdown: {
      standardDeduction: 50000,
      section80C: 0,
      section80CCD1B: 0,
      section80D: 0,
      section80E: 0,
      section80G: 0,
      hra: 0,
      professionalTax: 0,
    },
    slabWiseTax: [
      { slab: '₹3L - ₹6L', income: 300000, rate: 5, tax: 15000 },
      { slab: '₹6L - ₹9L', income: 300000, rate: 10, tax: 30000 },
      { slab: '₹9L - ₹12L', income: 300000, rate: 15, tax: 45000 },
      { slab: '₹12L - ₹15L', income: 250000, rate: 20, tax: 50000 },
      { slab: 'Above ₹15L', income: 0, rate: 30, tax: 0 },
    ],
    taxBeforeSurcharge: 158654,
    surcharge: 0,
    surchargeRate: 0,
    taxAfterSurcharge: 158654,
    cess: 6346,
    cessRate: 4,
    rebate87A: 0,
  },
  recommendedRegime: 'new',
  savings: 30000,
  savingsPercentage: 15.38,
  deductionsLost: 150000,
  analysis: {
    oldRegimeBenefits: [
      'You can claim ₹2,00,000 in deductions',
      'Section 80C deductions: ₹1,50,000',
    ],
    newRegimeBenefits: [
      'Lower effective tax rate: 11.00% vs 13.00%',
      'Simpler tax filing with fewer deductions to track',
    ],
    recommendation:
      'New Regime is recommended. You will save ₹30,000 (15.4%) with lower tax rates.',
  },
};

describe('RegimeComparison', () => {
  const mockOnRegimeSelect = vi.fn();

  const renderComponent = (comparison = mockComparison, selectedRegime?: 'old' | 'new') => {
    return render(
      <I18nextProvider i18n={i18n}>
        <RegimeComparison
          comparison={comparison}
          onRegimeSelect={mockOnRegimeSelect}
          selectedRegime={selectedRegime}
        />
      </I18nextProvider>
    );
  };

  it('renders regime comparison with both regimes', () => {
    renderComponent();

    expect(screen.getByText(/Tax Regime Comparison/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Old Regime/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/New Regime/i).length).toBeGreaterThan(0);
  });

  it('displays recommended regime badge', () => {
    renderComponent();

    // "Recommended" appears in the badge (and the recommendation sentence);
    // assert the badge is rendered at least once.
    const badges = screen.getAllByText(/Recommended/i);
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('shows savings highlight when savings > ₹5,000', () => {
    renderComponent();

    expect(screen.getByText(/Potential Savings/i)).toBeInTheDocument();
    // ₹30,000 / 15.4% appear in the highlight, recommendation text and table
    expect(screen.getAllByText(/₹30,000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/15.4%/).length).toBeGreaterThan(0);
  });

  it('does not show savings highlight when savings ≤ ₹5,000', () => {
    const lowSavingsComparison = {
      ...mockComparison,
      savings: 3000,
    };

    renderComponent(lowSavingsComparison);

    expect(screen.queryByText(/Potential Savings/i)).not.toBeInTheDocument();
  });

  it('displays all key metrics for both regimes', () => {
    renderComponent();

    // Values appear in both the summary cards and the comparison table
    expect(screen.getAllByText(/₹15,00,000/).length).toBeGreaterThan(0); // gross income
    expect(screen.getAllByText(/₹2,00,000/).length).toBeGreaterThan(0);  // old deductions
    expect(screen.getAllByText(/₹50,000/).length).toBeGreaterThan(0);    // new deductions
    expect(screen.getAllByText(/₹1,95,000/).length).toBeGreaterThan(0);  // old tax liability
    expect(screen.getAllByText(/₹1,65,000/).length).toBeGreaterThan(0);  // new tax liability
  });

  it('displays effective tax rates', () => {
    renderComponent();

    expect(screen.getAllByText(/13.00%/).length).toBeGreaterThan(0); // Old regime
    expect(screen.getAllByText(/11.00%/).length).toBeGreaterThan(0); // New regime
  });

  it('displays take-home income for both regimes', () => {
    renderComponent();

    expect(screen.getAllByText(/₹13,05,000/).length).toBeGreaterThan(0); // Old regime
    expect(screen.getAllByText(/₹13,35,000/).length).toBeGreaterThan(0); // New regime
  });

  it('shows deductions lost warning', () => {
    renderComponent();

    expect(screen.getByText(/Deductions Not Available in New Regime/i)).toBeInTheDocument();
    expect(screen.getAllByText(/₹1,50,000/).length).toBeGreaterThan(0);
  });

  it('displays benefits for both regimes', () => {
    renderComponent();

    expect(screen.getByText(/You can claim ₹2,00,000 in deductions/)).toBeInTheDocument();
    expect(screen.getByText(/Lower effective tax rate/)).toBeInTheDocument();
    expect(screen.getByText(/Simpler tax filing/)).toBeInTheDocument();
  });

  it('allows switching between regimes', () => {
    renderComponent();

    // Radio inputs are [old, new]; selecting the new-regime radio fires the callback
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[1]);

    expect(mockOnRegimeSelect).toHaveBeenCalledWith('new');
  });

  it('highlights selected regime with border and shadow', () => {
    const { container } = renderComponent(mockComparison, 'old');

    const oldRegimeCard = container.querySelector('.border-blue-500');
    expect(oldRegimeCard).toBeInTheDocument();
  });

  it('displays quick comparison table with differences', () => {
    renderComponent();

    expect(screen.getByText(/Metric/i)).toBeInTheDocument();
    expect(screen.getByText(/Difference/i)).toBeInTheDocument();

    // Check difference column shows savings
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(4);
  });

  it('shows switch regime button', () => {
    renderComponent();

    const switchButton = screen.getByRole('button', { name: /Switch to/i });
    expect(switchButton).toBeInTheDocument();
  });

  it('toggles regime when switch button is clicked', () => {
    renderComponent(mockComparison, 'old');

    const switchButton = screen.getByRole('button', { name: /Switch to New Regime/i });
    fireEvent.click(switchButton);

    expect(mockOnRegimeSelect).toHaveBeenCalledWith('new');
  });

  it('displays recommendation text', () => {
    renderComponent();

    expect(
      screen.getByText(/New Regime is recommended. You will save ₹30,000/)
    ).toBeInTheDocument();
  });

  it('handles case where old regime is recommended', () => {
    const oldRegimeRecommended = {
      ...mockComparison,
      recommendedRegime: 'old' as const,
      analysis: {
        ...mockComparison.analysis,
        recommendation:
          'Old Regime is recommended. You will save ₹30,000 (15.4%) by utilizing available deductions.',
      },
    };

    renderComponent(oldRegimeRecommended);

    expect(screen.getByText(/Old Regime is recommended/)).toBeInTheDocument();
  });

  it('handles similar tax liability case', () => {
    const similarTax = {
      ...mockComparison,
      savings: 2000,
      analysis: {
        ...mockComparison.analysis,
        recommendation:
          'Both regimes result in similar tax liability (difference: ₹2,000). Consider the New Regime for simpler filing.',
      },
    };

    renderComponent(similarTax);

    expect(screen.getByText(/Both regimes result in similar tax liability/)).toBeInTheDocument();
  });
});
