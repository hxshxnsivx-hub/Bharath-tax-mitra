/**
 * ConsentDialog — informed consent before PII collection (task 4.1.3).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import { ConsentDialog } from '../ConsentDialog';
import { hasStoredConsent, clearConsent, CONSENT_STORAGE_KEY } from '../../utils/consent';

function renderConsent() {
  const onConsent = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <ConsentDialog open onConsent={onConsent} onOpenChange={onOpenChange} />
    </I18nextProvider>
  );
  return { onConsent, onOpenChange };
}

describe('ConsentDialog', () => {
  beforeEach(() => clearConsent());
  afterEach(() => {
    clearConsent();
    vi.restoreAllMocks();
  });

  it('names exactly what will be processed and the retention promise', () => {
    renderConsent();
    expect(screen.getByText(/PAN, Aadhaar and bank details/i)).toBeInTheDocument();
    expect(screen.getByText(/deleted after 24 hours/i)).toBeInTheDocument();
  });

  it('keeps the primary action disabled until the box is ticked', () => {
    const { onConsent } = renderConsent();
    const btn = screen.getByRole('button', { name: /agree & continue/i });
    expect(btn).toBeDisabled();

    fireEvent.click(screen.getByTestId('consent-checkbox'));
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    expect(onConsent).toHaveBeenCalled();
  });

  it('does not grant consent if confirm is somehow invoked unchecked', () => {
    const { onConsent } = renderConsent();
    fireEvent.click(screen.getByRole('button', { name: /agree & continue/i }));
    expect(onConsent).not.toHaveBeenCalled();
    expect(hasStoredConsent()).toBe(false);
  });

  it('persists consent so the user is asked only once per device', () => {
    renderConsent();
    expect(hasStoredConsent()).toBe(false);
    fireEvent.click(screen.getByTestId('consent-checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /agree & continue/i }));
    expect(hasStoredConsent()).toBe(true);
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted');
  });

  it('treats blocked storage as "not consented" rather than throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    expect(hasStoredConsent()).toBe(false);
  });
});
