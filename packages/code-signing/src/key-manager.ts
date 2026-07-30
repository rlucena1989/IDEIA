import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
const logger = createLogger('key-manager');

export interface KeyEntry {
  name: string;
  type: 'windows-ev' | 'windows-standard' | 'apple-dev-id' | 'apple-dev' | 'gpg' | 'cosign';
  provider: 'azure-kv' | 'yubikey' | 'local' | 'apple-hsm' | 'software';
  expiresAt: string;
  issuedAt: string;
  serialNumber: string;
  backupLocation: string;
  sha256Thumbprint: string;
  hardwareTokenId?: string;
  notes?: string;
}

export interface KeyRotationEvent {
  date: string;
  oldKey: string;
  newKey: string;
  reason: 'expiry' | 'compromise' | 'reissue' | 'upgrade';
  artifactsReSigned: string[];
  verifiedBy: string;
}

export class KeyManager {
  private keys: KeyEntry[] = [];
  private rotationLog: KeyRotationEvent[] = [];
  private keysPath: string;
  private rotationPath: string;

  constructor(basePath: string) {
    this.keysPath = path.join(basePath, 'key-registry.json');
    this.rotationPath = path.join(basePath, 'rotation-log.json');
    this.load();
    this.loadRotationLog();
  }

  private load(): void {
    if (fs.existsSync(this.keysPath)) {
      this.keys = JSON.parse(fs.readFileSync(this.keysPath, 'utf-8'));
    }
  }

  private loadRotationLog(): void {
    if (fs.existsSync(this.rotationPath)) {
      this.rotationLog = JSON.parse(fs.readFileSync(this.rotationPath, 'utf-8'));
    }
  }

  private save(): void {
    fs.writeFileSync(this.keysPath, JSON.stringify(this.keys, null, 2));
  }

  private saveRotationLog(): void {
    fs.writeFileSync(this.rotationPath, JSON.stringify(this.rotationLog, null, 2));
  }

  addKey(entry: KeyEntry): void {
    this.keys.push(entry);
    this.save();
  }

  removeKey(name: string): void {
    this.keys = this.keys.filter(k => k.name !== name);
    this.save();
  }

  getKey(name: string): KeyEntry | undefined {
    return this.keys.find(k => k.name === name);
  }

  getExpiringKeys(daysThreshold: number = 30): KeyEntry[] {
    const now = Date.now();
    return this.keys.filter(k => {
      const exp = new Date(k.expiresAt).getTime();
      const daysLeft = (exp - now) / 86400000;
      return daysLeft <= daysThreshold && daysLeft > 0;
    });
  }

  getExpiredKeys(): KeyEntry[] {
    const now = Date.now();
    return this.keys.filter(k => new Date(k.expiresAt).getTime() <= now);
  }

  rotateKey(oldName: string, newEntry: KeyEntry, reason: KeyRotationEvent['reason']): void {
    const oldKey = this.getKey(oldName);
    if (!oldKey) throw new Error(`Key not found: ${oldName}`);
    this.removeKey(oldName);
    this.addKey(newEntry);
    this.rotationLog.push({
      date: new Date().toISOString(),
      oldKey: oldName,
      newKey: newEntry.name,
      reason,
      artifactsReSigned: [],
      verifiedBy: process.env.USER || 'unknown',
    });
    this.saveRotationLog();
  }

  generateKeyHealthReport(): string {
    const now = Date.now();
    const lines: string[] = [
      '# Key Health Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '| Key | Type | Provider | Expires | Days Left | Status |',
      '|-----|------|----------|---------|-----------|--------|',
    ];
    for (const key of this.keys) {
      const exp = new Date(key.expiresAt).getTime();
      const daysLeft = Math.floor((exp - now) / 86400000);
      const status = daysLeft < 0 ? 'EXPIRED' : daysLeft < 30 ? 'EXPIRING' : daysLeft < 90 ? 'WARN' : 'OK';
      lines.push(`| ${key.name} | ${key.type} | ${key.provider} | ${key.expiresAt} | ${daysLeft}d | ${status} |`);
    }
    lines.push('', '## Rotation History', '');
    for (const event of this.rotationLog) {
      lines.push(`- ${event.date}: ${event.oldKey} -> ${event.newKey} (${event.reason})`);
    }
    return lines.join('\n');
  }

  exportReport(format: 'markdown' | 'json' = 'markdown'): string {
    if (format === 'json') {
      return JSON.stringify({ keys: this.keys, rotationLog: this.rotationLog }, null, 2);
    }
    return this.generateKeyHealthReport();
  }
}
