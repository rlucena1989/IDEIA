import { createHash, randomBytes } from 'node:crypto';
import { createLogger } from '@ideia/logger';
import * as fs from 'node:fs';
import * as path from 'node:path';
const logger = createLogger('audit-logger');

export interface AuditEntry {
  timestamp: string;
  action: string;
  agentId: string;
  source: string;
  success: boolean;
  durationMs: number;
  params?: Record<string, unknown>;
  previousHash: string;
  hash: string;
  nonce: string;
}

export class AuditLogger {
  private logPath: string;
  private chain: AuditEntry[] = [];
  private lastHash = '0'.repeat(64);

  constructor(logDir: string) {
    this.logPath = path.join(logDir, 'ipc-audit-chain.jsonl');
    fs.mkdirSync(logDir, { recursive: true });
    this.loadChain();
  }

  private loadChain(): void {
    try {
      if (fs.existsSync(this.logPath)) {
        const lines = fs.readFileSync(this.logPath, 'utf-8').split('\n').filter(Boolean);
        for (const line of lines) {
          const entry = JSON.parse(line) as AuditEntry;
          this.chain.push(entry);
          this.lastHash = entry.hash;
        }
      }
    } catch {
      this.chain = [];
      this.lastHash = '0'.repeat(64);
    }
  }

  log(entry: Omit<AuditEntry, 'timestamp' | 'previousHash' | 'hash' | 'nonce'>): AuditEntry {
    const nonce = randomBytes(8).toString('hex');
    const fullEntry: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      previousHash: this.lastHash,
      hash: '',
      nonce,
    };
    const hashInput = `${fullEntry.previousHash}|${fullEntry.action}|${fullEntry.agentId}|${fullEntry.timestamp}|${fullEntry.success}|${JSON.stringify(fullEntry.params || {})}|${fullEntry.nonce}`;
    fullEntry.hash = createHash('sha256').update(hashInput).digest('hex');
    this.chain.push(fullEntry);
    this.lastHash = fullEntry.hash;
    fs.appendFileSync(this.logPath, JSON.stringify(fullEntry) + '\n');
    return fullEntry;
  }

  verifyChain(): { valid: boolean; brokenAt?: number } {
    let prevHash = '0'.repeat(64);
    for (let i = 0; i < this.chain.length; i++) {
      const e = this.chain[i];
      const input = `${e.previousHash}|${e.action}|${e.agentId}|${e.timestamp}|${e.success}|${JSON.stringify(e.params || {})}|${e.nonce}`;
      const expected = createHash('sha256').update(input).digest('hex');
      if (e.previousHash !== prevHash || e.hash !== expected) {
        return { valid: false, brokenAt: i };
      }
      prevHash = e.hash;
    }
    return { valid: true };
  }

  search(opts: { agentId?: string; action?: string; success?: boolean; limit?: number }): AuditEntry[] {
    let results = [...this.chain];
    if (opts.agentId) results = results.filter(e => e.agentId === opts.agentId);
    if (opts.action) results = results.filter(e => e.action === opts.action);
    if (opts.success !== undefined) results = results.filter(e => e.success === opts.success);
    if (opts.limit) results = results.slice(-opts.limit);
    return results;
  }
}
