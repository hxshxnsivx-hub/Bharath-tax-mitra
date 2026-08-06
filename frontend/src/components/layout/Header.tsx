/**
 * Header Component
 *
 * Sticky top navigation bar with logo, connectivity indicator,
 * sync status, language selector, and logout button.
 */

import { useState, useEffect, useRef } from 'react';
import { LogOut, ChevronDown, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../i18n/config';

interface SyncStatus {
  pending: number;
  lastSyncAt?: number;
}

interface HeaderProps {
  onLogout: () => void;
  userId?: string;
  completenessScore?: number;
  selectedLanguage: string;
  onLanguageChange: (code: string) => void;
  syncStatus?: SyncStatus;
  isOnline?: boolean;
  connectionQuality?: 'online' | 'slow' | 'offline';
}

/** Returns a human-readable "X min ago" string from a timestamp */
function timeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1m ago';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return '1h ago';
  return `${diffHr}h ago`;
}

export function Header({
  onLogout,
  selectedLanguage,
  onLanguageChange,
  syncStatus,
  isOnline = navigator.onLine,
  connectionQuality = isOnline ? 'online' : 'offline',
}: HeaderProps) {
  const [langOpen, setLangOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [, setTick] = useState(0);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Re-render every 30 s so "last synced X min ago" stays fresh
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Simulate a brief spinning animation when sync status has pending > 0
  useEffect(() => {
    if (syncStatus && syncStatus.pending > 0) {
      setIsSyncing(true);
      const t = setTimeout(() => setIsSyncing(false), 1500);
      return () => clearTimeout(t);
    }
    // Keyed on the pending count only — re-running on every syncStatus object
    // identity change would restart the spinner animation needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncStatus?.pending]);

  // Close language dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    if (langOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [langOpen]);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);

  const connectivityDotClass =
    connectionQuality === 'online'
      ? 'bg-green-400'
      : connectionQuality === 'slow'
      ? 'bg-yellow-400'
      : 'bg-red-500';

  const connectivityLabel =
    connectionQuality === 'online'
      ? 'Online'
      : connectionQuality === 'slow'
      ? 'Slow connection'
      : 'Offline';

  return (
    <header
      className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white sticky top-0 z-50 shadow-lg"
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* ── Logo ── */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div
            className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center text-blue-900 font-bold text-sm select-none"
            aria-hidden="true"
          >
            भ
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">Bharat Tax Mitra</div>
            <div className="text-blue-200 text-xs">FY 2025-26</div>
          </div>
        </div>

        {/* ── Right cluster ── */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Connectivity dot */}
          <div
            className="flex items-center gap-1.5"
            role="status"
            aria-label={connectivityLabel}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${connectivityDotClass} ${
                connectionQuality === 'offline' ? 'animate-pulse' : ''
              }`}
            />
            <span className="hidden sm:block text-xs text-blue-200">{connectivityLabel}</span>
            {connectionQuality === 'online' ? (
              <Wifi className="w-3.5 h-3.5 text-blue-300 hidden sm:block" aria-hidden="true" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-red-300 hidden sm:block" aria-hidden="true" />
            )}
          </div>

          {/* Sync status */}
          {syncStatus && (
            <div
              className="hidden sm:flex items-center gap-1 text-blue-200 text-xs"
              aria-label={
                isSyncing
                  ? 'Syncing…'
                  : syncStatus.lastSyncAt
                  ? `Last synced ${timeAgo(syncStatus.lastSyncAt)}`
                  : 'Not yet synced'
              }
            >
              {isSyncing ? (
                <RefreshCw
                  className="w-3.5 h-3.5 animate-spin text-amber-300"
                  aria-hidden="true"
                />
              ) : (
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>
                {isSyncing
                  ? 'Syncing…'
                  : syncStatus.lastSyncAt
                  ? `Synced ${timeAgo(syncStatus.lastSyncAt)}`
                  : 'Not synced'}
              </span>
            </div>
          )}

          {/* Language selector */}
          <div className="relative" ref={langMenuRef}>
            <button
              id="lang-switcher-btn"
              onClick={() => setLangOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              aria-label={`Language: ${currentLang?.nativeName ?? selectedLanguage}. Change language`}
              className="flex items-center gap-1 text-xs text-blue-200 hover:text-white transition-colors px-2 py-1 rounded hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <span>{currentLang?.nativeName ?? selectedLanguage}</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {langOpen && (
              <ul
                role="listbox"
                aria-label="Select language"
                className="absolute right-0 top-9 bg-white rounded-lg shadow-xl border border-gray-100 py-1 w-40 z-50"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <li key={lang.code} role="option" aria-selected={selectedLanguage === lang.code}>
                    <button
                      onClick={() => {
                        onLanguageChange(lang.code);
                        setLangOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-50 ${
                        selectedLanguage === lang.code
                          ? 'text-blue-600 font-semibold bg-blue-50'
                          : 'text-gray-700'
                      }`}
                    >
                      {lang.nativeName}
                      <span className="ml-1 text-gray-400 text-xs">({lang.name})</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Logout */}
          <button
            id="logout-btn"
            onClick={onLogout}
            aria-label="Log out"
            className="flex items-center gap-1 text-xs text-blue-200 hover:text-white transition-colors px-2 py-1 rounded hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
