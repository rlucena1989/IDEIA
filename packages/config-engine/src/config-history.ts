export interface ConfigVersion {
  id: number;
  timestamp: string;
  config: Record<string, unknown>;
  label?: string;
  checksum: string;
}

import { createLogger } from '@ideia/logger';
import * as fs from 'fs';
import * as path from 'path';

const log = createLogger('config-history');

const MAX_VERSIONS = 50;

export interface ConfigVersion {
  id: number;
  timestamp: string;
  config: Record<string, unknown>;
  label?: string;
  checksum: string;
}

export class ConfigHistory {
  private versions: ConfigVersion[] = [];
  private historyDir: string;

  constructor(historyDir?: string) {
    this.historyDir = historyDir ?? path.join(process.cwd(), '.ai', 'config-history');
    this.load();
  }

  snapshot(config: Record<string, unknown>, label?: string): ConfigVersion {
    const version: ConfigVersion = {
      id: this.nextId(),
      timestamp: new Date().toISOString(),
      config: { ...config },
      label,
      checksum: this.checksum(config),
    };
    this.versions.push(version);
    if (this.versions.length > MAX_VERSIONS) this.versions.shift();
    this.persist(version);
    log.info(`Config snapshot #${version.id} saved${label ? `: ${label}` : ''}`);
    return version;
  }

  get(id: number): ConfigVersion | undefined {
    return this.versions.find(v => v.id === id);
  }

  getLatest(): ConfigVersion | undefined {
    return this.versions[this.versions.length - 1];
  }

  getAll(): ConfigVersion[] {
    return [...this.versions];
  }

  diff(idA: number, idB: number): Array<{ key: string; from: unknown; to: unknown }> {
    const vA = this.get(idA);
    const vB = this.get(idB);
    if (!vA || !vB) return [];
    const changes: Array<{ key: string; from: unknown; to: unknown }> = [];
    const allKeys = new Set([...Object.keys(vA.config), ...Object.keys(vB.config)]);
    for (const key of allKeys) {
      const valA = JSON.stringify(vA.config[key]);
      const valB = JSON.stringify(vB.config[key]);
      if (valA !== valB) changes.push({ key, from: vA.config[key], to: vB.config[key] });
    }
    return changes;
  }

  rollback(id: number): Record<string, unknown> | null {
    const version = this.get(id);
    if (!version) { log.warn(`Version #${id} not found for rollback`); return null; }
    log.info(`Rolled back to config version #${id}`);
    return { ...version.config };
  }

  search(query: string): ConfigVersion[] {
    const q = query.toLowerCase();
    return this.versions.filter(v =>
      v.label?.toLowerCase().includes(q) ||
      v.checksum.toLowerCase().includes(q) ||
      JSON.stringify(v.config).toLowerCase().includes(q)
    );
  }

  getLatestVersion(): ConfigVersion | null {
    return this.versions[this.versions.length - 1] ?? null;
  }

  getVersionCount(): number {
    return this.versions.length;
  }

  private nextId(): number {
    return this.versions.length > 0 ? Math.max(...this.versions.map(v => v.id)) + 1 : 1;
  }

  private checksum(config: Record<string, unknown>): string {
    const { createHash } = require('crypto');
    return createHash('sha256').update(JSON.stringify(config)).digest('hex').slice(0, 12);
  }

  private load(): void {
    try {
      if (!fs.existsSync(this.historyDir)) return;
      for (const file of fs.readdirSync(this.historyDir).sort()) {
        if (file.endsWith('.json')) {
          const data = JSON.parse(fs.readFileSync(path.join(this.historyDir, file), 'utf-8'));
          this.versions.push(data);
        }
      }
    } catch (_err) {
      log.warn('Failed to load config history', { error: String(_err) });
    }
  }

  private persist(version: ConfigVersion): void {
    try {
      if (!fs.existsSync(this.historyDir)) fs.mkdirSync(this.historyDir, { recursive: true });
      fs.writeFileSync(path.join(this.historyDir, `config-v${String(version.id).padStart(4, '0')}.json`), JSON.stringify(version, null, 2), 'utf-8');
    } catch (_err) {
      log.error('Failed to persist config version', { error: String(_err) });
    }
  }
}

export function createConfigHistory(historyDir?: string): ConfigHistory {
  return new ConfigHistory(historyDir);
}
