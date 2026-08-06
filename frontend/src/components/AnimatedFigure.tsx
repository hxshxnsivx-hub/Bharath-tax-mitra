/**
 * AnimatedFigure — a rupee amount that counts up to its value on mount
 * (OPT-UI.4). The results reveal ("Amount Due / Refund Expected") is the app's
 * emotional peak; a smooth roll-up makes the number land.
 *
 * Dependency-free by design (rAF, no library) — same reasoning as the rest of
 * the project's dependency-light choices, and no interop surprises. Honours
 * prefers-reduced-motion (via Framer's hook) by rendering the final value
 * immediately, and always formats through the shared en-IN formatter so the
 * lakh/crore grouping is identical to every static figure.
 */

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './motion';
import { formatIndianCurrency } from '../utils/currency';

interface AnimatedFigureProps {
  value: number;
  /** Duration in ms. */
  duration?: number;
  className?: string;
}

// Ease-out cubic: fast start, gentle settle — reads as "landing" on the number.
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function AnimatedFigure({ value, duration = 900, className }: AnimatedFigureProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const rafRef = useRef<number>();
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(from + (value - from) * easeOut(t)));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = value; // subsequent changes count from here, not 0
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, reduce]);

  return (
    <span className={className} aria-label={formatIndianCurrency(value)}>
      {formatIndianCurrency(display)}
    </span>
  );
}
