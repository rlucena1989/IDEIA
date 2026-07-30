import { createLogger } from '@ideia/logger';
import {  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
  type CipherGCM,
  type DecipherGCM,
} from 'crypto';
import type {
  EncryptionAlgorithm,
  EncryptedData,
  KeyInfo,
} from './types';
const logger = createLogger('encryption-manager');

interface KeyMaterial {
  key: Buffer;
  info: KeyInfo;
}

const ALGORITHM_CONFIG: Record<EncryptionAlgorithm, { ivLength: number; tagLength: number }> = {
  'aes-256-gcm': { ivLength: 16, tagLength: 16 },
  'chacha20-poly1305': { ivLength: 12, tagLength: 16 },
};

const DEFAULT_ALGORITHM: EncryptionAlgorithm = 'aes-256-gcm';
const KEY_ROTATION_DAYS = 90;
const GRACE_PERIOD_DAYS = 7;

export class EncryptionManager {
  private keys: Map<string, KeyMaterial> = new Map();
  private activeKeyId: string | null = null;

  generateKey(algorithm: EncryptionAlgorithm = DEFAULT_ALGORITHM): KeyInfo {
    const id = this.generateKeyId();
    const key = algorithm === 'aes-256-gcm'
      ? randomBytes(32)
      : randomBytes(32);

    const now = new Date();
    const rotationDue = new Date(now.getTime() + KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000);

    const info: KeyInfo = {
      id,
      algorithm,
      createdAt: now,
      rotationDue,
    };

    this.keys.set(id, { key, info });

    if (!this.activeKeyId) {
      this.activeKeyId = id;
    }

    return info;
  }

  encrypt(
    plaintext: string,
    keyId?: string
  ): EncryptedData {
    const targetKeyId = keyId ?? this.activeKeyId;
    const keyMaterial = this.keys.get(targetKeyId ?? '');
    if (!keyMaterial) {
      throw new Error(`Key not found: ${targetKeyId}`);
    }

    const { key, info } = keyMaterial;
    const config = ALGORITHM_CONFIG[info.algorithm];
    const iv = randomBytes(config.ivLength);

    const cipher = createCipheriv(info.algorithm, key, iv) as CipherGCM;

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      ciphertext: encrypted.toString('hex'),
      tag: tag.toString('hex'),
      algorithm: info.algorithm,
      keyId: info.id,
    };
  }

  decrypt(encryptedData: EncryptedData): string {
    const keyMaterial = this.keys.get(encryptedData.keyId);
    if (!keyMaterial) {
      throw new Error(`Key not found: ${encryptedData.keyId}`);
    }

    const { key } = keyMaterial;
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const ciphertext = Buffer.from(encryptedData.ciphertext, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');

    const decipher = createDecipheriv(encryptedData.algorithm, key, iv) as DecipherGCM;
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  rotateKey(algorithm: EncryptionAlgorithm = DEFAULT_ALGORITHM): KeyInfo {
    const newKey = this.generateKey(algorithm);
    this.activeKeyId = newKey.id;

    const now = new Date();
    for (const [id, km] of this.keys) {
      if (id !== newKey.id) {
        const graceEnd = new Date(km.info.createdAt.getTime() + (KEY_ROTATION_DAYS + GRACE_PERIOD_DAYS) * 24 * 60 * 60 * 1000);
        if (now > graceEnd) {
          this.keys.delete(id);
        }
      }
    }

    return newKey;
  }

  listKeys(): KeyInfo[] {
    return Array.from(this.keys.values()).map(km => km.info);
  }

  getActiveKeyId(): string | null {
    return this.activeKeyId;
  }

  private generateKeyId(): string {
    const raw = randomBytes(16).toString('hex');
    return `key-${createHash('sha256').update(raw).digest('hex').substring(0, 16)}`;
  }
}
