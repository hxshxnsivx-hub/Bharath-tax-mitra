/**
 * ReviewWarnings — display + explicit-override UI (tasks 3.1.1 / 3.1.2).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import { ReviewWarnings } from '../ReviewWarnings';
import type { ValidationIssue, Anomaly } from '../../utils/taxValidation';

// messageKeys below now resolve to real en.json translations, so the
// defaultMessage text here must match those translations exactly — the
// component renders whichever the i18n key resolves to.
const issue: ValidationIssue = {
  id: 'test-issue',
  field: 'deductions.rentPaid',
  messageKey: 'validation.hraWithoutReceived',
  defaultMessage: 'Rent paid is entered but no HRA was received in salary — HRA exemption cannot be claimed.',
};

const anomaly: Anomaly = {
  id: 'high-tds-ratio',
  messageKey: 'anomaly.highTds',
  defaultMessage: 'TDS deducted is more than 50% of your gross salary — this is unusually high. Please verify the quarterly TDS figures.',
};

function renderWarnings(props: Partial<React.ComponentProps<typeof ReviewWarnings>> = {}) {
  const onAcknowledge = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <ReviewWarnings
        issues={[issue]}
        anomalies={[anomaly]}
        acknowledgedIds={new Set()}
        onAcknowledge={onAcknowledge}
        {...props}
      />
    </I18nextProvider>
  );
  return onAcknowledge;
}

describe('ReviewWarnings', () => {
  it('renders nothing when there are no issues or anomalies', () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <ReviewWarnings issues={[]} anomalies={[]} acknowledgedIds={new Set()} onAcknowledge={vi.fn()} />
      </I18nextProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows validation issues without needing acknowledgement', () => {
    renderWarnings();
    expect(screen.getByText(issue.defaultMessage)).toBeInTheDocument();
  });

  it('shows an unacknowledged anomaly with an acknowledge button', () => {
    renderWarnings();
    expect(screen.getByText(anomaly.defaultMessage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reviewed this/i })).toBeInTheDocument();
  });

  it('calls onAcknowledge with the anomaly id when clicked', () => {
    const onAcknowledge = renderWarnings();
    fireEvent.click(screen.getByRole('button', { name: /reviewed this/i }));
    expect(onAcknowledge).toHaveBeenCalledWith('high-tds-ratio');
  });

  it('shows a "Reviewed" state and no button once acknowledged', () => {
    renderWarnings({ acknowledgedIds: new Set(['high-tds-ratio']) });
    expect(screen.getByText(/reviewed ✓/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reviewed this/i })).toBeNull();
  });
});
