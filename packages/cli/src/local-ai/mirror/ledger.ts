import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { MirrorEntry, MirrorQuery, MirrorConfig, DEFAULT_MIRROR_CONFIG } from './types';

const MIRROR_DIR = '.ai/mirror';
const LEDGER_FILE = 'ledger.jsonl';
const CONFIG_FILE = 'config.json';

function ensureDir(root: string): void {
  fs.mkdirSync(path.join(root, MIRROR_DIR), { recursive: true });
}

function ledgerPath(root: string): string {
  return path.join(root, MIRROR_DIR, LEDGER_FILE);
}

function configPath(root: string): string {
  return path.join(root, MIRROR_DIR, CONFIG_FILE);
}

/** loadMirrorConfig */
export function loadMirrorConfig(root: string): MirrorConfig {
  const cp = configPath(root);
  if (!fs.existsSync(cp)) return { ...DEFAULT_MIRROR_CONFIG };
  try {
    return { ...DEFAULT_MIRROR_CONFIG, ...JSON.parse(fs.readFileSync(cp, 'utf8')) };
  } catch {
    return { ...DEFAULT_MIRROR_CONFIG };
  }
}

/** saveMirrorConfig */
export function saveMirrorConfig(root: string, config: MirrorConfig): void {
  ensureDir(root);
  fs.writeFileSync(configPath(root), JSON.stringify(config, null, 2));
}

/** getLatestSeq */
export function getLatestSeq(root: string): number {
  const lp = ledgerPath(root);
  if (!fs.existsSync(lp)) return 0;
  const lines = fs.readFileSync(lp, 'utf8').trim().split('\n').filter(Boolean);
  if (lines.length === 0) return 0;
  try {
    const last = JSON.parse(lines[lines.length - 1]) as MirrorEntry;
    return last.seq;
  } catch {
    return 0;
  }
}

/** getLatestHash */
export function getLatestHash(root: string): string {
  const lp = ledgerPath(root);
  if (!fs.existsSync(lp)) return 'genesis';
  const lines = fs.readFileSync(lp, 'utf8').trim().split('\n').filter(Boolean);
  if (lines.length === 0) return 'genesis';
  try {
    const last = JSON.parse(lines[lines.length - 1]) as MirrorEntry;
    return last.thisHash;
  } catch {
    return 'genesis';
  }
}

/** appendEntry */
export function appendEntry(root: string, entry: Omit<MirrorEntry, 'seq' | 'prevHash' | 'thisHash'>): MirrorEntry {
  ensureDir(root);
  const seq = getLatestSeq(root) + 1;
  const prevHash = getLatestHash(root);
  const entryData = { ...entry, seq, prevHash, thisHash: '' };
  const hashData = JSON.stringify(entryData);
  entryData.thisHash = crypto.createHash('sha256').update(hashData + prevHash).digest('hex');
  const fullEntry = entryData as MirrorEntry;
  fs.appendFileSync(ledgerPath(root), JSON.stringify(fullEntry) + '\n');
  return fullEntry;
}

/** queryEntries */
export function queryEntries(root: string, query: MirrorQuery = {}): MirrorEntry[] {
  const lp = ledgerPath(root);
  if (!fs.existsSync(lp)) return [];
  const lines = fs.readFileSync(lp, 'utf8').trim().split('\n').filter(Boolean);
  let entries: MirrorEntry[] = lines.map(l => { try { return JSON.parse(l) as MirrorEntry; } catch { return null; } }).filter((e): e is MirrorEntry => e !== null);

  if (query.promptHash) entries = entries.filter(e => e.promptHash === query.promptHash);
  if (query.modelId) entries = entries.filter(e => e.modelId === query.modelId);
  if (query.provider) entries = entries.filter(e => e.provider === query.provider);
  if (query.command) entries = entries.filter(e => e.command === query.command);

  entries.reverse();
  const offset = query.offset || 0;
  const limit = query.limit || entries.length;
  return entries.slice(offset, offset + limit);
}

/** getEntryBySeq */
export function getEntryBySeq(root: string, seq: number): MirrorEntry | null {
  const lp = ledgerPath(root);
  if (!fs.existsSync(lp)) return null;
  const lines = fs.readFileSync(lp, 'utf8').trim().split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as MirrorEntry;
      if (entry.seq === seq) return entry;
    } catch { continue; }
  }
  return null;
}

/** getEntryCount */
export function getEntryCount(root: string): number {
  const lp = ledgerPath(root);
  if (!fs.existsSync(lp)) return 0;
  return fs.readFileSync(lp, 'utf8').trim().split('\n').filter(Boolean).length;
}

/** verifyChain */
export function verifyChain(root: string): { valid: boolean; brokenAt?: number; totalEntries: number } {
  const entries = queryEntries(root);
  const sorted = [...entries].reverse();
  if (sorted.length === 0) return { valid: true, totalEntries: 0 };

  let prevHash = 'genesis';
  for (const entry of sorted) {
    const expectedHash = crypto.createHash('sha256').update(JSON.stringify({ ...entry, thisHash: '' }) + prevHash).digest('hex');
    if (entry.prevHash !== prevHash) {
      return { valid: false, brokenAt: entry.seq, totalEntries: sorted.length };
    }
    if (entry.thisHash !== expectedHash) {
      return { valid: false, brokenAt: entry.seq, totalEntries: sorted.length };
    }
    prevHash = entry.thisHash;
  }
  return { valid: true, totalEntries: sorted.length };
}
