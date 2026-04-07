import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BusinessIncomeForm } from '../BusinessIncomeForm';
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

describe('BusinessIncomeForm', () => {
  const mockOnSave = vi.fn();
  const sessionId = 'test-session-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = (initialData = {}) => {
    return render(
      <I18nextProvider i18n={i18n}>
        <BusinessIncomeForm sessionId={sessionId} initialData={initialData} onSave={mockOnSave} />
      </I18nextProvider>
    );
  };

  it('renders business income form with Section 44AD info', () => {
    renderForm();

    expect(screen.getByText(/Business Income/i)).toBeInTheDocument();
    expect(screen.getByText(/Section 44AD/i)).toBeInTheDocument();
    expect(screen.getByText(/Presumptive taxation/i)).toBeInTheDocument();
  });

  it('displays Section 44AD information points', () => {
    renderForm();

    expect(screen.getByText(/turnover up to ₹2 crores/i)).toBeInTheDocument();
    expect(screen.getByText(/6% of digital receipts/i)).toBeInTheDocument();
    expect(screen.getByText(/No need to maintain detailed books/i)).toBeInTheDocument();
  });

  it('requires business type selection', async () => {
    renderForm();

    const submitButton = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Business type is required/i)).toBeInTheDocument();
    });
  });

  it('calculates presumptive income correctly (6% digital + 8% cash)', () => {
    renderForm({
      grossReceiptsDigital: 1000000, // ₹10L
      grossReceiptsCash: 500000, // ₹5L
    });

    // Digital: 1,000,000 * 6% = 60,000
    // Cash: 500,000 * 8% = 40,000
    // Total: 100,000
    expect(screen.getByText(/₹1,00,000/)).toBeInTheDocument();
  });

  it('shows total gross receipts', () => {
    renderForm({
      grossReceiptsDigital: 800000,
      grossReceiptsCash: 200000,
    });

    // Total: 800,000 + 200,000 = 1,000,000
    expect(screen.getByText(/₹10,00,000/)).toBeInTheDocument();
  });

  it('shows warning when receipts exceed ₹2 crore threshold', () => {
    renderForm({
      grossReceiptsDigital: 15000000, // ₹1.5 Cr
      grossReceiptsCash: 8000000, // ₹80L
    });

    // Total: 2.3 Cr (exceeds 2 Cr threshold)
    expect(screen.getByText(/Not Eligible for Section 44AD/i)).toBeInTheDocument();
    expect(screen.getByText(/exceed the ₹2 crore threshold/i)).toBeInTheDocument();
  });

  it('disables submit button when not eligible for Section 44AD', () => {
    renderForm({
      grossReceiptsDigital: 25000000, // ₹2.5 Cr
    });

    const submitButton = screen.getByRole('button', { name: /Continue/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when eligible for Section 44AD', () => {
    renderForm({
      businessType: 'retail',
      grossReceiptsDigital: 1000000,
    });

    const submitButton = screen.getByRole('button', { name: /Continue/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('updates presumptive income when receipts change', async () => {
    renderForm();

    const digitalInput = screen.getByLabelText(/Digital Receipts/i);
    
    fireEvent.change(digitalInput, { target: { value: '1000000' } });

    await waitFor(() => {
      // 1,000,000 * 6% = 60,000
      expect(screen.getByText(/₹60,000/)).toBeInTheDocument();
    });
  });

  it('shows breakdown of digital and cash income calculation', () => {
    renderForm({
      grossReceiptsDigital: 1000000,
      grossReceiptsCash: 500000,
    });

    expect(screen.getByText(/Income from Digital/i)).toBeInTheDocument();
    expect(screen.getByText(/Income from Cash/i)).toBeInTheDocument();
    expect(screen.getByText(/6%/)).toBeInTheDocument();
    expect(screen.getByText(/8%/)).toBeInTheDocument();
  });

  it('validates that at least one receipt type is entered', async () => {
    renderForm({
      businessType: 'retail',
    });

    const submitButton = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please enter at least one type of receipt/i)).toBeInTheDocument();
    });
  });

  it('validates numeric fields for non-negative values', async () => {
    renderForm();

    const digitalInput = screen.getByLabelText(/Digital Receipts/i);

    fireEvent.change(digitalInput, { target: { value: '-1000' } });
    fireEvent.blur(digitalInput);

    await waitFor(() => {
      expect(screen.getByText(/Amount cannot be negative/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    renderForm();

    // Select business type
    const businessTypeSelect = screen.getByLabelText(/Business Type/i);
    fireEvent.change(businessTypeSelect, { target: { value: 'retail' } });

    // Enter receipts
    fireEvent.change(screen.getByLabelText(/Digital Receipts/i), {
      target: { value: '1000000' },
    });
    fireEvent.change(screen.getByLabelText(/Cash Receipts/i), {
      target: { value: '500000' },
    });

    const submitButton = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          businessType: 'retail',
          grossReceiptsDigital: 1000000,
          grossReceiptsCash: 500000,
          presumptiveIncome: 100000, // 60k + 40k
        })
      );
    });
  });

  it('displays all business type options', () => {
    renderForm();

    const businessTypeSelect = screen.getByLabelText(/Business Type/i);
    fireEvent.click(businessTypeSelect);

    expect(screen.getByText(/Retail Trade/i)).toBeInTheDocument();
    expect(screen.getByText(/Wholesale Trade/i)).toBeInTheDocument();
    expect(screen.getByText(/Manufacturing/i)).toBeInTheDocument();
    expect(screen.getByText(/Services/i)).toBeInTheDocument();
    expect(screen.getByText(/Professional Services/i)).toBeInTheDocument();
    expect(screen.getByText(/Trading/i)).toBeInTheDocument();
  });

  it('formats currency in Indian numbering system', () => {
    renderForm({
      grossReceiptsDigital: 1234567,
    });

    const digitalInput = screen.getByLabelText(/Digital Receipts/i);
    expect(digitalInput).toHaveValue('12,34,567');
  });

  it('displays tooltips for contextual help', () => {
    renderForm();

    const tooltips = screen.getAllByRole('img', { hidden: true });
    expect(tooltips.length).toBeGreaterThan(0);
  });

  it('calculates correctly at ₹2 crore threshold boundary', () => {
    renderForm({
      businessType: 'retail',
      grossReceiptsDigital: 20000000, // Exactly ₹2 Cr
    });

    // Should be eligible (at threshold, not exceeding)
    const submitButton = screen.getByRole('button', { name: /Continue/i });
    expect(submitButton).not.toBeDisabled();
    expect(screen.queryByText(/Not Eligible/i)).not.toBeInTheDocument();
  });

  it('shows ineligibility when exceeding threshold by ₹1', () => {
    renderForm({
      grossReceiptsDigital: 20000001, // ₹2 Cr + ₹1
    });

    expect(screen.getByText(/Not Eligible for Section 44AD/i)).toBeInTheDocument();
  });
});
