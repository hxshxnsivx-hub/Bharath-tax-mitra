/**
 * ConnectivityBanner Component
 *
 * Full-width offline warning banner.
 * - Shown only when offline (isOnline = false).
 * - Auto-hides when back online.
 * - Amber/orange background with pending operations count (if any).
 * - Uses React hooks for internal connectivity detection when no prop is provided.
 */

import { useState, useEffect } from 'react';
import { WifiOff, CloudOff } from 'lucide-react';

interface ConnectivityBannerProps {
  /** Override the detected online status. Defaults to navigator.onLine + event listeners. */
  isOnline?: boolean;
  /** Number of operations waiting to be synced. */
  pendingCount?: number;
}

export function ConnectivityBanner({ isOnline: isOnlineProp, pendingCount = 0 }: ConnectivityBannerProps) {
  // Internal connectivity detection when no override is provided
  const [detectedOnline, setDetectedOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setDetectedOnline(true);
    const handleOffline = () => setDetectedOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Prop takes precedence over detected value
  const isOnline = isOnlineProp !== undefined ? isOnlineProp : detectedOnline;

  // Don't render anything when online
  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="w-full bg-amber-500 text-white px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
    >
      <WifiOff className="w-4 h-4 flex-shrink-0" aria-hidden="true" />

      <span>
        You're offline — changes will sync when you reconnect
      </span>

      {pendingCount > 0 && (
        <span className="flex items-center gap-1 ml-1 bg-amber-600 rounded-full px-2 py-0.5 text-xs font-semibold">
          <CloudOff className="w-3 h-3" aria-hidden="true" />
          {pendingCount} pending
        </span>
      )}
    </div>
  );
}

export default ConnectivityBanner;
