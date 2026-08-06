/**
 * Chart palette — validated per the dataviz skill (OPT-UI.3).
 *
 * DO NOT eyeball-edit these values. Every set below was checked with the
 * skill's validator against the app's light surface (gray-50 #f9fafb):
 *
 *   node validate_palette.mjs "#2a78d6,#1baf7a,#eda100,#008300,#4a3aa7,#e34948" \
 *     --mode light --surface "#f9fafb"            → exit 0 (categorical, adjacent CVD)
 *   node validate_palette.mjs "#86b6ef,#5598e7,#2a78d6,#1c5cab,#104281,#0d366b" \
 *     --mode light --surface "#f9fafb" --ordinal  → exit 0 (monotone L, ΔL, light-end ≥2:1)
 *
 * Relief rule: aqua/yellow categorical slots sit below 3:1 on light surfaces —
 * legal ONLY because every chart ships next to its text table (DataRow lists /
 * SlabTable) and carries direct labels. Do not remove those without re-checking.
 *
 * Rules inherited from the skill:
 *  - categorical hues are assigned in FIXED order by entity, never cycled/sorted
 *  - >6 categories fold into "Other" — never generate new hues
 *  - text (labels/legends/values) wears text tokens, never the series color
 */

/** Chart surface — matches --background (gray-50). Used for 2px mark gaps. */
export const CHART_SURFACE = '#f9fafb';

/** Recessive ink for axes/ticks/labels (text does not wear series colors). */
export const CHART_INK = {
  primary: '#111827', // gray-900
  secondary: '#374151', // gray-700
  muted: '#6b7280', // gray-500
} as const;

/**
 * Categorical slots (fixed order — the order IS the CVD-safety mechanism).
 * Consumers map each entity to a slot index once and never re-map.
 */
export const CATEGORICAL = [
  '#2a78d6', // slot 1 blue
  '#1baf7a', // slot 2 aqua    (below 3:1 — relief via labels/table)
  '#eda100', // slot 3 yellow  (below 3:1 — relief via labels/table)
  '#008300', // slot 4 green
  '#4a3aa7', // slot 5 violet
  '#e34948', // slot 6 red
] as const;

/**
 * Ordinal blue ramp, light→dark — for ordered scales (tax slabs by rate).
 * Light end ≥2:1 on surface; adjacent ΔL validated with --ordinal.
 */
export const ORDINAL_RAMP = [
  '#86b6ef',
  '#5598e7',
  '#2a78d6',
  '#1c5cab',
  '#104281',
  '#0d366b',
] as const;

/**
 * Emphasis pair — "one series is the point, the rest are context".
 * Both clear 3:1 mark contrast on the surface (4.23:1 / 4.63:1).
 */
export const EMPHASIS = {
  focus: '#2a78d6', // the story (e.g. recommended regime)
  context: '#6b7280', // de-emphasis gray (gray-500)
} as const;

/**
 * Spread an ordinal ramp across n marks (n ≤ ramp length), keeping the
 * lightest step for the lowest rank and the darkest for the highest.
 */
export function ordinalSteps(n: number): string[] {
  if (n <= 0) return [];
  if (n >= ORDINAL_RAMP.length) return [...ORDINAL_RAMP].slice(0, n);
  if (n === 1) return [ORDINAL_RAMP[ORDINAL_RAMP.length - 1]];
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i * (ORDINAL_RAMP.length - 1)) / (n - 1));
    out.push(ORDINAL_RAMP[idx]);
  }
  return out;
}
