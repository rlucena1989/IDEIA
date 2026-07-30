import type { GapRecord, ComplianceReport, DocumentRecord } from './types';
import { createLogger } from '@ideia/logger';
import { ComplianceChecker } from './compliance-checker';
const logger = createLogger('governance-service');

export class GovernanceService {
  private gaps: GapRecord[] = [];
  private documents: DocumentRecord[] = [];
  private adrs: string[] = [];
  private checker = new ComplianceChecker();

  listGaps(severity?: string): GapRecord[] {
    if (severity) {
      return this.gaps.filter(g => g.severity === severity);
    }
    return [...this.gaps];
  }

  addGap(gap: Omit<GapRecord, 'id' | 'createdAt'>): GapRecord {
    const record: GapRecord = {
      ...gap,
      id: `gap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.gaps.push(record);
    return record;
  }

  resolveGap(id: string): boolean {
    const gap = this.gaps.find(g => g.id === id);
    if (!gap) {
      return false;
    }
    gap.status = 'resolved';
    gap.resolvedAt = new Date().toISOString();
    return true;
  }

  getComplianceReport(): ComplianceReport {
    return this.checker.check(this.gaps, this.documents, this.adrs);
  }

  loadState(data: { gaps: GapRecord[]; documents: DocumentRecord[]; adrs: string[] }): void {
    this.gaps = data.gaps;
    this.documents = data.documents;
    this.adrs = data.adrs;
  }
}
