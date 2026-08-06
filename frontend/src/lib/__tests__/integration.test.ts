import { describe, it, expect, beforeEach } from 'vitest';
import { encryptData, decryptData, clearEncryptionKeys } from '../crypto';

describe('Encryption Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    clearEncryptionKeys();
  });

  it('should encrypt and decrypt authentication tokens', async () => {
    const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    
    const encrypted = await encryptData(authToken);
    expect(encrypted).not.toBe(authToken);
    
    const decrypted = await decryptData(encrypted);
    expect(decrypted).toBe(authToken);
  });

  it('should encrypt and decrypt mobile numbers', async () => {
    const mobileNumber = '+919876543210';
    
    const encrypted = await encryptData(mobileNumber);
    expect(encrypted).not.toBe(mobileNumber);
    expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 format
    
    const decrypted = await decryptData(encrypted);
    expect(decrypted).toBe(mobileNumber);
  });

  it('should encrypt and decrypt PII data', async () => {
    const piiData = JSON.stringify({
      name: 'John Doe',
      pan: 'ABCDE1234F',
      aadhaar: '1234-5678-9012',
      address: '123 Main St, Mumbai, Maharashtra 400001',
    });
    
    const encrypted = await encryptData(piiData);
    expect(encrypted).not.toContain('John Doe');
    expect(encrypted).not.toContain('ABCDE1234F');
    
    const decrypted = await decryptData(encrypted);
    const decryptedData = JSON.parse(decrypted);
    expect(decryptedData.name).toBe('John Doe');
    expect(decryptedData.pan).toBe('ABCDE1234F');
  });

  it('should use PBKDF2 with 100k iterations (performance test)', async () => {
    const data = 'test data';
    
    const startTime = performance.now();
    await encryptData(data);
    const encryptTime = performance.now() - startTime;
    
    // PBKDF2 with 100k iterations should take some time (but not too long)
    // Typically 50-200ms depending on hardware
    expect(encryptTime).toBeGreaterThan(10); // At least 10ms
    expect(encryptTime).toBeLessThan(1000); // Less than 1 second
  });

  it('should produce different ciphertext each time due to random IV', async () => {
    const data = 'sensitive information';
    
    const encrypted1 = await encryptData(data);
    const encrypted2 = await encryptData(data);
    const encrypted3 = await encryptData(data);
    
    // All should be different due to random IV
    expect(encrypted1).not.toBe(encrypted2);
    expect(encrypted2).not.toBe(encrypted3);
    expect(encrypted1).not.toBe(encrypted3);
    
    // But all should decrypt to the same value
    expect(await decryptData(encrypted1)).toBe(data);
    expect(await decryptData(encrypted2)).toBe(data);
    expect(await decryptData(encrypted3)).toBe(data);
  });

  it('should handle encryption of large profile data', async () => {
    const largeProfile = JSON.stringify({
      userId: 'user-' + '1'.repeat(100),
      mobileNumber: '+919876543210',
      authToken: 'token-' + 'a'.repeat(500),
      refreshToken: 'refresh-' + 'b'.repeat(500),
      sessionData: {
        extractedData: Array(50).fill({ field: 'value', confidence: 0.95 }),
        userEdits: Array(50).fill({ field: 'edited', timestamp: Date.now() }),
      },
    });
    
    const encrypted = await encryptData(largeProfile);
    const decrypted = await decryptData(encrypted);
    
    expect(JSON.parse(decrypted)).toEqual(JSON.parse(largeProfile));
  });
});
