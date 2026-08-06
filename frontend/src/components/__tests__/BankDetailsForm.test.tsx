/**
 * BankDetailsForm — refund account entry (task 3.3.1).
 * Covers IFSC validation, online bank lookup (mocked), account-confirm match,
 * and the completed-details callback contract.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import { BankDetailsForm } from '../BankDetailsForm';

function renderForm(onChange = vi.fn()) {
  render(
    <I18nextProvider i18n={i18n}>
      <BankDetailsForm onChange={onChange} />
    </I18nextProvider>
  );
  return onChange;
}

describe('BankDetailsForm', () => {
  beforeEach(() => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    // stubGlobal (not direct assignment) so unstubAllGlobals fully restores
    // fetch — a leaked mock breaks other suites (e.g. the lazy ResultsView).
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({ BANK: 'HDFC Bank', BRANCH: 'MG Road' }) })
      )
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('rejects a malformed IFSC and keeps details incomplete', () => {
    const onChange = renderForm();
    fireEvent.change(screen.getByLabelText(/IFSC/i), { target: { value: 'BADIFSC' } });
    expect(screen.getByText(/AAAA0XXXXXX/i)).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('auto-fills bank name from the IFSC lookup when online', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/IFSC/i), { target: { value: 'HDFC0001234' } });
    await waitFor(() => expect(screen.getByText(/HDFC Bank · MG Road/)).toBeInTheDocument());
    expect((screen.getByLabelText(/Bank Name/i) as HTMLInputElement).value).toBe('HDFC Bank');
  });

  it('emits completed details only when IFSC + matching account + bank name are all valid', async () => {
    const onChange = renderForm();
    fireEvent.change(screen.getByLabelText(/IFSC/i), { target: { value: 'HDFC0001234' } });
    await waitFor(() => expect(screen.getByText(/HDFC Bank/)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/^Account Number/i), { target: { value: '50100123456789' } });
    // Mismatched confirmation → still incomplete
    fireEvent.change(screen.getByLabelText(/Re-enter Account Number/i), { target: { value: '5010012345' } });
    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(null);

    // Matching confirmation → completed callback fires
    fireEvent.change(screen.getByLabelText(/Re-enter Account Number/i), { target: { value: '50100123456789' } });
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        ifsc: 'HDFC0001234',
        bankName: 'HDFC Bank',
        accountNo: '50100123456789',
      })
    );
  });

  it('falls back to manual bank entry when the lookup fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    renderForm();
    fireEvent.change(screen.getByLabelText(/IFSC/i), { target: { value: 'ICIC0000456' } });
    await waitFor(() => expect(screen.getByText(/Enter your bank name/i)).toBeInTheDocument());
  });
});
