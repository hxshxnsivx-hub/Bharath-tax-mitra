/**
 * AnimatedFigure (OPT-UI.4) — the count-up figure used on the results reveal.
 * These tests pin the two contracts that matter: the accessible label always
 * reflects the *final* value (screen readers never read a mid-animation number),
 * and reduced-motion users see the final value immediately with no roll-up.
 */
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Drive reduced-motion from the mock so we can assert both branches deterministically.
const reduceRef = { current: false };
vi.mock('../motion', () => ({
  useReducedMotion: () => reduceRef.current,
}));

import { AnimatedFigure } from '../AnimatedFigure';

afterEach(() => {
  cleanup();
  reduceRef.current = false;
});

describe('AnimatedFigure', () => {
  it('exposes the final value as its accessible label regardless of animation progress', () => {
    reduceRef.current = false;
    render(<AnimatedFigure value={125000} />);
    // aria-label is bound to `value`, not the animated `display` state.
    const el = screen.getByLabelText('₹1,25,000');
    expect(el).toBeInTheDocument();
  });

  it('renders the final value immediately when reduced motion is preferred', () => {
    reduceRef.current = true;
    render(<AnimatedFigure value={125000} />);
    // No roll-up from 0 — the visible text is the final formatted amount.
    expect(screen.getByText('₹1,25,000')).toBeInTheDocument();
  });
});
