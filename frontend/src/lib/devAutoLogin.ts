/**
 * DEV-ONLY auth bypass — skips the mobile + OTP screens during local development.
 *
 * WHY THIS IS SAFE TO HAVE IN THE TREE
 * ------------------------------------
 * Two independent guards, both of which must pass:
 *
 *   1. `import.meta.env.DEV` — Vite replaces this with the literal `false` in
 *      any production build, so the whole body becomes unreachable and is
 *      dropped by the minifier. The bypass cannot exist in a shipped bundle,
 *      even if someone sets the env var on the build machine.
 *   2. `VITE_DEV_AUTOLOGIN === 'true'` — opt-in, and only ever set in
 *      `.env.development`, which `vite build` does not load.
 *
 * It seeds a REAL IndexedDB profile rather than faking the auth state, so every
 * downstream path (userId-scoped encryption, drafts, sessions, erasure) behaves
 * exactly as it does after a genuine login. The only thing skipped is the OTP
 * round-trip itself.
 *
 * The seeded token is a transparently fake string — it is never accepted by any
 * real backend, only by the local FastAPI mock server.
 */

import { db } from './db';

/** Stable identity so drafts and sessions survive across dev reloads. */
const DEV_USER_ID = 'dev-autologin-user';
const DEV_MOBILE = '9876543210';

export interface DevAutoLoginResult {
  userId: string;
  languageCode: string;
  preferredRegime: 'old' | 'new';
}

export function isDevAutoLoginEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_AUTOLOGIN === 'true';
}

/**
 * Seeds (or reuses) the dev profile and returns the auth state to adopt.
 * Returns `null` whenever the bypass is not active — callers should fall
 * through to the normal session check.
 */
export async function maybeDevAutoLogin(): Promise<DevAutoLoginResult | null> {
  if (!isDevAutoLoginEnabled()) return null;

  try {
    const existing = await db.getProfile(DEV_USER_ID);
    if (!existing) {
      const now = Date.now();
      await db.saveProfile({
        userId: DEV_USER_ID,
        mobileNumber: DEV_MOBILE,
        languageCode: 'en',
        preferredRegime: 'new',
        authToken: 'dev-autologin-token-not-valid-anywhere',
        lastSyncTimestamp: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Loud on purpose: nobody should ever wonder why login was skipped.
    console.warn(
      '[dev] OTP bypass active (VITE_DEV_AUTOLOGIN=true) — signed in as %s. ' +
        'This code is stripped from production builds.',
      DEV_USER_ID,
    );

    return {
      userId: DEV_USER_ID,
      languageCode: existing?.languageCode ?? 'en',
      preferredRegime: existing?.preferredRegime ?? 'new',
    };
  } catch (error) {
    // Never let a dev convenience break the real boot path.
    console.error('[dev] auto-login failed, falling back to normal auth:', error);
    return null;
  }
}
