/**
 * PII consent persistence (task 4.1.3).
 *
 * Kept out of ConsentDialog.tsx so that file only exports components
 * (Vite fast-refresh requirement, same pattern as utils/buildTaxData.ts).
 *
 * Storage is per-device and deliberately simple: consent is a local, offline
 * fact — the app never sends it anywhere.
 */

export const CONSENT_STORAGE_KEY = 'btm_pii_consent_v1';

/** True when this device has already granted PII consent. */
export function hasStoredConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === 'granted';
  } catch {
    return false; // private mode / storage blocked → ask again
  }
}

export function storeConsent(): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
  } catch {
    /* non-fatal: we simply ask again next time */
  }
}

/** Clear consent — used by the "delete all my data" erasure path. */
export function clearConsent(): void {
  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    /* non-fatal */
  }
}
