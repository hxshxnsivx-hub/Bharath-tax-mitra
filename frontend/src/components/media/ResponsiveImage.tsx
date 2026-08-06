/**
 * ResponsiveImage
 *
 * Bandwidth-friendly image element for Tier-2/3 / 2G-3G networks.
 *
 * The app currently ships **no content raster images** — all iconography is
 * inline lucide-react SVG and the only raster assets are the PWA launcher
 * icons (PNG, referenced from the web manifest, not rendered in the React
 * tree). So there is nothing to convert today and we deliberately do not
 * fabricate binary assets.
 *
 * This component establishes the convention for any *future* content image:
 * serve a modern, highly-compressed WebP via <source> with a JPEG/PNG
 * fallback in the <img>, so browsers that don't support WebP still render.
 * It also defaults to lazy, async, low-priority decoding so off-screen images
 * never block first paint on a slow connection.
 *
 * Usage:
 *   <ResponsiveImage
 *     webpSrc="/img/hero.webp"
 *     fallbackSrc="/img/hero.jpg"
 *     alt="Tax filing illustration"
 *     width={640}
 *     height={360}
 *   />
 *
 * Requirements: 10.8, 19.4, 19.7 | Compliance: Low-bandwidth accessibility
 */

interface ResponsiveImageProps {
  /** WebP source (preferred — smaller transfer size). */
  webpSrc: string;
  /** JPEG/PNG fallback for browsers without WebP support. */
  fallbackSrc: string;
  /** Required alt text for accessibility. */
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  /** Override loading strategy; defaults to lazy for below-the-fold images. */
  loading?: 'lazy' | 'eager';
  /** Optional sizes attribute for responsive art direction. */
  sizes?: string;
}

export function ResponsiveImage({
  webpSrc,
  fallbackSrc,
  alt,
  width,
  height,
  className,
  loading = 'lazy',
  sizes,
}: ResponsiveImageProps) {
  return (
    <picture>
      <source type="image/webp" srcSet={webpSrc} sizes={sizes} />
      <img
        src={fallbackSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={loading}
        decoding="async"
        // @ts-expect-error fetchpriority is valid HTML but not yet in React's DOM types
        fetchpriority={loading === 'eager' ? 'high' : 'low'}
      />
    </picture>
  );
}
