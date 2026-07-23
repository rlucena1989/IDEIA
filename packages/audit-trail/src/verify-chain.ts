import fs from 'fs';
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
