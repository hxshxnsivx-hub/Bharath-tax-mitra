/**
 * SettingsView — account, language, privacy & data controls.
 *
 * Homes several buildable Phase 4 client tasks:
 *  - 4.3.3  Right to erasure ("Delete My Data") — full local wipe behind an
 *           explicit confirmation dialog.
 *  - 4.11.1 Storage management — live usage readout + "Clear Cache" (drops the
 *           service-worker caches without touching the user's tax data).
 *
 * Loaded lazily so its JS (db + cache helpers) stays out of the initial chunk.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db, getStorageEstimate } from '../../lib/db';
import { clearAllCaches } from '../../lib/serviceWorkerRegistration';
import { clearConsent } from '../../utils/consent';
import { SUPPORTED_LANGUAGES } from '../../i18n/config';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../../components/ui';

interface SettingsViewProps {
  onLogout: () => void;
  authState: { userId: string | null; preferredRegime: 'old' | 'new' };
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function SettingsView({ onLogout, authState }: SettingsViewProps) {
  const { t, i18n } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);

  const refreshStorage = () => {
    getStorageEstimate().then(setStorage);
  };
  useEffect(refreshStorage, []);

  const handleDeleteData = async () => {
    setDeleting(true);
    try {
      await db.deleteAllUserData();
      await clearAllCaches();
      // Consent is part of the user's data — revoking it means we ask again
      // before any future PII is collected (task 4.1.3 + 4.3.3).
      clearConsent();
      try {
        localStorage.removeItem('btm_lang');
      } catch {
        /* localStorage may be unavailable in private mode */
      }
    } finally {
      setConfirmOpen(false);
      setDeleting(false);
      onLogout(); // erasure complete → return to a clean session
    }
  };

  const handleClearCache = async () => {
    await clearAllCaches();
    setCacheCleared(true);
    refreshStorage();
    setTimeout(() => setCacheCleared(false), 2500);
  };

  const langButton = (active: boolean) =>
    `py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
      active ? 'btn-gold' : 'hairline bg-card text-foreground hover:bg-secondary/60'
    }`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 lg:px-8">
      <header className="mb-6">
        <div className="eyebrow text-[hsl(var(--gold-deep))]">{t('settings.eyebrow', { defaultValue: 'Preferences' })}</div>
        <h2 className="font-display text-3xl font-semibold text-foreground">{t('nav.settings', { defaultValue: 'Settings' })}</h2>
      </header>

      <div className="space-y-4">
        {/* Account */}
        <section className="hairline overflow-hidden rounded-2xl bg-card shadow-elevated">
          <div className="hairline-b px-5 py-3">
            <span className="eyebrow text-muted-foreground">{t('settings.account', { defaultValue: 'Account' })}</span>
          </div>
          <div className="space-y-1.5 px-5 py-4 text-sm text-muted-foreground">
            <div>{t('settings.userId', { defaultValue: 'User ID' })}: <span className="font-mono text-xs">{authState.userId?.slice(0, 20)}…</span></div>
            <div>{t('language.current', { defaultValue: 'Language' })}: <span className="font-semibold text-foreground">{SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)?.nativeName}</span></div>
            <div>{t('settings.regime', { defaultValue: 'Regime' })}: <span className="font-semibold capitalize text-foreground">{authState.preferredRegime}</span></div>
          </div>
        </section>

        {/* Language */}
        <section className="hairline overflow-hidden rounded-2xl bg-card shadow-elevated">
          <div className="hairline-b px-5 py-3">
            <span className="eyebrow text-muted-foreground">{t('settings.language', { defaultValue: 'Language' })}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button key={lang.code} onClick={() => i18n.changeLanguage(lang.code)} className={langButton(i18n.language === lang.code)}>
                {lang.nativeName}
              </button>
            ))}
          </div>
        </section>

        {/* Storage & cache (4.11.1) */}
        <section className="hairline overflow-hidden rounded-2xl bg-card shadow-elevated">
          <div className="hairline-b px-5 py-3">
            <span className="eyebrow text-muted-foreground">{t('settings.storage', { defaultValue: 'Storage' })}</span>
          </div>
          <div className="space-y-3 px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('settings.storageUsed', { defaultValue: 'Local storage used' })}</span>
              <span className="figure-display font-semibold text-foreground">
                {storage ? formatBytes(storage.usage) : '—'}
              </span>
            </div>
            {storage && storage.quota > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-deep))]"
                  style={{ width: `${Math.min(100, (storage.usage / storage.quota) * 100).toFixed(1)}%` }}
                />
              </div>
            )}
            <button
              onClick={handleClearCache}
              className="hairline w-full rounded-lg bg-card py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/60"
            >
              {cacheCleared ? t('settings.cacheCleared', { defaultValue: 'Cache cleared ✓' }) : t('settings.clearCache', { defaultValue: 'Clear cached files' })}
            </button>
            <p className="text-xs text-muted-foreground">
              {t('settings.clearCacheHint', { defaultValue: 'Frees offline app files. Your tax data is kept.' })}
            </p>
          </div>
        </section>

        {/* Privacy & data */}
        <section className="hairline overflow-hidden rounded-2xl bg-card shadow-elevated">
          <div className="hairline-b px-5 py-3">
            <span className="eyebrow text-muted-foreground">{t('settings.privacy', { defaultValue: 'Privacy & Data' })}</span>
          </div>
          <div className="space-y-3 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">{t('settings.encryption', { defaultValue: 'Local Encryption' })}</div>
                <div className="text-xs text-muted-foreground">AES-GCM-256 · Web Crypto</div>
              </div>
              <span className="text-xs font-semibold text-[hsl(var(--gold-deep))]">✓ {t('settings.active', { defaultValue: 'Active' })}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">{t('settings.ttl', { defaultValue: 'Document Auto-Delete' })}</div>
                <div className="text-xs text-muted-foreground">{t('settings.ttlHint', { defaultValue: 'Documents removed after 24 hours' })}</div>
              </div>
              <span className="text-xs font-semibold text-[hsl(var(--gold-deep))]">✓ {t('settings.enabled', { defaultValue: 'Enabled' })}</span>
            </div>
            <button
              onClick={() => setConfirmOpen(true)}
              id="clear-data-btn"
              className="mt-1 w-full rounded-lg border border-destructive/40 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5"
            >
              {t('settings.deleteData', { defaultValue: 'Delete all my data' })}
            </button>
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={onLogout}
          id="settings-logout-btn"
          className="bg-ink w-full rounded-xl py-3 font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t('header.logout', { defaultValue: 'Logout' })}
        </button>
      </div>

      {/* Erasure confirmation (task 4.3.3) */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{t('settings.deleteConfirmTitle', { defaultValue: 'Delete all your data?' })}</DialogTitle>
            <DialogDescription>
              {t('settings.deleteConfirmBody', {
                defaultValue:
                  'This permanently removes your profile, tax sessions, drafts and cached data from this device. This cannot be undone.',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button className="hairline rounded-lg bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/60">
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </button>
            </DialogClose>
            <button
              onClick={handleDeleteData}
              disabled={deleting}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {deleting ? t('settings.deleting', { defaultValue: 'Deleting…' }) : t('settings.confirmDelete', { defaultValue: 'Yes, delete everything' })}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
