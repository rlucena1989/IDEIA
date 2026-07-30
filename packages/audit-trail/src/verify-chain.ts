import fs from 'fs';
import { createLogger } from '@ideia/logger';
import crypto from 'crypto';
import { AuditEvent } from './audit-trail';

export interface ChainVerifyResult {
  valid: boolean;
  brokenLinks: number[];
  totalEntries: number;
}

function hashEvent(event: AuditEvent): string {
  const { previousHash, ...rest } = event;
  const data = previousHash
    ? JSON.stringify({ ...rest, previousHash }, Object.keys({ ...rest, previousHash }).sort())
    : JSON.stringify(rest, Object.keys(rest).sort());
  return crypto.createHash('sha256').update(data).digest('hex');
}

function loadEvents(filePath: string): AuditEvent[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n').filter(l => l.trim().length > 0).map(line => {
    try { return JSON.parse(line) as AuditEvent; } catch { return null; }
  }).filter((e): e is AuditEvent => e !== null);
}

export interface MerkleProof {
  entryIndex: number;
  entryHash: string;
  siblings: string[];
  rootHash: string;
  valid?: boolean;
}

export function proveEntry(
  filePath: string,
  eventId: string
): { valid: boolean; entryIndex: number } {
  const events = loadEvents(filePath);
  const idx = events.findIndex(e => e.eventId === eventId);
  if (idx === -1) return { valid: false, entryIndex: -1 };
  return { valid: true, entryIndex: idx };
}

export function getChainRoot(filePath: string): string {
  const events = loadEvents(filePath);
  if (events.length === 0) return crypto.createHash('sha256').update('empty').digest('hex');
  return hashEvent(events[events.length - 1]);
}

export function verifyChain(filePath: string): ChainVerifyResult {
  const events = loadEvents(filePath);
  if (events.length === 0) {
    return { valid: true, brokenLinks: [], totalEntries: 0 };
  }
  const brokenLinks: number[] = [];
  for (let i = 1; i < events.length; i++) {
    const expectedPrevHash = hashEvent(events[i - 1]);
    if (events[i].previousHash !== expectedPrevHash) {
      brokenLinks.push(i);
    }
  }
  return {
    valid: brokenLinks.length === 0,
    brokenLinks,
    totalEntries: events.length,
  };
}
