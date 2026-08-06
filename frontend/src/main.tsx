import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Self-hosted fonts (OPT-UI.7) — no CDN, offline-safe, precached by the
// service worker's woff2 glob. Inter is the base UI face (Latin); the display
// serif is used for headings/numerals. Indic families load on demand per active
// language via i18n/fonts.ts, so only the current script's bytes are fetched.
import '@fontsource-variable/inter';
import '@fontsource-variable/playfair-display';
import './index.css';
import './i18n/config';
import { registerServiceWorker } from './lib/serviceWorkerRegistration';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { ToastProvider } from './components/feedback/Toast';
import { initSyncListeners } from './services/syncService';
import { OfflineProvider } from './contexts/OfflineContext';

// Register service worker for PWA functionality.
// Design constraint MEDIUM-6: skipWaiting is NOT triggered automatically.
// A toast notification asks the user to refresh instead.
registerServiceWorker({
  onSuccess: () => {
    console.log('Service worker registered — app ready for offline use');
  },
  onUpdate: () => {
    console.log('Service worker updated in background');
  },
  onOfflineReady: () => {
    console.log('App is ready to work offline');
  },
  onNeedRefresh: (updateFn) => {
    // Show a non-intrusive banner instead of forcing reload mid-session.
    // This protects in-progress tax filing from silent interruption.
    const banner = document.createElement('div');
    banner.id = 'sw-update-banner';
    banner.style.cssText = [
      'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
      'background:#1e40af', 'color:#fff', 'padding:10px 20px', 'border-radius:12px',
      'font-size:13px', 'font-family:sans-serif', 'z-index:9999',
      'display:flex', 'align-items:center', 'gap:12px', 'box-shadow:0 4px 16px rgba(0,0,0,0.2)',
    ].join(';');
    banner.innerHTML = `
      <span>🔄 New version available</span>
      <button id="sw-refresh-btn" style="background:#f59e0b;color:#1e3a8a;border:none;
        padding:5px 12px;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px">
        Refresh
      </button>
      <button id="sw-dismiss-btn" style="background:transparent;color:#93c5fd;border:none;
        cursor:pointer;font-size:18px;line-height:1;padding:0 4px">
        ×
      </button>
    `;
    document.body.appendChild(banner);

    document.getElementById('sw-refresh-btn')?.addEventListener('click', () => {
      banner.remove();
      updateFn();
    });
    document.getElementById('sw-dismiss-btn')?.addEventListener('click', () => {
      banner.remove();
    });
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <OfflineProvider>
          <App />
        </OfflineProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

// Initialise offline sync listeners after mount
// Safari iOS fallback: uses window.online event (BackgroundSync not supported)
initSyncListeners();
