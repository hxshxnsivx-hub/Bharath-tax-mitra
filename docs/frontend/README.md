# Offline Storage with Encryption

This directory contains the implementation of IndexedDB offline storage with Web Crypto API encryption for the Bharat Tax Mitra PWA.

## Overview

The implementation provides:
- **IndexedDB** for offline data storage
- **Web Crypto API** for client-side encryption
- **AES-GCM-256** encryption algorithm
- **PBKDF2** key derivation with 100,000 iterations
- **Device-specific encryption keys**

## Architecture

### Encryption (`crypto.ts`)

The encryption module implements the Web Crypto API with the following specifications:

- **Algorithm**: AES-GCM (Galois/Counter Mode)
- **Key Length**: 256 bits
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **IV Length**: 12 bytes (96 bits) - randomly generated for each encryption
- **Salt Length**: 16 bytes (128 bits) - device-specific, stored in localStorage

#### Key Features

1. **Device-Specific Keys**: Each device generates a unique salt and device fingerprint
2. **Random IV**: Each encryption operation uses a fresh random IV for semantic security
3. **Authenticated Encryption**: AES-GCM provides both confidentiality and authenticity
4. **Base64 Encoding**: Encrypted data is base64-encoded for storage compatibility

#### Functions

```typescript
// Encrypt plaintext data
async function encryptData(plaintext: string): Promise<string>

// Decrypt encrypted data
async function decryptData(encryptedData: string): Promise<string>

// Clear encryption keys (for logout/data deletion)
function clearEncryptionKeys(): void
```

### Database (`db.ts`)

The database module provides IndexedDB storage with automatic encryption for sensitive fields.

#### Schema

The database includes the following object stores:

1. **profiles**: User profiles with encrypted mobile numbers and tokens
2. **taxSessions**: Tax filing sessions with encrypted extracted data
3. **pendingRequests**: Offline request queue for sync
4. **savedDrafts**: Auto-saved form data
5. **taxRules**: Cached tax calculation rules
6. **languagePacks**: Offline translations
7. **faqCache**: Cached chat assistant responses

#### Encrypted Fields

The following fields are automatically encrypted before storage:

- `profiles.mobileNumber`
- `profiles.authToken`
- `profiles.refreshToken`

#### API

```typescript
// Save profile with automatic encryption
await db.saveProfile({
  userId: 'user-123',
  mobileNumber: '+919876543210', // Will be encrypted
  authToken: 'token',             // Will be encrypted
  refreshToken: 'refresh',        // Will be encrypted
  languageCode: 'en',
  preferredRegime: 'new',
  lastSyncTimestamp: Date.now(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Retrieve profile with automatic decryption
const profile = await db.getProfile('user-123');
console.log(profile.mobileNumber); // Decrypted value

// Delete profile
await db.deleteProfile('user-123');
```

## Security Considerations

### Threat Model

The encryption protects against:
- **Physical device access**: Encrypted data is unreadable without the device-specific key
- **Browser storage inspection**: Data in IndexedDB is encrypted
- **Cross-device attacks**: Keys are device-specific and not transferable

### Limitations

The encryption does NOT protect against:
- **Malware on the device**: Malicious code running in the browser can access decrypted data
- **Browser vulnerabilities**: Exploits in the browser engine could bypass encryption
- **User session hijacking**: Active sessions have access to decrypted data

### Best Practices

1. **Clear keys on logout**: Always call `clearEncryptionKeys()` when the user logs out
2. **Short-lived tokens**: Use short-lived authentication tokens (24-hour TTL)
3. **Secure transmission**: Always use HTTPS for API calls
4. **Regular key rotation**: Consider implementing periodic key rotation for long-lived sessions

## Compliance

This implementation supports the following compliance requirements:

- **Data Protection at Rest**: All PII is encrypted in IndexedDB
- **Device-Specific Keys**: Keys are derived from device fingerprint
- **PBKDF2 Iterations**: 100,000 iterations meet NIST recommendations
- **AES-GCM-256**: Industry-standard authenticated encryption

## Testing

Run the test suite:

```bash
npm test -- src/lib/__tests__/crypto.test.ts
npm test -- src/lib/__tests__/integration.test.ts
```

### Test Coverage

- ✅ Encryption/decryption correctness
- ✅ Random IV generation
- ✅ Device-specific keys
- ✅ Special characters and Unicode
- ✅ Large data handling
- ✅ Authentication token encryption
- ✅ Mobile number encryption
- ✅ PII data encryption
- ✅ Performance (PBKDF2 iterations)

## Performance

Typical performance on modern hardware:

- **Key Derivation**: 50-200ms (PBKDF2 with 100k iterations)
- **Encryption**: 1-5ms for typical data sizes
- **Decryption**: 1-5ms for typical data sizes

The key derivation is intentionally slow to resist brute-force attacks. The derived key is cached in memory during the session.

## Future Enhancements

Potential improvements for future versions:

1. **Key Rotation**: Implement periodic key rotation for long-lived sessions
2. **Biometric Authentication**: Use WebAuthn for additional security
3. **Secure Enclave**: Leverage hardware security modules when available
4. **Key Backup**: Implement secure key backup for multi-device support
5. **Audit Logging**: Log encryption/decryption operations for security audits

## References

- [Web Crypto API Specification](https://www.w3.org/TR/WebCryptoAPI/)
- [NIST SP 800-132: PBKDF2 Recommendations](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf)
- [AES-GCM Security](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
