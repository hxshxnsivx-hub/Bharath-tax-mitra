/**
 * On-demand Indic font loading (OPT-UI.7).
 *
 * The UI face (Inter) is imported eagerly in `main.tsx` and covers Latin. The
 * Indic scripts each need their own Noto Sans family, but shipping all five up
 * front would bloat the initial payload for a user who only ever sees one
 * script. So we dynamically `import()` the matching @fontsource package the
 * first time a language that needs it becomes active — Vite code-splits each
 * into its own chunk, and the browser fetches only that script's font bytes.
 *
 * The font *stack* (tailwind.config.js) lists every Noto family after Inter, so
 * once a package is loaded the browser falls through to the right family for
 * any glyph Inter can't render. Families whose package hasn't been loaded have
 * no @font-face and are simply skipped — no layout impact.
 */

// Base language (before any region subtag) → dynamic font import.
// hi and mr both use Devanagari; the rest are 1:1.
const LOADERS: Record<string, () => Promise<unknown>> = {
  hi: () => import('@fontsource/noto-sans-devanagari'),
  mr: () => import('@fontsource/noto-sans-devanagari'),
  ta: () => import('@fontsource/noto-sans-tamil'),
  te: () => import('@fontsource/noto-sans-telugu'),
  bn: () => import('@fontsource/noto-sans-bengali'),
  gu: () => import('@fontsource/noto-sans-gujarati'),
  // en/gu-Latin etc. need no extra font — Inter (eager) covers Latin.
};

const loaded = new Set<string>();

/**
 * Ensure the font for `language` is loaded. Safe to call repeatedly and on
 * every language change — each script is fetched at most once. Never throws:
 * a failed font fetch degrades to the system fallback, it must not break the UI.
 */
export async function loadFontForLanguage(language: string): Promise<void> {
  const base = language.split('-')[0].toLowerCase();
  const loader = LOADERS[base];
  if (!loader || loaded.has(base)) return;
  loaded.add(base);
  try {
    await loader();
  } catch {
    // Offline or fetch failure — keep the marker unset so a later change retries.
    loaded.delete(base);
  }
}
