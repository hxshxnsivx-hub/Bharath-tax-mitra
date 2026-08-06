/**
 * OfflineBadge Component Tests
 *
 * Validates Requirements 5.9, 10.2:
 *  - A "Calculated Offline" badge is rendered to flag results produced
 *    client-side while the device had no network connectivity.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineBadge } from '../OfflineBadge';

describe('OfflineBadge', () => {
  it('renders the "Calculated Offline" label', () => {
    render(<OfflineBadge />);
    expect(screen.getByText('Calculated Offline')).toBeInTheDocument();
  });

  it('exposes an accessible status role and label', () => {
    render(<OfflineBadge />);
    const badge = screen.getByRole('status', { name: 'Calculated offline' });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-live', 'polite');
  });

  it('applies a custom className', () => {
    const { container } = render(<OfflineBadge className="custom-offline-badge" />);
    expect(container.firstChild).toHaveClass('custom-offline-badge');
  });
});
