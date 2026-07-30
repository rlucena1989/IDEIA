import * as crypto from 'crypto';
import { createLogger } from '@ideia/logger';
import * as fs from 'fs';
import * as path from 'path';
const logger = createLogger('secure-key-storage');

export class SecureKeyStorage {
  private keys = new Map<string, Uint8Array>();

  constructor(private keyDir: string) {
    fs.mkdirSync(keyDir, { recursive: true });
  }

  async storeSeed(keyName: string, seed: Uint8Array): Promise<void> {
    const encrypted = this.encrypt(seed);
    const filePath = path.join(this.keyDir, `${keyName}.nkey`);
    await fs.promises.writeFile(filePath, encrypted, { mode: 0o600 });
    this.keys.set(keyName, seed);
  }

  async loadSeed(keyName: string): Promise<Uint8Array | null> {
    const existing = this.keys.get(keyName);
    if (existing) return existing;
    const filePath = path.join(this.keyDir, `${keyName}.nkey`);
    try {
      const encrypted = await fs.promises.readFile(filePath);
      const decrypted = this.decrypt(encrypted);
      this.keys.set(keyName, decrypted);
      return decrypted;
    } catch {
      return null;
    }
  }

  hasKey(keyName: string): boolean {
    return this.keys.has(keyName);
  }

  deleteKey(keyName: string): void {
    this.keys.delete(keyName);
    const filePath = path.join(this.keyDir, `${keyName}.nkey`);
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }

  private encrypt(data: Uint8Array): Buffer {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from(data)), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]);
  }

  private decrypt(data: Buffer): Uint8Array {
    const key = this.getEncryptionKey();
    const iv = data.subarray(0, 16);
    const tag = data.subarray(16, 32);
    const encrypted = data.subarray(32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  private getEncryptionKey(): Buffer {
    const keyPath = path.join(this.keyDir, '.master-key');
    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath);
    }
    const key = crypto.randomBytes(32);
    fs.writeFileSync(keyPath, key, { mode: 0o400 });
    return key;
  }
}
