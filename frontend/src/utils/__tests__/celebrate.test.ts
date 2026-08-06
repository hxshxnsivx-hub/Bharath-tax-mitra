/**
 * celebrate() (OPT-UI.8) — the export success confetti. The contract that
 * matters for accessibility: it must render nothing when the user prefers
 * reduced motion, and it must clean up after itself (no leftover canvas).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { celebrate } from '../celebrate';

function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && /prefers-reduced-motion/.test(query),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  document.querySelectorAll('canvas').forEach((c) => c.remove());
  vi.restoreAllMocks();
});

describe('celebrate', () => {
  it('renders nothing when prefers-reduced-motion is set', () => {
    setReducedMotion(true);
    celebrate();
    expect(document.querySelector('canvas')).toBeNull();
  });

  it('mounts a decorative, non-interactive canvas when motion is allowed', () => {
    setReducedMotion(false);
    // jsdom has no 2D canvas context; stub it so celebrate() proceeds to mount.
    const ctxStub = {
      scale: () => {},
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      fillRect: () => {},
      globalAlpha: 1,
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctxStub);
    celebrate();
    const canvas = document.querySelector('canvas');
    expect(canvas).not.toBeNull();
    // Must never trap clicks or be announced to assistive tech.
    expect(canvas?.style.pointerEvents).toBe('none');
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
  });
});
