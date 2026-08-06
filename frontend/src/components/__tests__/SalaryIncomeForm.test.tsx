import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SalaryIncomeForm } from '../SalaryIncomeForm';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';

// Mock IndexedDB
vi.mock('../../lib/db', () => ({
  db: {
    savedDrafts: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

describe('SalaryIncomeForm', () => {
  const mockOnSave = vi.fn();
  const sessionId = 'test-session-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = (initialData = {}) => {
    return render(
      <I18nextProvider i18n={i18n}>
        <SalaryIncomeForm
          sessionId={sessionId}
          initialData={initialData}
          onSave={mockOnSave}
        />
      </I18nextProvider>
    );
  };

  it('renders salary income form with all sections', () => {
    renderForm();

    expect(screen.getByText(/Salary Income/i)).toBeInTheDocument();
    expect(screen.getByText(/Employer Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Income Details/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Deductions from Salary/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Tax Deducted at Source/i)).toBeInTheDocument();
  });

  it('displays standard deduction as auto-filled ₹50,000', () => {
    renderForm();

    const standardDeductionInput = screen.getByLabelText(/Standard Deduction/i);
    expect(standardDeductionInput).toHaveValue('50,000');
    expect(standardDeductionInput).toBeDisabled();
  });

  it('validates employer TAN format', async () => {
    renderForm();

    const tanInput = screen.getByLabelText(/Employer TAN/i);
    
    // Invalid TAN
    fireEvent.change(tanInput, { target: { value: 'INVALID' } });
    fireEvent.blur(tanInput);

    await waitFor(() => {
      expect(screen.getByText(/TAN format should be/i)).toBeInTheDocument();
    });

    // Valid TAN
    fireEvent.change(tanInput, { target: { value: 'ABCD12345E' } });
    fireEvent.blur(tanInput);

    await waitFor(() => {
      expect(screen.queryByText(/TAN format should be/i)).not.toBeInTheDocument();
    });
  });

  it('validates numeric fields for non-negative values', async () => {
    renderForm();

    const grossSalaryInput = screen.getByLabelText(/Gross Salary/i);
    
    // Try to enter negative value (should be prevented by validation)
    fireEvent.change(grossSalaryInput, { target: { value: '-1000' } });
    fireEvent.blur(grossSalaryInput);

    await waitFor(() => {
      expect(screen.getByText(/Amount cannot be negative/i)).toBeInTheDocument();
    });
  });

  it('calculates net taxable salary in real-time', () => {
    renderForm({
      grossSalary: 1000000,
      hraReceived: 200000,
      specialAllowance: 100000,
      otherAllowances: 50000,
      professionalTax: 2500,
      otherDeductions: 10000,
    });

    // Total Income: 1,000,000 + 200,000 + 100,000 + 50,000 = 1,350,000
    // Total Deductions: 50,000 (standard) + 2,500 + 10,000 = 62,500
    // Net Taxable: 1,350,000 - 62,500 = 1,287,500

    expect(screen.getByText(/₹13,50,000/)).toBeInTheDocument(); // Total Income
    expect(screen.getByText(/₹62,500/)).toBeInTheDocument(); // Total Deductions
    expect(screen.getByText(/₹12,87,500/)).toBeInTheDocument(); // Net Taxable
  });

  it('calculates total TDS from quarterly values', () => {
    renderForm({
      tdsQ1: 10000,
      tdsQ2: 15000,
      tdsQ3: 12000,
      tdsQ4: 18000,
    });

    // Total TDS: 10,000 + 15,000 + 12,000 + 18,000 = 55,000
    expect(screen.getByText(/₹55,000/)).toBeInTheDocument();
  });

  it('validates employer name is required', async () => {
    renderForm();

    const submitButton = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Employer name is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    renderForm();

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Employer Name/i), {
      target: { value: 'Test Company Ltd' },
    });
    fireEvent.change(screen.getByLabelText(/Employer TAN/i), {
      target: { value: 'ABCD12345E' },
    });
    fireEvent.change(screen.getByLabelText(/Gross Salary/i), {
      target: { value: '1000000' },
    });

    const submitButton = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          employerName: 'Test Company Ltd',
          employerTAN: 'ABCD12345E',
          grossSalary: 1000000,
          standardDeduction: 50000,
        })
      );
    });
  });

  it('displays tooltips for contextual help', () => {
    renderForm();

    const tooltips = screen.getAllByRole('img', { hidden: true });
    expect(tooltips.length).toBeGreaterThan(0);
  });

  it('formats currency in Indian numbering system', () => {
    renderForm({
      grossSalary: 1234567,
    });

    // Should display as ₹12,34,567 (lakhs/crores format)
    const grossSalaryInput = screen.getByLabelText(/Gross Salary/i);
    expect(grossSalaryInput).toHaveValue('12,34,567');
  });
});
