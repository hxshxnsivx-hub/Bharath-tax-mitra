import Dexie, { Table } from 'dexie';
import type { TaxRules } from '../../../shared/types/tax-rules';
import type { TaxCalculationResult } from '../../../shared/types/tax-calculation';

// Database schema interfaces
export interface UserProfile {
  userId: string;
  mobileNumber: string; // encrypted
  languageCode: string;
  preferredRegime: 'old' | 'new';
  authToken?: string; // encrypted
  refreshToken?: string; // encrypted
  lastSyncTimestamp: number;
  createdAt: number;
  updatedAt: number;
}

export interface TaxSession {
  sessionId: string;
  userId: string;
  financialYear: string;
  status: 'draft' | 'review' | 'exported' | 'filed';
  extractedData?: Record<string, unknown>;
  userEdits?: Record<string, unknown>;
  calculationResults?: {
    oldRegime?: TaxCalculationResult;
    newRegime?: TaxCalculationResult;
  };
  validationWarnings?: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  completenessScore: number;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

export interface PendingRequest {
  requestId: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  /** Request body — shape depends on the queued endpoint; serialised as JSON on replay. */
  payload: unknown;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface SavedDraft {
  draftId: string;
  sessionId: string;
  /** Heterogeneous — each form saves its own section shape; cast at read sites. */
  formData: Record<string, unknown>;
  savedAt: number;
  autoSave: boolean;
}

export interface TaxRulesCache {
  financialYear: string;
  version: string;
  rules: TaxRules;
  cachedAt: number;
  expiresAt: number;
}

export interface FaqCache {
  questionHash: string;
  question: string;
  answer: string;
  languageCode: string;
  cachedAt: number;
  expiresAt: number;
}

// Database class
export class BharatTaxMitraDB extends Dexie {
  profiles!: Table<UserProfile, string>;
  taxSessions!: Table<TaxSession, string>;
  pendingRequests!: Table<PendingRequest, string>;
  savedDrafts!: Table<SavedDraft, string>;
  taxRules!: Table<TaxRulesCache, string>;
  faqCache!: Table<FaqCache, string>;

  constructor() {
    super('bharatTaxMitraDB');

    this.version(1).stores({
      profiles: 'userId, mobileNumber',
      taxSessions: 'sessionId, userId, [userId+status], status, updatedAt',
      pendingRequests: 'requestId, timestamp',
      savedDrafts: 'draftId, sessionId, savedAt',
      taxRules: 'financialYear, expiresAt',
      languagePacks: 'languageCode',
      faqCache: 'questionHash, [languageCode+questionHash], expiresAt',
    });

    this.version(2).stores({
      languagePacks: null, // drop the languagePacks store
    });
  }

  // Language preference helpers
  async getLanguagePreference(): Promise<string | null> {
    try {
      const profiles = await this.profiles.toArray();
      if (profiles.length > 0) {
        return profiles[0].languageCode;
      }
      return null;
    } catch (error) {
      console.error('Failed to get language preference:', error);
      return null;
    }
  }

  async saveLanguagePreference(languageCode: string): Promise<void> {
    try {
      const profiles = await this.profiles.toArray();
      if (profiles.length > 0) {
        // Update existing profile
        await this.profiles.update(profiles[0].userId, {
          languageCode,
          updatedAt: Date.now(),
        });
      } else {
        // Create temporary profile for language preference
        await this.profiles.add({
          userId: 'temp-' + Date.now(),
          mobileNumber: '',
          languageCode,
          preferredRegime: 'new',
          lastSyncTimestamp: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  }

  // Profile management with encryption
  async saveProfile(profile: Omit<UserProfile, 'mobileNumber' | 'authToken' | 'refreshToken'> & {
    mobileNumber: string;
    authToken?: string;
    refreshToken?: string;
  }): Promise<void> {
    try {
      // Encrypt sensitive fields
      const encryptedProfile: UserProfile = {
        ...profile,
        mobileNumber: await encryptData(profile.mobileNumber, profile.userId),
        authToken: profile.authToken ? await encryptData(profile.authToken, profile.userId) : undefined,
        refreshToken: profile.refreshToken ? await encryptData(profile.refreshToken, profile.userId) : undefined,
      };

      await this.profiles.put(encryptedProfile);
    } catch (error) {
      console.error('Failed to save profile:', error);
      throw error;
    }
  }

  async getProfile(userId: string): Promise<(Omit<UserProfile, 'mobileNumber' | 'authToken' | 'refreshToken'> & {
    mobileNumber: string;
    authToken?: string;
    refreshToken?: string;
  }) | null> {
    try {
      const encryptedProfile = await this.profiles.get(userId);
      if (!encryptedProfile) {
        return null;
      }

      // Decrypt sensitive fields
      return {
        ...encryptedProfile,
        mobileNumber: await decryptData(encryptedProfile.mobileNumber, userId),
        authToken: encryptedProfile.authToken ? await decryptData(encryptedProfile.authToken, userId) : undefined,
        refreshToken: encryptedProfile.refreshToken ? await decryptData(encryptedProfile.refreshToken, userId) : undefined,
      };
    } catch (error) {
      console.error('Failed to get profile:', error);
      return null;
    }
  }

  async deleteProfile(userId: string): Promise<void> {
    try {
      await this.profiles.delete(userId);
    } catch (error) {
      console.error('Failed to delete profile:', error);
      throw error;
    }
  }

  /**
   * Right-to-erasure (task 4.3.3): wipe EVERY local store — profiles, sessions,
   * drafts, queued requests, cached rules, cached FAQs. The AES-GCM encryption
   * key is derived (not stored) from userId+deviceId, so clearing the data is a
   * complete erasure — there is nothing left to decrypt.
   */
  async deleteAllUserData(): Promise<void> {
    await Promise.all([
      this.profiles.clear(),
      this.taxSessions.clear(),
      this.pendingRequests.clear(),
      this.savedDrafts.clear(),
      this.taxRules.clear(),
      this.faqCache.clear(),
    ]);
  }
}

/**
 * Best-effort local storage usage (task 4.11.1). Returns bytes used and the
 * origin quota where the Storage API is available; zeros otherwise.
 */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
  try {
    if (navigator.storage?.estimate) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      return { usage, quota };
    }
  } catch (error) {
    console.error('Failed to estimate storage:', error);
  }
  return { usage: 0, quota: 0 };
}

// Export singleton instance
export const db = new BharatTaxMitraDB();

// Import encryption utilities
import { encryptData, decryptData } from './crypto';

// Re-export for convenience
export { encryptData, decryptData };

