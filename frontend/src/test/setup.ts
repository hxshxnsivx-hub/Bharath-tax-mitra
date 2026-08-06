import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
// Provides a global IndexedDB implementation for jsdom (used by Dexie/db layer)
import 'fake-indexeddb/auto';
// Registers jest-dom matchers AND augments Vitest's `expect` types
import '@testing-library/jest-dom/vitest';

// jsdom has no ResizeObserver; Recharts' ResponsiveContainer requires one
// (OPT-UI.3 charts). Minimal no-op stub — charts render zero-size in tests,
// which is fine: chart *content* is covered by the palette/data unit tests,
// and layout is verified visually per the dataviz skill.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

// jsdom has no IntersectionObserver; Framer Motion's `whileInView` (our
// scroll-Reveal, OPT-UI.2) constructs one on mount. Stub it so shell-level
// component tests can render the real MainApp tree.
class IntersectionObserverStub {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
globalThis.IntersectionObserver =
  globalThis.IntersectionObserver ?? (IntersectionObserverStub as unknown as typeof IntersectionObserver);

// jsdom has no matchMedia. Framer Motion's `useReducedMotion` reads it; without
// a stub it reports "motion allowed", so rAF-driven effects (AnimatedFigure's
// count-up, OPT-UI.4) start from 0 and never advance because jsdom doesn't drive
// requestAnimationFrame — leaving figures stuck at ₹0 in the DOM. A headless
// test environment has no motion, so we report prefers-reduced-motion: reduce as
// matching: motion components render their settled/final state immediately,
// which is both correct and deterministic. Other media queries default to false.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string): MediaQueryList => ({
    // Framer queries the bare `(prefers-reduced-motion)` (not `: reduce`), so
    // match any prefers-reduced-motion query to force the reduced state.
    matches: /prefers-reduced-motion/.test(query),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});
