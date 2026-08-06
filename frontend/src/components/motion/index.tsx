/**
 * Motion primitives (OPT-UI.2 + visual-depth pass).
 *
 * Built on Framer Motion's LazyMotion with the `domAnimation` feature subset —
 * only ~15KB gz lands in the bundle instead of the full library. All
 * primitives:
 *   - honour prefers-reduced-motion (useReducedMotion + the global CSS
 *     kill-switch in index.css)
 *   - animate transform/opacity ONLY (GPU-composited — smooth on the low-end
 *     Tier-2/3 devices this app targets)
 *   - degrade to static rendering when reduced motion is requested
 */

import { LazyMotion, domAnimation, m, AnimatePresence, useReducedMotion } from 'framer-motion';
import * as React from 'react';

/** Wrap once near the app root. Provides the lazy feature bundle. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

/* ── Entrance reveals ───────────────────────────────────────────────────── */

interface RevealProps {
  children: React.ReactNode;
  /** Stagger delay in seconds (use with index * 0.06 for lists). */
  delay?: number;
  /** Slide distance in px (translateY). */
  y?: number;
  className?: string;
  /**
   * 'mount' = animate immediately on mount — REQUIRED for above-the-fold
   * content (IntersectionObserver does not fire in hidden/prerendered tabs,
   * which left whileInView content stuck at opacity 0 — found in-pane).
   * 'scroll' = animate when scrolled into view (below-fold only).
   */
  mode?: 'mount' | 'scroll';
}

/** Fade-up entrance — on mount (above fold) or on scroll into view (below). */
export function Reveal({ children, delay = 0, y = 24, className, mode = 'scroll' }: RevealProps) {
  const reduce = useReducedMotion();
  const initial = reduce ? false : { opacity: 0, y };
  const target = { opacity: 1, y: 0 };
  const transition = { duration: 0.5, delay, ease: [0.21, 0.47, 0.32, 0.98] as const };

  if (mode === 'mount') {
    return (
      <m.div className={className} initial={initial} animate={target} transition={transition}>
        {children}
      </m.div>
    );
  }
  return (
    <m.div
      className={className}
      initial={initial}
      whileInView={target}
      viewport={{ once: true, margin: '-40px' }}
      transition={transition}
    >
      {children}
    </m.div>
  );
}

/* ── 3D tilt card ───────────────────────────────────────────────────────── */

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Max tilt in degrees. Keep subtle (≤8) — this is depth, not a gimmick. */
  maxTilt?: number;
}

/**
 * Pointer-tracked 3D tilt (perspective + rotateX/rotateY).
 *
 * Implemented as direct DOM transform writes inside a rAF loop with a CSS
 * transition for the settle — no React re-render per pointer event (cheap on
 * low-end devices) and no framer state bridge (m components' gesture system
 * interfered with prop/state-driven pointer handling in practice — verified
 * in-browser during OPT-UI.2). Disabled under reduced motion and for
 * non-mouse pointers (touch tilt would fight scrolling).
 */
export function TiltCard({ children, maxTilt = 6, className, ...rest }: TiltCardProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;

    // Direct style writes — the CSS transition supplies the smoothing, so no
    // rAF batching is needed (rAF is also suspended entirely on hidden pages,
    // which made the previous rAF version untestable in automation).
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transition = 'transform 80ms ease-out';
      el.style.transform = `rotateX(${(-py * maxTilt * 2).toFixed(2)}deg) rotateY(${(px * maxTilt * 2).toFixed(2)}deg)`;
    };

    const onLeave = () => {
      // springy settle back to rest
      el.style.transition = 'transform 450ms cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.transform = 'rotateX(0deg) rotateY(0deg)';
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [reduce, maxTilt]);

  return (
    <div style={{ perspective: 900 }} className={className}>
      <div ref={ref} style={{ transformStyle: 'preserve-3d' }} {...rest}>
        {children}
      </div>
    </div>
  );
}

/* ── Wizard step transition ─────────────────────────────────────────────── */

interface StepTransitionProps {
  /** Key that changes per step — drives exit/enter. */
  stepKey: string;
  /** +1 forward, -1 backward — sets the slide direction. */
  direction?: 1 | -1;
  children: React.ReactNode;
}

/** Horizontal slide+fade between wizard steps. */
export function StepTransition({ stepKey, direction = 1, children }: StepTransitionProps) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={stepKey}
        initial={reduce ? false : { opacity: 0, x: 32 * direction }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduce ? undefined : { opacity: 0, x: -24 * direction }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}

/* ── Pressable ──────────────────────────────────────────────────────────── */

/** Scale-on-press wrapper for CTAs (spring settle, tap feedback). */
export function Pressable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <m.div
      className={className}
      whileHover={reduce ? undefined : { scale: 1.02 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {children}
    </m.div>
  );
}

// Re-export for consumers that need raw primitives (e.g. progress bars).
// react-refresh: re-exporting framer's m/hooks beside components is intentional —
// this module is the single motion entry point (mirrors the ui/ barrel pattern).
// eslint-disable-next-line react-refresh/only-export-components
export { m, AnimatePresence, useReducedMotion };
