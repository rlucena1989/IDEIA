import fs from 'node:fs';

interface AuditEntry {
  timestamp: string;
  action: string;
  provider: string;
  tokens: number;
  costUsd: number;
  latencyMs: number;
  success: boolean;
  details: string;
}

const entries: AuditEntry[] = [];

export function logAudit(entry: Omit<AuditEntry, 'timestamp'>): void {
  const full: AuditEntry = { ...entry, timestamp: new Date().toISOString() };
  entries.push(full);
  if (entries.length > 1000) entries.shift();
}

export function getAuditLog(): AuditEntry[] {
  return [...entries];
}

export function exportAuditLog(filePath: string): void {
  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
}

export function totalCost(): number {
  return entries.reduce((a, e) => a + e.costUsd, 0);
}

export function totalTokens(): number {
  return entries.reduce((a, e) => a + e.tokens, 0);
}

export function successRate(): number {
  if (entries.length === 0) return 1;
  return entries.filter(e => e.success).length / entries.length;
}

export function clearAuditLog(): void {
  entries.length = 0;
}
