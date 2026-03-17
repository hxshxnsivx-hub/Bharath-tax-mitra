/**
 * Web Crypto API utilities for client-side encryption
 * Uses AES-GCM-256 with device-specific keys
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

/**
 * Get or generate device-specific salt
 */
async function getDeviceSalt(): Promise<Uint8Array> {
  const saltKey = 'device-salt';
  let saltHex = localStorage.getItem(saltKey);
  
  if (!saltHex) {
    // Generate new salt
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    saltHex = Array.from(salt)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem(saltKey, saltHex);
    return salt;
  }
  
  // Convert hex string back to Uint8Array
  const matches = saltHex.match(/.{1,2}/g);
  if (!matches) {
    throw new Error('Invalid salt format');
  }
  const salt = new Uint8Array(matches.map(byte => parseInt(byte, 16)));
  return salt;
}

/**
 * Get device ID (fingerprint)
 */
function getDeviceId(): string {
  let deviceId = localStorage.getItem('device-id');
  
  if (!deviceId) {
    // Generate device ID from browser fingerprint
    deviceId = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset(),
      screen.width,
      screen.height,
      screen.colorDepth,
    ].join('|');
    
    localStorage.setItem('device-id', deviceId);
  }
  
  return deviceId;
}

/**
 * Derive encryption key from device ID and salt using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive AES-GCM key using PBKDF2 with 100k iterations
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
  
  return key;
}

/**
 * Generate a random Initialization Vector (IV)
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Encrypt data using AES-GCM-256
 */
export async function encryptData(plaintext: string): Promise<string> {
  try {
    const deviceId = getDeviceId();
    const salt = await getDeviceSalt();
    const key = await deriveKey(deviceId, salt);
    
    const encoder = new TextEncoder();
    const plaintextBuffer = encoder.encode(plaintext);
    
    const iv = generateIV();
    
    // Encrypt using AES-GCM
    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv.buffer as ArrayBuffer,
      },
      key,
      plaintextBuffer
    );
    
    // Combine IV + ciphertext for storage
    const combined = new Uint8Array(iv.length + ciphertextBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertextBuffer), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-GCM-256
 */
export async function decryptData(encryptedData: string): Promise<string> {
  try {
    const deviceId = getDeviceId();
    const salt = await getDeviceSalt();
    const key = await deriveKey(deviceId, salt);
    
    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);
    
    // Decrypt using AES-GCM
    const plaintextBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv.buffer as ArrayBuffer,
      },
      key,
      ciphertext.buffer as ArrayBuffer
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(plaintextBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Clear device-specific encryption keys (for logout/data deletion)
 */
export function clearEncryptionKeys(): void {
  localStorage.removeItem('device-salt');
  localStorage.removeItem('device-id');
}
