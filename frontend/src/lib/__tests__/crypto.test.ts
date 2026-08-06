import { describe, it, expect, beforeEach } from 'vitest';
import { encryptData, decryptData, clearEncryptionKeys } from '../crypto';

describe('Web Crypto API Encryption', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    clearEncryptionKeys();
  });

  it('should encrypt and decrypt data correctly', async () => {
    const plaintext = 'sensitive data';
    
    const encrypted = await encryptData(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.length).toBeGreaterThan(0);
    
    const decrypted = await decryptData(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertext for same plaintext (due to random IV)', async () => {
    const plaintext = 'test data';
    
    const encrypted1 = await encryptData(plaintext);
    const encrypted2 = await encryptData(plaintext);
    
    // Different IVs should produce different ciphertext
    expect(encrypted1).not.toBe(encrypted2);
    
    // But both should decrypt to same plaintext
    expect(await decryptData(encrypted1)).toBe(plaintext);
    expect(await decryptData(encrypted2)).toBe(plaintext);
  });

  it('should handle empty strings', async () => {
    const plaintext = '';
    
    const encrypted = await encryptData(plaintext);
    const decrypted = await decryptData(encrypted);
    
    expect(decrypted).toBe(plaintext);
  });

  it('should handle special characters and unicode', async () => {
    const plaintext = 'Hello 世界! 🔐 Special chars: @#$%^&*()';
    
    const encrypted = await encryptData(plaintext);
    const decrypted = await decryptData(encrypted);
    
    expect(decrypted).toBe(plaintext);
  });

  it('should handle long strings', async () => {
    const plaintext = 'a'.repeat(10000);
    
    const encrypted = await encryptData(plaintext);
    const decrypted = await decryptData(encrypted);
    
    expect(decrypted).toBe(plaintext);
  });

  it('should use device-specific keys (same device produces consistent results)', async () => {
    const plaintext = 'test data';
    
    // First encryption
    const encrypted1 = await encryptData(plaintext);
    const decrypted1 = await decryptData(encrypted1);
    expect(decrypted1).toBe(plaintext);
    
    // Second encryption (same device, should still work)
    const encrypted2 = await encryptData(plaintext);
    const decrypted2 = await decryptData(encrypted2);
    expect(decrypted2).toBe(plaintext);
  });

  it('should fail to decrypt with wrong device keys', async () => {
    const plaintext = 'sensitive data';
    
    // Encrypt with first device
    const encrypted = await encryptData(plaintext);
    
    // Simulate different device by clearing keys
    clearEncryptionKeys();
    
    // Should fail to decrypt (or produce garbage)
    await expect(decryptData(encrypted)).rejects.toThrow();
  });

  it('should handle JSON data', async () => {
    const data = {
      userId: 'user-123',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      mobileNumber: '+919876543210',
    };
    const plaintext = JSON.stringify(data);
    
    const encrypted = await encryptData(plaintext);
    const decrypted = await decryptData(encrypted);
    
    expect(JSON.parse(decrypted)).toEqual(data);
  });

  it('should produce different ciphertext for same plaintext encrypted by different userIds', async () => {
    const plaintext = 'sensitive data';

    const encryptedUser1 = await encryptData(plaintext, 'user1');
    const encryptedUser2 = await encryptData(plaintext, 'user2');

    // Different userId → different device fingerprint → different derived key → different ciphertext
    expect(encryptedUser1).not.toBe(encryptedUser2);

    // Each should decrypt correctly with the matching userId
    expect(await decryptData(encryptedUser1, 'user1')).toBe(plaintext);
    expect(await decryptData(encryptedUser2, 'user2')).toBe(plaintext);

    // Cross-decryption (wrong userId) should fail
    await expect(decryptData(encryptedUser1, 'user2')).rejects.toThrow();
  });
});
