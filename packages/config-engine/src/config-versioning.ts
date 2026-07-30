import fsp from 'fs/promises';
import _fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import type { ConfigSnapshot, DiffResult, ConfigDiff, FullConfig, ConfigValue } from './types';

const log = createLogger('config-versioning');

const HISTORY_DIR = path.join('.ai', 'config-history');
const INDEX_FILE = 'index.json';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): Record<string, ConfigValue> {
  const result: Record<string, ConfigValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value as ConfigValue;
    }
  }
  return result;
}

function computeDiff(from: Record<string, unknown>, to: Record<string, unknown>): ConfigDiff[] {
  const flatFrom = flattenKeys(from);
  const flatTo = flattenKeys(to);
  const changes: ConfigDiff[] = [];
  const allKeys = new Set([...Object.keys(flatFrom), ...Object.keys(flatTo)]);
  for (const key of allKeys) {
    const oldVal = flatFrom[key];
    const newVal = flatTo[key];
    if (oldVal === undefined && newVal !== undefined) {
      changes.push({ path: key, oldValue: undefined, newValue: newVal, operation: 'added' });
    } else if (oldVal !== undefined && newVal === undefined) {
      changes.push({ path: key, oldValue: oldVal, newValue: undefined, operation: 'removed' });
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ path: key, oldValue: oldVal, newValue: newVal, operation: 'modified' });
    }
  }
  return changes;
}

interface SnapshotIndex {
  snapshots: ConfigSnapshot[];
}

function getIndexPath(): string {
  return path.join(HISTORY_DIR, INDEX_FILE);
}

async function readIndex(): Promise<SnapshotIndex> {
  try {
    const content = await fsp.readFile(getIndexPath(), 'utf-8');
    return JSON.parse(content) as SnapshotIndex;
  } catch {
    return { snapshots: [] };
  }
}

async function writeIndex(index: SnapshotIndex): Promise<void> {
  await fsp.mkdir(HISTORY_DIR, { recursive: true });
  await fsp.writeFile(getIndexPath(), JSON.stringify(index, null, 2), 'utf-8');
}

export class ConfigVersioning {
  private snapshots: ConfigSnapshot[] = [];

  constructor(private configProvider: () => Record<string, unknown>) {}

  async initialize(): Promise<void> {
    const index = await readIndex();
    this.snapshots = index.snapshots;
  }

  async save(name: string): Promise<string> {
    const config = this.configProvider();
    const id = randomUUID();
    const snapshot: ConfigSnapshot = {
      id,
      name,
      timestamp: new Date().toISOString(),
      config: config as FullConfig,
    };
    const filePath = path.join(HISTORY_DIR, `${id}.json`);
    await fsp.mkdir(HISTORY_DIR, { recursive: true });
    await fsp.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    this.snapshots.push(snapshot);
    await writeIndex({ snapshots: this.snapshots });
    log.info(`Snapshot saved: ${name} (${id})`);
    return id;
  }

  list(): ConfigSnapshot[] {
    return [...this.snapshots].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  diff(v1: string, v2: string): DiffResult {
    const s1 = this.snapshots.find(s => s.id === v1);
    const s2 = this.snapshots.find(s => s.id === v2);
    if (!s1) throw new Error(`Snapshot not found: ${v1}`);
    if (!s2) throw new Error(`Snapshot not found: ${v2}`);
    const changes = computeDiff(s1.config as Record<string, unknown>, s2.config as Record<string, unknown>);
    return { from: v1, to: v2, changes };
  }

  async rollback(id: string): Promise<void> {
    const snapshot = this.snapshots.find(s => s.id === id);
    if (!snapshot) throw new Error(`Snapshot not found: ${id}`);
    const configPath = path.join('.ideia', 'config.json');
    await fsp.mkdir(path.dirname(configPath), { recursive: true });
    await fsp.writeFile(configPath, JSON.stringify(snapshot.config, null, 2), 'utf-8');
    log.info(`Rolled back to snapshot: ${snapshot.name} (${id})`);
  }

  history(): ConfigSnapshot[] {
    return [...this.snapshots].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async loadFromDisk(): Promise<ConfigSnapshot[]> {
    const index = await readIndex();
    this.snapshots = index.snapshots;
    return [...this.snapshots];
  }

  getHistory(): ConfigSnapshot[] {
    return this.history();
  }

  getVersion(id: string): ConfigSnapshot | undefined {
    return this.snapshots.find(s => s.id === id);
  }

  describe(id: string): { date: string; size: number; changes: number; name: string } | null {
    const snapshot = this.snapshots.find(s => s.id === id);
    if (!snapshot) return null;
    const flatFrom = flattenKeys(snapshot.config as Record<string, unknown>);
    const prevIdx = this.snapshots.indexOf(snapshot) - 1;
    let changes = 0;
    if (prevIdx >= 0) {
      const prev = this.snapshots[prevIdx];
      changes = computeDiff(prev.config as Record<string, unknown>, snapshot.config as Record<string, unknown>).length;
    }
    return {
      date: snapshot.timestamp,
      size: JSON.stringify(snapshot.config).length,
      changes,
      name: snapshot.name,
    };
  }

  async prune(keep: number): Promise<void> {
    const sorted = [...this.snapshots].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const toRemove = sorted.slice(keep);
    for (const snap of toRemove) {
      const filePath = path.join(HISTORY_DIR, `${snap.id}.json`);
      try { await fsp.unlink(filePath); } catch { /* ignore */ }
      this.snapshots = this.snapshots.filter(s => s.id !== snap.id);
    }
    await writeIndex({ snapshots: this.snapshots });
    log.info(`Pruned ${toRemove.length} snapshots, keeping ${keep}`);
  }

  compare(id1: string, id2: string): string {
    const diff = this.diff(id1, id2);
    if (diff.changes.length === 0) return 'No differences';
    return diff.changes.map(c => {
      const op = c.operation === 'added' ? '+' : c.operation === 'removed' ? '-' : '~';
      return `${op} ${c.path}: ${JSON.stringify(c.oldValue)} → ${JSON.stringify(c.newValue)}`;
    }).join('\n');
  }
}
