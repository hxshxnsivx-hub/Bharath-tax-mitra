import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeductionsForm } from '../DeductionsForm';
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

describe('DeductionsForm', () => {
  const mockOnSave = vi.fn();
  const sessionId = 'test-session-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = (initialData = {}) => {
    return render(
      <I18nextProvider i18n={i18n}>
        <DeductionsForm sessionId={sessionId} initialData={initialData} onSave={mockOnSave} />
      </I18nextProvider>
    );
  };

  it('renders deductions form with all sections', () => {
    renderForm();

    expect(screen.getAllByText(/Deductions/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Section 80C/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Section 80D/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/House Rent Allowance/i)).toBeInTheDocument();
    expect(screen.getByText(/Other Deductions/i)).toBeInTheDocument();
  });

  it('calculates Section 80C total and remaining limit', () => {
    renderForm({
      lic: 50000,
      ppf: 70000,
      elss: 40000,
    });

    // Total: 50k + 70k + 40k = 160k (exceeds 150k limit)
    // Remaining: 0
    expect(screen.getByText(/Remaining/i)).toBeInTheDocument();
    expect(screen.getAllByText(/₹0/).length).toBeGreaterThan(0);
  });

  it('shows warning when Section 80C exceeds limit', () => {
    renderForm({
      lic: 100000,
      ppf: 60000,
    });

    expect(screen.getByText(/exceed the ₹1.5L limit/i)).toBeInTheDocument();
  });

  it('calculates Section 80D with senior citizen limits', () => {
    renderForm({
      healthInsuranceSelf: 30000,
      isSelfSeniorCitizen: true,
      healthInsuranceParents: 30000,
      isParentSeniorCitizen: true,
    });

    // Self: min(30k, 50k) = 30k (senior limit)
    // Parents: min(30k, 50k) = 30k (senior limit)
    // Total: 60k
    expect(screen.getAllByText(/₹60,000/).length).toBeGreaterThan(0);
  });

  it('requires landlord PAN when rent exceeds ₹1 lakh', async () => {
    renderForm({
      rentPaid: 150000,
    });

    const submitButton = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Landlord PAN is required/i)).toBeInTheDocument();
    });
  });

  it('validates landlord PAN format', async () => {
    renderForm({
      rentPaid: 150000,
    });

    const panInput = screen.getByLabelText(/Landlord PAN/i);

    // Invalid PAN
    fireEvent.change(panInput, { target: { value: 'INVALID' } });
    fireEvent.blur(panInput);

    await waitFor(() => {
      expect(screen.getByText(/PAN format should be/i)).toBeInTheDocument();
    });

    // Valid PAN
    fireEvent.change(panInput, { target: { value: 'ABCDE1234F' } });
    fireEvent.blur(panInput);

    await waitFor(() => {
      expect(screen.queryByText(/PAN format should be/i)).not.toBeInTheDocument();
    });
  });

  it('does not require landlord PAN when rent is below ₹1 lakh', () => {
    renderForm({
      rentPaid: 90000,
    });

    const panInput = screen.getByLabelText(/Landlord PAN/i);
    expect(panInput).not.toBeRequired();
  });

  it('calculates total deductions correctly', () => {
    renderForm({
      lic: 50000,
      ppf: 50000,
      elss: 50000, // 80C: 150k (at limit)
      healthInsuranceSelf: 25000, // 80D: 25k
      npsAdditional: 50000, // 80CCD(1B): 50k
      donations: 10000, // 80G: 10k
      educationLoanInterest: 20000, // 80E: 20k
    });

    // Total: 150k + 25k + 50k + 10k + 20k = 255k
    expect(screen.getByText(/₹2,55,000/)).toBeInTheDocument();
  });

  it('shows anomaly warning when deductions exceed 50% of income', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <I18nextProvider i18n={i18n}>
        <DeductionsForm
          sessionId={sessionId}
          initialData={{ lic: 150000, healthInsuranceSelf: 25000 }}
          basicSalary={240000}
          onSave={mockOnSave}
        />
      </I18nextProvider>
    );

    // Total deductions: 175k
    // Gross income (annual basic from salary form): 240k
    // Percentage: 72.9% > 50%

    const submitButton = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });

  it('applies different limits for senior citizens', () => {
    const { rerender } = renderForm({
      healthInsuranceSelf: 30000,
      isSelfSeniorCitizen: false,
    });

    // Non-senior limit: 25k
    expect(screen.getAllByText(/₹25,000/).length).toBeGreaterThan(0);

    // Change to senior citizen
    rerender(
      <I18nextProvider i18n={i18n}>
        <DeductionsForm
          sessionId={sessionId}
          initialData={{
            healthInsuranceSelf: 30000,
            isSelfSeniorCitizen: true,
          }}
          onSave={mockOnSave}
        />
      </I18nextProvider>
    );

    // Senior limit: 50k
    expect(screen.getAllByText(/₹50,000/).length).toBeGreaterThan(0);
  });

  it('validates numeric fields for non-negative values', async () => {
    renderForm();

    const licInput = screen.getByLabelText(/LIC Premium/i);

    fireEvent.change(licInput, { target: { value: '-1000' } });
    fireEvent.blur(licInput);

    await waitFor(() => {
      expect(screen.getByText(/Amount cannot be negative/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    renderForm();

    // Fill in some deductions
    fireEvent.change(screen.getByLabelText(/LIC Premium/i), {
      target: { value: '50000' },
    });
    fireEvent.change(screen.getByLabelText(/PPF Contribution/i), {
      target: { value: '70000' },
    });

    const submitButton = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          lic: 50000,
          ppf: 70000,
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
      lic: 1234567,
    });

    const licInput = screen.getByLabelText(/LIC Premium/i);
    expect(licInput).toHaveValue('12,34,567');
  });
});
