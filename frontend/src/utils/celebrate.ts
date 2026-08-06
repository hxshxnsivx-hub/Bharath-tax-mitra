/**
 * celebrate() — a one-shot confetti burst for success moments (OPT-UI.8),
 * fired when a first-time filer downloads their completed ITR. Dependency-free
 * (a small canvas + rAF, same reasoning as the rest of the project's
 * dependency-light choices — no canvas-confetti package needed).
 *
 * Strictly gated by prefers-reduced-motion: users who opt out of motion get
 * nothing (no canvas is even created). The overlay is pointer-events:none and
 * self-removes, so it never interferes with the UI or download flow.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
}

// Brand-forward palette: champagne golds + ink, with a couple of festive accents.
const COLORS = ['#C6A15B', '#B8873B', '#1A2B4A', '#2E7D5B', '#D9C089'];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Fire a brief confetti burst from the top-centre of the viewport.
 * No-op when reduced motion is preferred, or outside a browser.
 */
export function celebrate(durationMs = 1400): void {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '9999',
  } as CSSStyleDeclaration);
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  document.body.appendChild(canvas);

  // Spawn particles across the top, fanning outward and downward under gravity.
  const count = Math.min(160, Math.round(w / 8));
  const particles: Particle[] = Array.from({ length: count }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.6,
    y: -20 - Math.random() * 40,
    vx: (Math.random() - 0.5) * 6,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    size: 5 + Math.random() * 6,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));

  const start = performance.now();
  let raf = 0;

  const frame = (now: number) => {
    const elapsed = now - start;
    const fade = Math.max(0, 1 - elapsed / durationMs);
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.vy += 0.12; // gravity
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (elapsed < durationMs) {
      raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  };
  raf = requestAnimationFrame(frame);
}
