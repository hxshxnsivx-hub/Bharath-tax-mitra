/**
 * useNetworkQuality
 *
 * Derives an effective connection quality from the Network Information API
 * (`navigator.connection.effectiveType`). The API is not available in every
 * browser (notably Safari/Firefox) nor in the jsdom test environment, so this
 * hook degrades gracefully: when the API is missing it reports a non-slow,
 * "unknown" quality and never throws.
 *
 * A connection is considered "slow" when the browser reports an effective type
 * of `2g` or `slow-2g`, matching Requirement 10.8 (function on 2G networks).
 *
 * Requirements: 10.4, 10.8 | Compliance: Connectivity indicator
 */

import { useEffect, useState } from 'react';

/** Minimal shape of the Network Information API we rely on. */
interface NetworkInformationLike {
  effectiveType?: string;
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
}

/** Resolve the connection object across vendor prefixes, or null when unsupported. */
function getConnection(): NetworkInformationLike | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & {
    connection?: NetworkInformationLike;
    mozConnection?: NetworkInformationLike;
    webkitConnection?: NetworkInformationLike;
  };
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null;
}

/** True when the reported effective type indicates a slow (2G-class) network. */
function isSlowEffectiveType(effectiveType: string | null): boolean {
  return effectiveType === '2g' || effectiveType === 'slow-2g';
}

export interface NetworkQuality {
  /** Whether the connection is slow (2g/slow-2g). Always false when unsupported. */
  isSlow: boolean;
  /** The raw effective type, or null when the API is unavailable. */
  effectiveType: string | null;
  /** Whether the Network Information API is available in this environment. */
  isSupported: boolean;
}

/**
 * Hook returning the current network quality. Re-renders when the browser
 * fires a `change` event on the connection object.
 */
export function useNetworkQuality(): NetworkQuality {
  const [effectiveType, setEffectiveType] = useState<string | null>(() => {
    const connection = getConnection();
    return connection?.effectiveType ?? null;
  });

  useEffect(() => {
    const connection = getConnection();
    if (!connection || !connection.addEventListener) return;

    const handleChange = (): void => {
      setEffectiveType(connection.effectiveType ?? null);
    };

    connection.addEventListener('change', handleChange);
    // Sync once on mount in case the value changed before the listener attached
    handleChange();

    return () => {
      connection.removeEventListener?.('change', handleChange);
    };
  }, []);

  return {
    isSlow: isSlowEffectiveType(effectiveType),
    effectiveType,
    isSupported: getConnection() !== null,
  };
}
