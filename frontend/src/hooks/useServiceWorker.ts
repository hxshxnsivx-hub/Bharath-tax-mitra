/**
 * React Hook for Service Worker Management
 * 
 * Provides React integration for service worker lifecycle events,
 * including update notifications and offline status.
 */

import { useState, useEffect } from 'react';
import {
  registerServiceWorker,
  isServiceWorkerActive,
  checkForUpdates,
  getCacheStats,
} from '../lib/serviceWorkerRegistration';

interface ServiceWorkerState {
  isOfflineReady: boolean;
  needRefresh: boolean;
  isActive: boolean;
  updateServiceWorker: () => void;
  checkForUpdates: () => Promise<void>;
  cacheStats: {
    cacheNames: string[];
    totalSize: number;
  };
}

/**
 * Hook to manage service worker lifecycle and provide UI feedback
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { needRefresh, updateServiceWorker, isOfflineReady } = useServiceWorker();
 *   
 *   return (
 *     <>
 *       {needRefresh && (
 *         <button onClick={updateServiceWorker}>
 *           Update Available - Click to Refresh
 *         </button>
 *       )}
 *       {isOfflineReady && <div>App is ready for offline use</div>}
 *     </>
 *   );
 * }
 * ```
 */
export function useServiceWorker(): ServiceWorkerState {
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [updateFn, setUpdateFn] = useState<(() => void) | null>(null);
  const [cacheStats, setCacheStats] = useState<{
    cacheNames: string[];
    totalSize: number;
  }>({
    cacheNames: [],
    totalSize: 0,
  });

  useEffect(() => {
    // Register service worker on mount
    registerServiceWorker({
      onOfflineReady: () => {
        console.log('App is ready for offline use');
        setIsOfflineReady(true);
      },
      onNeedRefresh: (update) => {
        console.log('New version available');
        setNeedRefresh(true);
        setUpdateFn(() => update);
      },
      onSuccess: () => {
        console.log('Service worker registered successfully');
        setIsActive(isServiceWorkerActive());
      },
      onUpdate: () => {
        console.log('Service worker updated');
        setIsActive(isServiceWorkerActive());
      },
    });

    // Check if service worker is already active
    setIsActive(isServiceWorkerActive());

    // Load cache stats
    getCacheStats().then(setCacheStats);

    // Check for updates periodically (every hour)
    const updateInterval = setInterval(() => {
      checkForUpdates().catch(console.error);
    }, 60 * 60 * 1000);

    return () => {
      clearInterval(updateInterval);
    };
  }, []);

  const handleUpdate = () => {
    if (updateFn) {
      updateFn();
      setNeedRefresh(false);
    }
  };

  const handleCheckForUpdates = async () => {
    await checkForUpdates();
  };

  return {
    isOfflineReady,
    needRefresh,
    isActive,
    updateServiceWorker: handleUpdate,
    checkForUpdates: handleCheckForUpdates,
    cacheStats,
  };
}

/**
 * Hook to monitor online/offline status
 * 
 * @example
 * ```tsx
 * function ConnectivityIndicator() {
 *   const isOnline = useOnlineStatus();
 *   
 *   return (
 *     <div className={isOnline ? 'text-green-500' : 'text-red-500'}>
 *       {isOnline ? 'Online' : 'Offline'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      console.log('Network status: Online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('Network status: Offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
