/**
 * Authentication API client for Bharat Tax Mitra
 * Handles OTP-based authentication with secure token management
 */

import { db } from '../lib/db';
import { clearEncryptionKeys } from '../lib/crypto';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// ---------------------------------------------------------------------------
// AuthError
// ---------------------------------------------------------------------------

export class AuthError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'AuthError';
  }
}

// ---------------------------------------------------------------------------
// Device identifier
// ---------------------------------------------------------------------------

/**
 * Build a stable device fingerprint string for the X-Device-Id header.
 * We intentionally keep it in localStorage so it stays consistent across
 * sessions without exposing it to the private getDeviceId() in crypto.ts.
 */
function getDeviceFingerprint(): string {
  const storageKey = 'device-id';
  const stored = localStorage.getItem(storageKey);
  if (stored) return stored;

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
  ].join('|');

  localStorage.setItem(storageKey, fingerprint);
  return fingerprint;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Base headers for every request */
function baseHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Device-Id': getDeviceFingerprint(),
  };
}

/** Authenticated headers (adds Bearer token if available) */
async function authHeaders(): Promise<Record<string, string>> {
  const headers = baseHeaders();

  try {
    const profiles = await db.profiles.toArray();
    if (profiles.length > 0 && profiles[0].authToken) {
      // authToken is stored encrypted – retrieve via getProfile which decrypts
      const profile = await db.getProfile(profiles[0].userId);
      if (profile?.authToken) {
        headers['Authorization'] = `Bearer ${profile.authToken}`;
      }
    }
  } catch {
    // No token available; proceed unauthenticated
  }

  return headers;
}

/** Map an HTTP response to an AuthError */
async function mapResponseError(
  response: Response,
  context: 'verifyOTP' | 'refresh' | 'generic',
): Promise<AuthError> {
  let body: { message?: string; detail?: string } = {};
  try {
    body = await response.json();
  } catch {
    // ignore parse errors
  }

  // The AWS Lambda API returns { message }, but the local FastAPI mock server
  // returns errors as { detail } (FastAPI's HTTPException default). Read both so
  // server-provided messages ("Invalid OTP. 2 attempt(s) remaining.") surface in
  // dev, not just the generic fallback.
  const serverMessage = body.message ?? body.detail;

  if (response.status === 429) {
    const isLockout =
      serverMessage != null &&
      (serverMessage.toLowerCase().includes('lock') ||
        serverMessage.toLowerCase().includes('block'));
    return new AuthError(
      serverMessage ?? 'Too many requests',
      isLockout ? 'LOCKED' : 'RATE_LIMIT',
    );
  }

  if (response.status === 401 && context === 'verifyOTP') {
    return new AuthError(serverMessage ?? 'Invalid OTP', 'INVALID_OTP');
  }

  if (response.status >= 500) {
    return new AuthError(serverMessage ?? 'Server error', 'SERVER_ERROR');
  }

  return new AuthError(
    serverMessage ?? `Request failed with status ${response.status}`,
    'SERVER_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Automatic token refresh + retry
// ---------------------------------------------------------------------------

let isRefreshing = false;

/**
 * Perform a fetch with automatic 401 → refresh → retry behaviour.
 * Only retries once to avoid infinite loops.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retry = true,
): Promise<Response> {
  const response = await fetch(url, init);

  if (response.status === 401 && retry && !isRefreshing) {
    // Attempt silent token refresh
    try {
      const profiles = await db.profiles.toArray();
      if (profiles.length > 0) {
        const profile = await db.getProfile(profiles[0].userId);
        if (profile?.refreshToken) {
          const refreshed = await refreshAccessToken(profile.refreshToken);

          // Update stored tokens
          await db.saveProfile({
            ...profile,
            authToken: refreshed.accessToken,
            updatedAt: Date.now(),
          });

          // Retry the original request with the new access token
          const retryInit: RequestInit = {
            ...init,
            headers: {
              ...(init.headers as Record<string, string>),
              Authorization: `Bearer ${refreshed.accessToken}`,
            },
          };
          return fetchWithRetry(url, retryInit, false);
        }
      }
    } catch {
      // Refresh failed; return the original 401
    }
  }

  return response;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send OTP to the given mobile number.
 * Requirements: 1.2
 */
export async function sendOTP(
  mobileNumber: string,
): Promise<{ expiresIn: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: baseHeaders(),
      body: JSON.stringify({ mobileNumber }),
    });

    if (!response.ok) {
      throw await mapResponseError(response, 'generic');
    }

    return response.json() as Promise<{ expiresIn: number }>;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(
      error instanceof Error ? error.message : 'Network request failed',
      'NETWORK_ERROR',
    );
  }
}

/**
 * Verify OTP and exchange for auth tokens.
 * On success the tokens are stored in IndexedDB.
 * Requirements: 1.2, 1.3
 */
export async function verifyOTP(
  mobileNumber: string,
  otp: string,
): Promise<{
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: baseHeaders(),
      body: JSON.stringify({ mobileNumber, otp }),
    });

    if (!response.ok) {
      throw await mapResponseError(response, 'verifyOTP');
    }

    const data = (await response.json()) as {
      userId: string;
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };

    // Persist tokens to IndexedDB — failure must not block auth success
    try {
      const languageCode =
        localStorage.getItem('i18nextLng') ||
        localStorage.getItem('language') ||
        'en';

      await db.saveProfile({
        userId: data.userId,
        mobileNumber,
        languageCode,
        preferredRegime: 'new',
        authToken: data.accessToken,
        refreshToken: data.refreshToken,
        lastSyncTimestamp: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (storageError) {
      console.error('Failed to persist auth tokens to IndexedDB:', storageError);
      // Continue — auth success is the primary concern
    }

    return data;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(
      error instanceof Error ? error.message : 'Network request failed',
      'NETWORK_ERROR',
    );
  }
}

/**
 * Exchange a refresh token for a new access token.
 * Requirements: 1.3, 1.4
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  if (isRefreshing) {
    // Guard against concurrent refresh calls
    return Promise.reject(new AuthError('Refresh already in progress', 'SERVER_ERROR'));
  }

  isRefreshing = true;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: baseHeaders(),
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw await mapResponseError(response, 'refresh');
    }

    return response.json() as Promise<{ accessToken: string; expiresIn: number }>;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(
      error instanceof Error ? error.message : 'Network request failed',
      'NETWORK_ERROR',
    );
  } finally {
    isRefreshing = false;
  }
}

/**
 * Log the user out: clears IndexedDB tokens and encryption keys.
 * Requirements: 1.4
 */
export async function logout(): Promise<void> {
  try {
    // Best-effort server-side logout
    const headers = await authHeaders();
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers,
    });
  } catch {
    // Ignore server errors — local cleanup always proceeds
  }

  try {
    const profiles = await db.profiles.toArray();
    for (const profile of profiles) {
      await db.deleteProfile(profile.userId);
    }
  } catch (error) {
    console.error('Failed to clear profiles from IndexedDB:', error);
  }

  // Clear encryption keys from localStorage
  clearEncryptionKeys();
}

// Re-export fetchWithRetry for internal use by other services if needed
export { fetchWithRetry };
