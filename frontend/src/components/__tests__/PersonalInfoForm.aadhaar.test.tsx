/**
 * Regression: Aadhaar masked-input corruption.
 *
 * The input used to render the privacy mask (XXXX-XXXX-1234) and feed it back
 * through onChange on any edit — formatAadhaar stripped the Xs, destroying the
 * first 8 real digits, and the field then failed "must be 12 digits" on data
 * the user had entered correctly (also autosaving the corrupted fragment).
 *
 * Contract now: masked AT REST (blurred), real digits while focused, state
 * never round-trips through the mask.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import { PersonalInfoForm } from '../PersonalInfoForm';

function renderForm(initialData?: { aadhaar?: string }) {
  return render(
    <I18nextProvider i18n={i18n}>
      <PersonalInfoForm sessionId="test-session" initialData={initialData} />
    </I18nextProvider>
  );
}

const aadhaarInput = () => screen.getByLabelText(/aadhaar/i) as HTMLInputElement;

describe('PersonalInfoForm — Aadhaar masking (regression)', () => {
  it('shows real digits while focused, mask only after blur', async () => {
    const user = userEvent.setup();
    renderForm();

    const input = aadhaarInput();
    await user.click(input);
    await user.keyboard('123456787676');

    // Focused: real formatted digits visible (editing operates on real state)
    expect(input.value).toBe('1234-5678-7676');

    await user.tab(); // blur
    expect(input.value).toBe('XXXX-XXXX-7676');
    // Valid 12-digit value → no error despite the masked display
    expect(screen.queryByText(/12 digits|12 अंक/i)).toBeNull();
  });

  it('editing a completed Aadhaar does NOT corrupt state through the mask', async () => {
    const user = userEvent.setup();
    renderForm({ aadhaar: '1234-5678-7676' }); // draft-restored complete value

    const input = aadhaarInput();
    expect(input.value).toBe('XXXX-XXXX-7676'); // masked at rest

    // Focus reveals the real digits — the mask never enters onChange
    await user.click(input);
    expect(input.value).toBe('1234-5678-7676');

    // Backspace one digit and retype it — previously this collapsed the value
    // to a 4-digit fragment ("7676") via the mask round-trip
    await user.keyboard('{End}{Backspace}6');
    expect(input.value).toBe('1234-5678-7676');

    await user.tab();
    expect(input.value).toBe('XXXX-XXXX-7676');
    expect(screen.queryByText(/12 digits|12 अंक/i)).toBeNull();
  });
});
