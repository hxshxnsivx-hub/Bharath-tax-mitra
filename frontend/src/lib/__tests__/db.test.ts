import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BharatTaxMitraDB } from '../db';
import { clearEncryptionKeys } from '../crypto';

describe('IndexedDB with Encryption', () => {
  let db: BharatTaxMitraDB;

  beforeEach(async () => {
    // Create a fresh database instance
    db = new BharatTaxMitraDB();

    // fake-indexeddb persists globally across tests — clear all tables for isolation
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));

    // Clear encryption keys
    localStorage.clear();
    clearEncryptionKeys();
  });

  afterEach(async () => {
    // Just close the connection
    db.close();
  });

  describe('Profile Management', () => {
    it('should save and retrieve profile with encrypted sensitive data', async () => {
      const profile = {
        userId: 'user-123',
        mobileNumber: '+919876543210',
        languageCode: 'en',
        preferredRegime: 'new' as const,
        authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        refreshToken: 'refresh-token-xyz',
        lastSyncTimestamp: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.saveProfile(profile);

      const retrieved = await db.getProfile('user-123');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.userId).toBe(profile.userId);
      expect(retrieved?.mobileNumber).toBe(profile.mobileNumber);
      expect(retrieved?.authToken).toBe(profile.authToken);
      expect(retrieved?.refreshToken).toBe(profile.refreshToken);
      expect(retrieved?.languageCode).toBe(profile.languageCode);
    });

    it('should store encrypted data in IndexedDB (not plaintext)', async () => {
      const profile = {
        userId: 'user-456',
        mobileNumber: '+919876543210',
        languageCode: 'hi',
        preferredRegime: 'old' as const,
        authToken: 'secret-token',
        lastSyncTimestamp: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.saveProfile(profile);

      // Directly access the encrypted data from IndexedDB
      const encryptedProfile = await db.profiles.get('user-456');
      expect(encryptedProfile).not.toBeNull();
      
      // Encrypted fields should not match plaintext
      expect(encryptedProfile?.mobileNumber).not.toBe(profile.mobileNumber);
      expect(encryptedProfile?.authToken).not.toBe(profile.authToken);
      
      // Encrypted data should be base64 encoded
      expect(encryptedProfile?.mobileNumber).toMatch(/^[A-Za-z0-9+/=]+$/);
      expect(encryptedProfile?.authToken).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should handle profile without optional tokens', async () => {
      const profile = {
        userId: 'user-789',
        mobileNumber: '+919876543210',
        languageCode: 'ta',
        preferredRegime: 'new' as const,
        lastSyncTimestamp: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.saveProfile(profile);

      const retrieved = await db.getProfile('user-789');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.authToken).toBeUndefined();
      expect(retrieved?.refreshToken).toBeUndefined();
    });

    it('should update existing profile', async () => {
      const profile = {
        userId: 'user-update',
        mobileNumber: '+919876543210',
        languageCode: 'en',
        preferredRegime: 'new' as const,
        lastSyncTimestamp: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.saveProfile(profile);

      // Update with new token
      const updatedProfile = {
        ...profile,
        authToken: 'new-token',
        updatedAt: Date.now(),
      };

      await db.saveProfile(updatedProfile);

      const retrieved = await db.getProfile('user-update');
      expect(retrieved?.authToken).toBe('new-token');
    });

    it('should delete profile', async () => {
      const profile = {
        userId: 'user-delete',
        mobileNumber: '+919876543210',
        languageCode: 'en',
        preferredRegime: 'new' as const,
        lastSyncTimestamp: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.saveProfile(profile);
      expect(await db.getProfile('user-delete')).not.toBeNull();

      await db.deleteProfile('user-delete');
      expect(await db.getProfile('user-delete')).toBeNull();
    });

    it('should return null for non-existent profile', async () => {
      const retrieved = await db.getProfile('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Language Preference', () => {
    it('should save and retrieve language preference', async () => {
      await db.saveLanguagePreference('hi');
      const lang = await db.getLanguagePreference();
      expect(lang).toBe('hi');
    });

    it('should update language preference', async () => {
      await db.saveLanguagePreference('en');
      expect(await db.getLanguagePreference()).toBe('en');

      await db.saveLanguagePreference('ta');
      expect(await db.getLanguagePreference()).toBe('ta');
    });

    it('should return null when no preference exists', async () => {
      const lang = await db.getLanguagePreference();
      expect(lang).toBeNull();
    });
  });

  describe('Tax Sessions', () => {
    it('should store tax session data', async () => {
      const session = {
        sessionId: 'session-123',
        userId: 'user-123',
        financialYear: 'FY2025-26',
        status: 'draft' as const,
        completenessScore: 65,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncStatus: 'synced' as const,
      };

      await db.taxSessions.add(session);

      const retrieved = await db.taxSessions.get('session-123');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.userId).toBe('user-123');
      expect(retrieved?.status).toBe('draft');
    });
  });

  describe('Tax Rules Cache', () => {
    it('should cache tax rules', async () => {
      const rules = {
        financialYear: 'FY2025-26',
        version: '1.0.0',
        rules: {
          oldRegime: { slabs: [] },
          newRegime: { slabs: [] },
        } as unknown as import('../db').TaxRulesCache['rules'],
        cachedAt: Date.now(),
        expiresAt: Date.now() + 86400000, // 24 hours
      };

      await db.taxRules.add(rules);

      const retrieved = await db.taxRules.get('FY2025-26');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.version).toBe('1.0.0');
    });
  });
});
