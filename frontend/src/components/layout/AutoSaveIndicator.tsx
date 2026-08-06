/**
 * AutoSaveIndicator Component
 *
 * Displays the current auto-save state to users:
 *  - Saving in progress: spinning loader + "Saving..." in blue
 *  - Saved: green checkmark + "Saved X min ago" (relative, updates every 30s)
 *  - Not saved (dirty): yellow warning dot + "Not saved" in amber
 *  - No data yet: gray dot + "Auto-saves every 30s" hint
 *
 * Requirements: 20.5 (data loss prevention — visual feedback)
 */

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutoSaveIndicatorProps {
  /** True when there are unsaved changes since the last successful save */
  isDirty: boolean;
  /** Unix timestamp (ms) of the last successful save */
  lastSavedAt?: number;
  /** True while a save is in progress */
  isSaving?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a human-readable relative time string from a Unix timestamp (ms) */
function relativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1m ago';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return '1h ago';
  return `${diffHr}h ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * AutoSaveIndicator
 *
 * Small inline-flex component suitable for a header or form footer.
 * Uses Tailwind CSS — no additional dependencies beyond React.
 *
 * @example
 * ```tsx
 * <AutoSaveIndicator isDirty={isDirty} lastSavedAt={lastSavedAt} isSaving={isSaving} />
 * ```
 */
export function AutoSaveIndicator({
  isDirty,
  lastSavedAt,
  isSaving = false,
}: AutoSaveIndicatorProps) {
  // Tick state drives re-renders every 30 s so relative time stays fresh
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // ── Saving ──────────────────────────────────────────────────────────────
  if (isSaving) {
    return (
      <div
        className="inline-flex items-center gap-1.5 text-xs text-blue-600"
        role="status"
        aria-live="polite"
        aria-label="Saving"
      >
        {/* Spinner */}
        <svg
          className="w-3.5 h-3.5 animate-spin text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        <span>Saving...</span>
      </div>
    );
  }

  // ── Saved ────────────────────────────────────────────────────────────────
  if (!isDirty && lastSavedAt) {
    const label = `Saved ${relativeTime(lastSavedAt)}`;
    return (
      <div
        className="inline-flex items-center gap-1.5 text-xs text-green-600"
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        {/* Checkmark */}
        <svg
          className="w-3.5 h-3.5 text-green-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span>{label}</span>
      </div>
    );
  }

  // ── Not saved (dirty) ────────────────────────────────────────────────────
  if (isDirty) {
    return (
      <div
        className="inline-flex items-center gap-1.5 text-xs text-amber-600"
        role="status"
        aria-live="polite"
        aria-label="Not saved"
      >
        {/* Warning dot */}
        <span
          className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"
          aria-hidden="true"
        />
        <span>Not saved</span>
      </div>
    );
  }

  // ── No data yet ──────────────────────────────────────────────────────────
  return (
    <div
      className="inline-flex items-center gap-1.5 text-xs text-gray-400"
      role="status"
      aria-live="polite"
      aria-label="Auto-saves every 30 seconds"
    >
      {/* Gray dot */}
      <span
        className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0"
        aria-hidden="true"
      />
      <span>Auto-saves every 30s</span>
    </div>
  );
}

export default AutoSaveIndicator;
