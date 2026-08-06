/**
 * syncService.ts
 *
 * Manages the offline operation queue and background synchronisation.
 *
 * Architecture:
 * - `enqueue()` writes to IndexedDB `pendingRequests` table
 * - `processPending()` replays queued requests against the real API
 * - `startSync()` is registered on the `window.online` event
 * - Safari iOS fallback: uses `window.addEventListener('online', ...)` since
 *   BackgroundSync API is not available in Safari (design MEDIUM-1)
 *
 * Requirements: 10.5, 10.6, 20.1 | Compliance: Data integrity
 */

import { db, type PendingRequest } from '../lib/db';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Exponential backoff delays in ms: 1s, 2s, 4s, 8s, then cap at 30s */
const BACKOFF_MS = [1000, 2000, 4000, 8000, 30000];
const MAX_RETRIES = 3;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SyncStatus {
  pending: number;
  lastSyncAt: number | null;
}

// ─── Internal state ──────────────────────────────────────────────────────────

let _lastSyncAt: number | null = null;
let _isSyncing = false;
let _lastEnqueueTs = 0;

/**
 * Strictly monotonic timestamp for queue ordering. Two enqueues can land on
 * the same Date.now() millisecond, which made `orderBy('timestamp')` replay
 * order undefined (a PUT could replay before its POST). Bumping ties by 1ms
 * keeps FIFO deterministic without a schema change.
 */
function nextQueueTimestamp(): number {
  const now = Date.now();
  _lastEnqueueTs = now > _lastEnqueueTs ? now : _lastEnqueueTs + 1;
  return _lastEnqueueTs;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Add an operation to the offline queue.
 * The operation will be replayed when the device comes back online.
 */
export async function enqueue(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  payload: unknown,
): Promise<void> {
  const timestamp = nextQueueTimestamp();
  const request: PendingRequest = {
    requestId: `req-${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
    method,
    endpoint,
    payload,
    timestamp,
    retryCount: 0,
    maxRetries: MAX_RETRIES,
  };

  await db.pendingRequests.add(request);
}

/**
 * Replay all queued requests in FIFO order.
 * Each failed request is retried up to MAX_RETRIES times with exponential backoff.
 * After exhausting retries the request is marked as permanently failed and removed.
 */
export async function processPending(): Promise<void> {
  if (_isSyncing) return; // Guard against concurrent sync runs
  _isSyncing = true;

  try {
    const pending = await db.pendingRequests
      .orderBy('timestamp')
      .toArray();

    for (const request of pending) {
      await replayRequest(request);
    }

    _lastSyncAt = Date.now();
  } finally {
    _isSyncing = false;
  }
}

/**
 * Start the sync cycle — called when the device comes back online.
 * Safe to call multiple times; only one sync runs at a time.
 */
export async function startSync(): Promise<void> {
  if (!navigator.onLine) return;
  await processPending();
}

/**
 * Return the current sync status.
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const count = await db.pendingRequests.count();
  return { pending: count, lastSyncAt: _lastSyncAt };
}

/**
 * Render a human-readable sync status string for display in the UI.
 *
 * Examples:
 *   formatSyncStatus(0) → "All changes synced"
 *   formatSyncStatus(1) → "1 operation pending sync"
 *   formatSyncStatus(3) → "3 operations pending sync"
 */
export function formatSyncStatus(pending: number): string {
  if (pending <= 0) return 'All changes synced';
  if (pending === 1) return '1 operation pending sync';
  return `${pending} operations pending sync`;
}

// ─── Initialisation ──────────────────────────────────────────────────────────

/**
 * Register connectivity event listeners.
 * Call once from main.tsx after the app mounts.
 *
 * Behaviour:
 * - If BackgroundSync API is available (Chrome/Edge): register a sync tag.
 *   The browser will call the service worker's `sync` event when online.
 *   We also listen to `window.online` as a belt-and-suspenders fallback.
 * - If BackgroundSync is NOT available (Safari iOS): rely solely on
 *   `window.addEventListener('online', ...)`.
 */
export function initSyncListeners(): void {
  // Belt-and-suspenders: always listen to the online event
  window.addEventListener('online', () => {
    startSync().catch((err) => {
      console.error('[syncService] startSync failed:', err);
    });
  });

  // Close the BackgroundSync loop: when the SW handles its `sync` event it
  // posts a BTM_SYNC_TRIGGER message back to the page (see public/sw-btm.js).
  // The actual queue replay runs here in the page context where the Dexie DB
  // and auth state live.
  if ('serviceWorker' in navigator) {
    const swContainer = navigator.serviceWorker as Partial<ServiceWorkerContainer>;
    if (typeof swContainer.addEventListener === 'function') {
      swContainer.addEventListener('message', (event: MessageEvent) => {
        if (event.data && event.data.type === 'BTM_SYNC_TRIGGER') {
          startSync().catch((err) => {
            console.error('[syncService] SW-triggered startSync failed:', err);
          });
        }
      });
    }
  }

  // Try to register BackgroundSync if supported
  const canUseBackgroundSync =
    'serviceWorker' in navigator && 'SyncManager' in (window as unknown as Record<string, unknown>);

  if (canUseBackgroundSync) {
    navigator.serviceWorker.ready
      .then((registration) => {
        // Register a one-off sync tag — SW will call processPending() on connect
        return (
          registration as unknown as { sync: { register: (tag: string) => Promise<void> } }
        ).sync.register('btm-sync');
      })
      .catch((err) => {
        // BackgroundSync registration failure is non-fatal
        console.warn('[syncService] BackgroundSync registration failed:', err);
      });
  }
}

// ─── Internals ───────────────────────────────────────────────────────────────

/** Get an auth token from IndexedDB for authenticated requests */
async function getAuthToken(): Promise<string | undefined> {
  try {
    const profiles = await db.profiles.toArray();
    if (profiles.length === 0) return undefined;
    const profile = await db.getProfile(profiles[0].userId);
    return profile?.authToken ?? undefined;
  } catch {
    return undefined;
  }
}

/** Sleep for a given number of milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Replay a single queued request with retry logic */
async function replayRequest(request: PendingRequest): Promise<void> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  for (let attempt = request.retryCount; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}${request.endpoint}`, {
        method: request.method,
        headers,
        body: request.method !== 'DELETE' ? JSON.stringify(request.payload) : undefined,
      });

      if (response.ok) {
        // Success — remove from queue
        await db.pendingRequests.delete(request.requestId);
        return;
      }

      // 4xx errors (except 429) are permanent failures — remove from queue
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        console.warn(
          `[syncService] Permanent failure for ${request.method} ${request.endpoint}: ${response.status}`,
        );
        await db.pendingRequests.delete(request.requestId);
        return;
      }

      // 5xx or 429 — increment retry counter and back off
    } catch {
      // Network error — back off and retry
    }

    const delayMs = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];

    if (attempt === MAX_RETRIES) {
      // Exhausted retries — remove permanently to avoid queue bloat
      console.error(
        `[syncService] Exhausted retries for ${request.method} ${request.endpoint}. Dropping.`,
      );
      await db.pendingRequests.delete(request.requestId);
      return;
    }

    // Update retry count in IndexedDB
    await db.pendingRequests.update(request.requestId, {
      retryCount: attempt + 1,
    });

    await sleep(delayMs);
  }
}
