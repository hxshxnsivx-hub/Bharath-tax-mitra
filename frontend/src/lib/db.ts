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
}

// Export singleton instance
export const db = new BharatTaxMitraDB();

// Helper functions for encryption (to be implemented with Web Crypto API)
export async function encryptData(data: string): Promise<string> {
  // TODO: Implement Web Crypto API encryption
  // For now, return as-is (will be implemented in Module 1.3)
  return data;
}

export async function decryptData(encryptedData: string): Promise<string> {
  // TODO: Implement Web Crypto API decryption
  // For now, return as-is (will be implemented in Module 1.3)
  return encryptedData;
}
