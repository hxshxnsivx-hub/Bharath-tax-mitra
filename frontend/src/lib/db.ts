import Dexie, { Table } from 'dexie';
import type { TaxRules } from '../../../shared/types/tax-rules';

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
  extractedData?: Record<string, any>;
  userEdits?: Record<string, any>;
  calculationResults?: {
    oldRegime?: any;
    newRegime?: any;
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
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface SavedDraft {
  draftId: string;
  sessionId: string;
  formData: Record<string, any>;
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

export interface LanguagePack {
  languageCode: string;
  translations: Record<string, string>;
  version: string;
  cachedAt: number;
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
  languagePacks!: Table<LanguagePack, string>;
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
        mobileNumber: await encryptData(profile.mobileNumber),
        authToken: profile.authToken ? await encryptData(profile.authToken) : undefined,
        refreshToken: profile.refreshToken ? await encryptData(profile.refreshToken) : undefined,
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
        mobileNumber: await decryptData(encryptedProfile.mobileNumber),
        authToken: encryptedProfile.authToken ? await decryptData(encryptedProfile.authToken) : undefined,
        refreshToken: encryptedProfile.refreshToken ? await decryptData(encryptedProfile.refreshToken) : undefined,
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
}

// Export singleton instance
export const db = new BharatTaxMitraDB();

// Import encryption utilities
import { encryptData, decryptData } from './crypto';

// Re-export for convenience
export { encryptData, decryptData };

