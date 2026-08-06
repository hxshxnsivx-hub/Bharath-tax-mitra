/**
 * ConflictResolver dialog (task 4.10.2).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import { ConflictResolver } from '../ConflictResolver';
import { detectConflicts } from '../../services/conflictResolution';

const conflict = detectConflicts(
  { sessionId: 's1', grossSalary: 1_300_000, completenessScore: 90, updatedAt: 2000 },
  { sessionId: 's1', grossSalary: 1_200_000, completenessScore: 60, updatedAt: 1000 }
);

function renderResolver(open = true) {
  const onResolve = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <ConflictResolver conflict={conflict} open={open} onResolve={onResolve} onOpenChange={vi.fn()} />
    </I18nextProvider>
  );
  return onResolve;
}

describe('ConflictResolver', () => {
  it('shows both diverging values for each conflicting field', () => {
    renderResolver();
    const box = screen.getByTestId('conflict-fields');
    expect(box).toHaveTextContent('grossSalary');
    expect(box).toHaveTextContent('1300000');
    expect(box).toHaveTextContent('1200000');
    expect(box).toHaveTextContent('completenessScore');
  });

  it('offers both resolution actions', () => {
    renderResolver();
    expect(screen.getByRole('button', { name: /keep this device/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use server version/i })).toBeInTheDocument();
  });

  it('emits the chosen side on click', () => {
    const onResolve = renderResolver();
    fireEvent.click(screen.getByRole('button', { name: /keep this device/i }));
    expect(onResolve).toHaveBeenCalledWith('local');
    fireEvent.click(screen.getByRole('button', { name: /use server version/i }));
    expect(onResolve).toHaveBeenCalledWith('server');
  });

  it('renders nothing when there is no conflict object', () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <ConflictResolver conflict={null} open onResolve={vi.fn()} onOpenChange={vi.fn()} />
      </I18nextProvider>
    );
    expect(container.firstChild).toBeNull();
  });
});
