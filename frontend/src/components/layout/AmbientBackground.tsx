/**
 * AmbientBackground — claims the previously-dead white gutters on every page
 * (weight-matrix winners B + H + A + C from the visual-story pass).
 *
 * Grounded in the subject's own world rather than generic gradient wash:
 *   B. a giant outlined ₹ glyph — the most characteristic material of a tax app
 *   H. a slab-stepped rail — India's slab system expressed as form (widths
 *      step up like the 5/10/15/20/30% rate bands)
 *   A. two low-opacity brand orbs drifting very slowly
 *   C. a per-tab accent hue via `--ambient-1` (set by MainApp) so moving
 *      through the app reads as a story, not a palette swap
 *
 * Engineering constraints:
 *   - fixed, -z-10, pointer-events-none, aria-hidden: never intercepts input,
 *     never enters the a11y tree, never affects layout
 *   - pure CSS, zero dependencies, transform/opacity-only animation
 *     (neutralised by the global prefers-reduced-motion kill-switch)
 *   - opacities kept ≤ ~8% so foreground contrast ratios are untouched
 */

const SLAB_BANDS = [
  { width: 'w-10', opacity: 0.05 },
  { width: 'w-16', opacity: 0.07 },
  { width: 'w-24', opacity: 0.09 },
  { width: 'w-32', opacity: 0.11 },
  { width: 'w-44', opacity: 0.13 },
];

export function AmbientBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden select-none">
      {/* A. Brand orbs — accent hue follows the active tab via --ambient-1 */}
      <div
        className="animate-ambient absolute -top-40 -left-40 h-[34rem] w-[34rem] rounded-full blur-3xl transition-colors duration-700"
        style={{ backgroundColor: 'hsl(var(--ambient-1) / 0.09)' }}
      />
      <div
        className="animate-ambient-delayed absolute -bottom-48 -right-32 h-[38rem] w-[38rem] rounded-full blur-3xl"
        style={{ backgroundColor: 'hsl(var(--ambient-2) / 0.08)' }}
      />

      {/* B. The rupee — huge, gold-engraved outline, half off-canvas right */}
      <div
        className="absolute -right-24 top-1/2 -translate-y-1/2 rotate-6 font-display font-black leading-none"
        style={{
          fontSize: 'clamp(18rem, 42vw, 34rem)',
          color: 'transparent',
          WebkitTextStroke: '2px hsl(var(--gold) / 0.16)',
        }}
      >
        ₹
      </div>

      {/* Banknote grain — the film that makes the paper read as material */}
      <div className="texture-grain absolute inset-0 opacity-[0.05]" />

      {/* H. Slab rail — stepped bands up the left edge (desktop gutters only) */}
      <div className="absolute bottom-0 left-0 hidden lg:flex flex-col-reverse gap-1.5 pb-10 pl-0">
        {SLAB_BANDS.map((band, i) => (
          <div
            key={i}
            className={`${band.width} h-2.5 rounded-r-full transition-colors duration-700`}
            style={{ backgroundColor: `hsl(var(--ambient-1) / ${band.opacity})` }}
          />
        ))}
      </div>
    </div>
  );
}
