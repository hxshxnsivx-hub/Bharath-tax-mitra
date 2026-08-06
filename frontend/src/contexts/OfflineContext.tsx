/**
 * OfflineContext.tsx
 *
 * Provides real-time connectivity state and sync queue status to the entire app.
 *
 * - `isOnline` — mirrors `navigator.onLine`, updated on window online/offline events
 * - `pendingCount` — number of queued requests waiting to sync
 * - `lastSyncAt` — timestamp (ms) of the last completed sync, or null
 *
 * Requirements: 10.5, 10.6
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getSyncStatus } from '../services/syncService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OfflineContextValue {
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
  pendingCount: 0,
  lastSyncAt: null,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps): React.JSX.Element {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleOnline(): Promise<void> {
      setIsOnline(true);
      try {
        const status = await getSyncStatus();
        if (!cancelled) {
          setPendingCount(status.pending);
          setLastSyncAt(status.lastSyncAt);
        }
      } catch (err) {
        console.error('[OfflineContext] getSyncStatus failed:', err);
      }
    }

    function handleOffline(): void {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialise pending count on mount
    getSyncStatus()
      .then((status) => {
        if (!cancelled) {
          setPendingCount(status.pending);
          setLastSyncAt(status.lastSyncAt);
        }
      })
      .catch((err) => {
        console.error('[OfflineContext] initial getSyncStatus failed:', err);
      });

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, lastSyncAt }}>
      {children}
    </OfflineContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Consume the offline context.
 * Must be used inside an `<OfflineProvider>`.
 *
 * react-refresh: exporting a hook next to the provider is the standard React
 * context pattern; HMR still works because the hook is stateless.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useOffline(): OfflineContextValue {
  return useContext(OfflineContext);
}
