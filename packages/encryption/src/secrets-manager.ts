import { randomBytes, createHash } from 'crypto';
import { createLogger } from '@ideia/logger';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
const logger = createLogger('secrets-manager');

export interface SecretProvider {
  get(name: string): Promise<string | null>;
  set(name: string, value: string): Promise<void>;
}

export interface RotationResult {
  secretName: string;
  oldValue: string;
  newValue: string;
  timestamp: number;
  status: 'success' | 'failed';
  error?: string;
}

export interface RotationRecord {
  secretName: string;
  timestamp: number;
  status: string;
  duration: number;
}

export interface RotationAudit {
  secretName: string;
  action: string;
  actor: string;
  timestamp: number;
  hash: string;
}

export class EnvSecretProvider implements SecretProvider {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? join(process.cwd(), '.env');
  }

  async get(name: string): Promise<string | null> {
    if (!existsSync(this.filePath)) return null;
    const content = readFileSync(this.filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const eqIdx = trimmed.indexOf('=');
      const key = trimmed.substring(0, eqIdx).trim();
      if (key === name) {
        return trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      }
    }
    return null;
  }

  async set(name: string, value: string): Promise<void> {
    let content = '';
    let found = false;
    if (existsSync(this.filePath)) {
      content = readFileSync(this.filePath, 'utf-8');
      const lines = content.split('\n');
      const newLines: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed.includes('=')) {
          newLines.push(line);
        } else {
          const eqIdx = trimmed.indexOf('=');
          const key = trimmed.substring(0, eqIdx).trim();
          if (key === name) {
            newLines.push(`${name}=${value}`);
            found = true;
          } else {
            newLines.push(line);
          }
        }
      }
      content = newLines.join('\n');
    }
    if (!found) {
      content += (content ? '\n' : '') + `${name}=${value}`;
    }
    writeFileSync(this.filePath, content, 'utf-8');
  }
}

export class MemorySecretProvider implements SecretProvider {
  private store = new Map<string, string>();

  async get(name: string): Promise<string | null> {
    return this.store.get(name) ?? null;
  }

  async set(name: string, value: string): Promise<void> {
    this.store.set(name, value);
  }
}

interface SecretEntry {
  value: string;
  ttl?: number;
  createdAt: number;
}

export class SecretsManager {
  private providers: Map<string, SecretProvider> = new Map();
  private secrets: Map<string, SecretEntry> = new Map();
  private rotationHistory: Map<string, RotationRecord[]> = new Map();
  private auditEntries: RotationAudit[] = [];
  private schedules: Map<string, string> = new Map();
  private lastAuditHash = '';

  registerProvider(name: string, provider: SecretProvider): void {
    this.providers.set(name, provider);
  }

  async getSecret(name: string): Promise<string | null> {
    const secret = this.secrets.get(name);
    if (secret) {
      if (secret.ttl && Date.now() > secret.createdAt + secret.ttl) {
        this.secrets.delete(name);
        return null;
      }
      return secret.value;
    }
    for (const [, provider] of this.providers) {
      const value = await provider.get(name);
      if (value !== null) return value;
    }
    return null;
  }

  async setSecret(name: string, value: string, ttl?: number): Promise<void> {
    this.secrets.set(name, { value, ttl, createdAt: Date.now() });
    for (const [, provider] of this.providers) {
      await provider.set(name, value);
    }
    this.addAuditEntry(name, 'set', 'system');
  }

  async rotateSecret(name: string): Promise<RotationResult> {
    const startTime = Date.now();
    try {
      const oldValue = await this.getSecret(name) ?? '';
      const newValue = randomBytes(32).toString('hex');
      await this.setSecret(name, newValue);
      const result: RotationResult = {
        secretName: name,
        oldValue,
        newValue,
        timestamp: Date.now(),
        status: 'success',
      };
      this.addRotationRecord(name, 'success', Date.now() - startTime);
      this.addAuditEntry(name, 'rotate', 'system');
      return result;
    } catch (error) {
      this.addRotationRecord(name, 'failed', Date.now() - startTime);
      this.addAuditEntry(name, 'rotate', 'system');
      return {
        secretName: name,
        oldValue: '',
        newValue: '',
        timestamp: Date.now(),
        status: 'failed',
        error: String(error),
      };
    }
  }

  scheduleRotation(name: string, cron: string): void {
    this.schedules.set(name, cron);
  }

  getRotationHistory(name: string): RotationRecord[] {
    return this.rotationHistory.get(name) ?? [];
  }

  auditLog(): RotationAudit[] {
    return [...this.auditEntries];
  }

  getProviders(): Map<string, SecretProvider> {
    return new Map(this.providers);
  }

  getSchedules(): Map<string, string> {
    return new Map(this.schedules);
  }

  private addRotationRecord(secretName: string, status: string, duration: number): void {
    const history = this.rotationHistory.get(secretName) ?? [];
    history.push({ secretName, timestamp: Date.now(), status, duration });
    this.rotationHistory.set(secretName, history);
  }

  private addAuditEntry(secretName: string, action: string, actor: string): void {
    const hashInput = this.lastAuditHash + `${action}:${secretName}:${actor}:${Date.now()}`;
    const hash = createHash('sha256').update(hashInput).digest('hex');
    this.lastAuditHash = hash;
    this.auditEntries.push({
      secretName, action, actor, timestamp: Date.now(), hash,
    });
  }
}
