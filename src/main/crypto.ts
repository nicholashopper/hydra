import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

function getEncryptionKey(): Buffer {
  const keyHex = process.env.HYDRA_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    // Generate a random key if not provided (for development)
    console.warn('HYDRA_ENCRYPTION_KEY not set, using random key (data will be lost on restart)');
    return crypto.randomBytes(KEY_LENGTH);
  }
  return Buffer.from(keyHex, 'hex');
}

function deriveKey(password: Buffer, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

export function encrypt(plaintext: string): string {
  const masterKey = getEncryptionKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  // Format: salt (32) + iv (16) + authTag (16) + encrypted data
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString('base64');
}

export function decrypt(ciphertext: string): string {
  const masterKey = getEncryptionKey();
  const combined = Buffer.from(ciphertext, 'base64');

  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = deriveKey(masterKey, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

export function encryptForExport(plaintext: string, exportKey: string): string {
  const key = crypto.scryptSync(exportKey, 'hydra-export', KEY_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

export function decryptForImport(ciphertext: string, exportKey: string): string {
  const key = crypto.scryptSync(exportKey, 'hydra-export', KEY_LENGTH);
  const combined = Buffer.from(ciphertext, 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

export function generateProfileId(): string {
  return crypto.randomUUID();
}

export function generateFingerPrintSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}
