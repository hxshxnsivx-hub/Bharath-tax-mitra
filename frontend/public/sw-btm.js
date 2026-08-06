/**
 * sw-btm.js — Bharat Tax Mitra supplemental service worker
 *
 * Handles the BackgroundSync `sync` event for Chrome / Edge.
 * The actual queue processing runs client-side via processPending() in
 * syncService.ts — the SW just ensures the browser wakes the app when
 * connectivity returns (Background Sync API, RFC https://wicg.github.io/background-sync/).
 *
 * Safari / Firefox fallback: window.addEventListener('online') in syncService.ts
 * handles those environments transparently — no service worker required there.
 *
 * Requirements: 10.5, 10.6
 */

self.addEventListener('sync', (event) => {
  if (event.tag === 'btm-sync') {
    // Signal all clients to trigger processPending() via the online-event path.
    // The actual IndexedDB queue replay is performed in the page context by
    // syncService.ts so we have access to the Dexie DB and auth state.
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'BTM_SYNC_TRIGGER' });
        });
        // Resolve immediately — the client side handles the actual work.
        return Promise.resolve();
      }),
    );
  }
});

/**
 * Listen for the BTM_SYNC_TRIGGER message sent back from the page (not used
 * currently but kept as a hook for future bi-directional SW ↔ client comms).
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'BTM_SYNC_ACK') {
    // Acknowledgement from the client — no-op for now.
  }
});
