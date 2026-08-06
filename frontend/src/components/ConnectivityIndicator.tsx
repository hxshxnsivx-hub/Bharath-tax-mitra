/**
 * Connectivity Indicator Component
 * 
 * Displays the current online/offline status and service worker state.
 * Shows visual feedback to users about network connectivity and offline capability.
 */

import React from 'react';
import { useOnlineStatus, useServiceWorker } from '../hooks/useServiceWorker';
import { useNetworkQuality } from '../hooks/useNetworkQuality';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface ConnectivityIndicatorProps {
  className?: string;
  showUpdatePrompt?: boolean;
}

/**
 * ConnectivityIndicator Component
 * 
 * Displays:
 * - Online/Offline status with color-coded indicator
 * - Service worker update notification
 * - Offline-ready badge when PWA is installed
 * 
 * @example
 * ```tsx
 * <ConnectivityIndicator className="fixed top-4 right-4" showUpdatePrompt />
 * ```
 */
export const ConnectivityIndicator: React.FC<ConnectivityIndicatorProps> = ({
  className = '',
  showUpdatePrompt = true,
}) => {
  const isOnline = useOnlineStatus();
  const { isSlow } = useNetworkQuality();
  const { needRefresh, updateServiceWorker, isOfflineReady } = useServiceWorker();

  // Three-state connectivity: Red (offline), Yellow (online but slow/2g), Green (online)
  const connectivity: 'offline' | 'slow' | 'online' = !isOnline
    ? 'offline'
    : isSlow
      ? 'slow'
      : 'online';

  const statusConfig = {
    online: {
      className: 'bg-green-100 text-green-800',
      label: 'Online',
      text: 'Online',
      icon: <Wifi className="w-4 h-4" />,
    },
    slow: {
      className: 'bg-yellow-100 text-yellow-800',
      label: 'Slow connection',
      text: 'Slow Connection',
      icon: <Wifi className="w-4 h-4" />,
    },
    offline: {
      className: 'bg-red-100 text-red-800',
      label: 'Offline',
      text: 'Offline',
      icon: <WifiOff className="w-4 h-4" />,
    },
  }[connectivity];

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Connectivity Status — Green (online) / Yellow (slow) / Red (offline) */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusConfig.className}`}
        role="status"
        aria-live="polite"
        aria-label={statusConfig.label}
      >
        {statusConfig.icon}
        <span>{statusConfig.text}</span>
      </div>

      {/* Offline Ready Badge */}
      {isOfflineReady && !needRefresh && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
          role="status"
          aria-live="polite"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>Offline Ready</span>
        </div>
      )}

      {/* Update Available Notification */}
      {needRefresh && showUpdatePrompt && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-900 border border-yellow-300"
          role="alert"
          aria-live="assertive"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="flex-1">Update Available</span>
          <button
            onClick={updateServiceWorker}
            className="px-2 py-1 text-xs font-semibold rounded bg-yellow-600 text-white hover:bg-yellow-700 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            aria-label="Update application to latest version"
          >
            Update
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Minimal Connectivity Badge
 * 
 * A compact version showing only online/offline status
 * 
 * @example
 * ```tsx
 * <ConnectivityBadge />
 * ```
 */
export const ConnectivityBadge: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const isOnline = useOnlineStatus();

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={isOnline ? 'Online' : 'Offline'}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          isOnline ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className="text-sm text-gray-600">
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
};

export default ConnectivityIndicator;
