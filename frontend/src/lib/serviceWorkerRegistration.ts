/**
 * Service Worker Registration Utility
 * 
 * Handles PWA service worker registration, updates, and lifecycle management.
 * Provides hooks for update notifications and offline capability.
 */

import { Workbox } from 'workbox-window';

interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
  onNeedRefresh?: (updateFn: () => void) => void;
}

let wb: Workbox | undefined;

/**
 * Register the service worker with Workbox
 * @param config Configuration callbacks for service worker events
 */
export function registerServiceWorker(config?: ServiceWorkerConfig): void {
  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser');
    return;
  }

  // Only register in production or if explicitly enabled in development
  if (import.meta.env.MODE !== 'production' && !import.meta.env.VITE_SW_DEV) {
    console.log('Service worker registration skipped in development mode');
    return;
  }

  // Initialize Workbox
  wb = new Workbox('/sw.js', {
    scope: '/',
  });

  // Handle service worker waiting state (new version available)
  wb.addEventListener('waiting', () => {
    console.log('New service worker version available');
    
    // Notify the application that an update is available
    if (config?.onNeedRefresh) {
      config.onNeedRefresh(() => {
        // Skip waiting and reload to activate new service worker
        wb?.messageSkipWaiting();
      });
    }
  });

  // Handle service worker activation (new version activated)
  wb.addEventListener('controlling', () => {
    console.log('New service worker activated, reloading page');
    window.location.reload();
  });

  // Handle service worker installation
  wb.addEventListener('installed', (event) => {
    if (event.isUpdate) {
      console.log('Service worker updated');
      if (config?.onUpdate) {
        navigator.serviceWorker.ready.then((registration) => {
          config.onUpdate?.(registration);
        });
      }
    } else {
      console.log('Service worker installed for the first time');
      if (config?.onOfflineReady) {
        config.onOfflineReady();
      }
    }
  });

  // Handle service worker activation success
  wb.addEventListener('activated', (event) => {
    if (!event.isUpdate) {
      console.log('Service worker activated');
      if (config?.onSuccess) {
        navigator.serviceWorker.ready.then((registration) => {
          config.onSuccess?.(registration);
        });
      }
    }
  });

  // Handle runtime caching events
  wb.addEventListener('message', (event) => {
    if (event.data.type === 'CACHE_UPDATED') {
      const { updatedURL } = event.data.payload;
      console.log(`Cache updated for: ${updatedURL}`);
    }
  });

  // Register the service worker
  wb.register()
    .then((registration) => {
      console.log('Service worker registered successfully', registration);
    })
    .catch((error) => {
      console.error('Service worker registration failed:', error);
    });
}

/**
 * Unregister the service worker (for testing or cleanup)
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const success = await registration.unregister();
    console.log('Service worker unregistered:', success);
    return success;
  } catch (error) {
    console.error('Service worker unregistration failed:', error);
    return false;
  }
}

/**
 * Check if the service worker is registered and active
 */
export function isServiceWorkerActive(): boolean {
  return !!(
    'serviceWorker' in navigator &&
    navigator.serviceWorker?.controller
  );
}

/**
 * Get the current service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('Failed to get service worker registration:', error);
    return null;
  }
}

/**
 * Trigger an immediate service worker update check
 */
export async function checkForUpdates(): Promise<void> {
  if (wb) {
    try {
      await wb.update();
      console.log('Service worker update check completed');
    } catch (error) {
      console.error('Service worker update check failed:', error);
    }
  }
}

/**
 * Get cache statistics for monitoring
 */
export async function getCacheStats(): Promise<{
  cacheNames: string[];
  totalSize: number;
}> {
  if (!('caches' in window)) {
    return { cacheNames: [], totalSize: 0 };
  }

  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    // Estimate total cache size (not exact, but useful for monitoring)
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      totalSize += requests.length;
    }

    return { cacheNames, totalSize };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return { cacheNames: [], totalSize: 0 };
  }
}

/**
 * Clear all application caches (for testing or troubleshooting)
 */
export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((cacheName) => caches.delete(cacheName))
    );
    console.log('All caches cleared');
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
}
