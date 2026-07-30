import { createHash } from 'crypto';
import { createLogger } from '@ideia/logger';
import { Region, AuditEntry, CrossRegionIssue, ComplianceComparison } from './types';
const logger = createLogger('cross-region-auditor');

export class CrossRegionAuditor {
  private auditChains: Map<Region, AuditEntry[]> = new Map();

  async recordAudit(entry: AuditEntry): Promise<void> {
    const chain = this.auditChains.get(entry.region) ?? [];
    const previousHash = chain.length > 0 ? chain[chain.length - 1].hash : 'GENESIS';
    const updatedEntry: AuditEntry = {
      ...entry,
      previousHash,
      hash: '',
    };
    updatedEntry.hash = this.computeHash(updatedEntry);
    chain.push(updatedEntry);
    this.auditChains.set(entry.region, chain);
  }

  async verifyChain(region: Region): Promise<{ valid: boolean; brokenAt?: number }> {
    const chain = this.auditChains.get(region);
    if (!chain || chain.length === 0) return { valid: true };

    for (let i = 1; i < chain.length; i++) {
      const prevEntry = chain[i - 1];
      const currEntry = chain[i];
      const expectedPreviousHash = prevEntry.hash;
      if (currEntry.previousHash !== expectedPreviousHash) {
        return { valid: false, brokenAt: i };
      }
      const expectedHash = this.computeHash(currEntry);
      if (currEntry.hash !== expectedHash) {
        return { valid: false, brokenAt: i };
      }
    }
    return { valid: true };
  }

  async crossRegionAudit(regions: Region[]): Promise<CrossRegionIssue[]> {
    const issues: CrossRegionIssue[] = [];
    const chains = regions.map(r => ({ region: r, chain: this.auditChains.get(r) ?? [] }));

    for (let i = 0; i < chains.length; i++) {
      for (let j = i + 1; j < chains.length; j++) {
        const r1 = chains[i];
        const r2 = chains[j];
        const diff = this.diffChains(r1.chain, r2.chain);
        if (diff.length > 0) {
          issues.push({
            type: 'conflict',
            description: `Audit divergence between ${r1.region} and ${r2.region}: ${diff.length} differing entries`,
            sourceRegion: r1.region,
            targetRegion: r2.region,
            severity: 'medium',
            remediation: 'Reconcile audit trails across regions',
          });
        }
      }
    }

    for (const c of chains) {
      if (c.chain.length === 0) {
        issues.push({
          type: 'residency',
          description: `No audit trail for region ${c.region}`,
          sourceRegion: c.region,
          targetRegion: c.region,
          severity: 'high',
          remediation: `Initialize audit trail for ${c.region}`,
        });
      }
    }

    return issues;
  }

  async compareCompliance(
    region: Region,
    previous: { score: number; passedRules: string[] },
    current: { score: number; passedRules: string[] },
  ): Promise<ComplianceComparison> {
    return {
      region,
      previousScore: previous.score,
      currentScore: current.score,
      delta: current.score - previous.score,
      improved: current.passedRules.filter(r => !previous.passedRules.includes(r)),
      regressed: previous.passedRules.filter(r => !current.passedRules.includes(r)),
    };
  }

  private computeHash(entry: AuditEntry): string {
    const { hash: _, ...rest } = entry;
    return createHash('sha256')
      .update(JSON.stringify(rest, Object.keys(rest).sort()))
      .digest('hex');
  }

  getChain(region: Region): AuditEntry[] {
    return this.auditChains.get(region) ?? [];
  }

  getChainLength(region: Region): number {
    return this.auditChains.get(region)?.length ?? 0;
  }

  private diffChains(a: AuditEntry[], b: AuditEntry[]): AuditEntry[] {
    const diff: AuditEntry[] = [];
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      const entryA = a[i];
      const entryB = b[i];
      if (!entryA || !entryB || entryA.hash !== entryB.hash) {
        if (entryA) diff.push(entryA);
        if (entryB) diff.push(entryB);
      }
    }
    return diff;
  }
}
