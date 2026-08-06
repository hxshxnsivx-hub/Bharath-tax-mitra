/**
 * Skeleton
 *
 * Lightweight, dependency-free placeholder primitives used as Suspense
 * fallbacks while lazily-loaded (code-split) views download and hydrate.
 *
 * On 2G/3G networks the JS for non-critical views (results/charts, chat,
 * export, settings) is fetched on demand. Showing a shaped skeleton instead
 * of a blank screen improves *perceived* performance — the user sees the
 * layout immediately while the chunk arrives.
 *
 * Requirements: 10.8, 19.4, 19.7 | Compliance: Low-bandwidth accessibility
 */

interface SkeletonProps {
  /** Tailwind width/height/rounding utility classes for the shimmer block. */
  className?: string;
  /** Accessible label announced to assistive tech (defaults to "Loading"). */
  label?: string;
}

/**
 * A single shimmering placeholder block. Use multiple of these, sized with
 * `className`, to approximate the shape of the content being loaded.
 */
export function Skeleton({ className = '', label }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label ?? 'Loading'}
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
    >
      <span className="sr-only">{label ?? 'Loading…'}</span>
    </div>
  );
}

/**
 * Card-shaped skeleton: a rounded container with a few stacked lines. Suitable
 * as a generic fallback for a lazily-loaded panel/view.
 */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i % 2 === 0 ? 'w-full' : 'w-2/3'}`} />
      ))}
    </div>
  );
}

/**
 * Fallback approximating the tax-results screen (summary dashboard, regime
 * comparison, slab breakdown). Shown while the results chunk loads.
 */
export function ResultsSkeleton() {
  return (
    <div className="space-y-8" data-testid="results-skeleton">
      {/* Summary dashboard */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <Skeleton className="h-6 w-2/5" />
        <Skeleton className="h-12 w-1/2" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
      {/* Regime comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
      </div>
      {/* Slab breakdown */}
      <CardSkeleton lines={5} />
    </div>
  );
}

/**
 * Generic centered fallback for simpler lazily-loaded views (chat, export,
 * settings placeholders).
 */
export function ViewSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-4" data-testid="view-skeleton">
      <Skeleton className="h-20 w-20 rounded-full mx-auto" />
      <Skeleton className="h-6 w-1/2 mx-auto" />
      <Skeleton className="h-4 w-3/4 mx-auto" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
