import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '$env/dynamic/private';

/**
 * AES-256-GCM encryption for user data stored in D1.
 * Requires DATA_ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 * Falls back to plaintext with "plain:" prefix if key is not set.
 */

export function encryptText(plain: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}.${authTag.toString('hex')}.${ciphertext.toString('hex')}`;
}

export function decryptText(encrypted: string, keyHex: string): string {
  const parts = encrypted.split('.');
  if (parts.length !== 3) throw new Error('Invalid ciphertext format');
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/** Encrypt a username for storage. Falls back to "plain:<value>" if key is not configured. */
export function encryptUsername(username: string): string {
  const keyHex = env.DATA_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) return `plain:${username}`;
  return encryptText(username, keyHex);
}

/** Decrypt a stored username. Handles plaintext fallback ("plain:" prefix). */
export function decryptUsername(stored: string): string {
  if (stored.startsWith('plain:')) return stored.slice(6);
  const keyHex = env.DATA_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) return stored;
  try {
    return decryptText(stored, keyHex);
  } catch {
    return stored;
  }
}
