/**
 * crypto-utils.ts — Utility functions for encryption operations
 *
 * Provides: AES-256-GCM encryption/decryption for data at rest,
 * TLS configuration generator, key generation helpers.
 */

import crypto from 'crypto';
import { createLogger } from '@ideia/logger';
import path from 'path';
const logger = createLogger('crypto-utils');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const _TAG_LENGTH = 16;
const SALT_LENGTH = 32;

export interface EncryptedData {
  encrypted: string;       // base64 ciphertext
  iv: string;              // base64 initialization vector
  tag: string;             // base64 auth tag
  salt?: string;           // base64 salt (if key derivation used)
}

/**
 * Derive a 256-bit key from a passphrase using PBKDF2
 */
export function deriveKey(passphrase: string, salt?: Buffer): { key: Buffer; salt: string } {
  const useSalt = salt || crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(passphrase, useSalt, 100000, KEY_LENGTH, 'sha512');
  return { key, salt: useSalt.toString('base64') };
}

/**
 * Encrypt data with AES-256-GCM
 */
export function encrypt(plaintext: string, keyOrPassphrase: string | Buffer): EncryptedData {
  let key: Buffer;
  let salt: string | undefined;
  if (typeof keyOrPassphrase === 'string') {
    const derived = deriveKey(keyOrPassphrase);
    key = derived.key;
    salt = derived.salt;
  } else {
    key = keyOrPassphrase;
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const result: EncryptedData = {
    encrypted,
    iv: iv.toString('base64'),
    tag: (cipher.getAuthTag() as Buffer).toString('base64'),
  };

  if (salt) {
    result.salt = salt;
  }

  return result;
}

/**
 * Decrypt data with AES-256-GCM
 */
export function decrypt(data: EncryptedData, keyOrPassphrase: string | Buffer): string {
  const key = typeof keyOrPassphrase === 'string'
    ? deriveKey(keyOrPassphrase, Buffer.from(data.salt ?? '', 'base64')).key
    : keyOrPassphrase;
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(data.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(data.tag, 'base64'));
  let decrypted = decipher.update(data.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generate a random encryption key (hex-encoded)
 */
export function generateKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Generate TLS 1.3 config for HTTPS server
 * @param certPath Path to certificate file (optional — uses self-signed if omitted)
 */
export function createTlsOptions(certPath?: string): object {
  if (certPath) {
    const fs = require('fs');
    const pk = fs.readFileSync(path.join(certPath, 'key.pem'));
    const cert = fs.readFileSync(path.join(certPath, 'cert.pem'));
    return {
      key: pk,
      cert,
      secureOptions: crypto.constants.SSL_OP_NO_TLSv1 | crypto.constants.SSL_OP_NO_TLSv1_1,
      ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256',
      honorCipherOrder: true,
      minVersion: 'TLSv1.3',
    };
  }

  // Development-only: self-signed TLS config
  return {
    secureOptions: crypto.constants.SSL_OP_NO_TLSv1 | crypto.constants.SSL_OP_NO_TLSv1_1,
    ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256',
    minVersion: 'TLSv1.3',
  };
}

/**
 * Load TLS options from certs/ directory, returning null if certs don't exist.
 * Enables auto-detection: HTTPS when certs present, HTTP fallback otherwise.
 */
export function loadTlsOptions(certDir?: string): object | null {
  const dir = certDir || path.join(process.cwd(), 'certs');
  const fs = require('fs');
  try {
    const keyPath = path.join(dir, 'key.pem');
    const certPath = path.join(dir, 'cert.pem');
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      return createTlsOptions(dir);
    }
  } catch {
    // certs not available — HTTP fallback
  }
  return null;
}
