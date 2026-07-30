import type { ComplianceReport, ComplianceCheck, GapRecord, DocumentRecord } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('compliance-checker');

export class ComplianceChecker {
  check(gaps: GapRecord[], documents: DocumentRecord[], adrs: string[]): ComplianceReport {
    const checks: ComplianceCheck[] = [];

    checks.push(this.checkDocumentRegistry(documents));
    checks.push(this.checkGapsFile(gaps));
    checks.push(this.checkAdrDirectory(adrs));

    const totalGaps = gaps.length;
    const openGaps = gaps.filter(g => g.status === 'open').length;
    const resolvedGaps = gaps.filter(g => g.status === 'resolved').length;

    return {
      totalDocuments: documents.length,
      totalGaps,
      openGaps,
      resolvedGaps,
      compliant: checks.every(c => c.passed),
      checks,
    };
  }

  private checkDocumentRegistry(documents: DocumentRecord[]): ComplianceCheck {
    return {
      name: 'document-registry',
      passed: documents.length > 0,
      details: `Found ${documents.length} registered documents`,
    };
  }

  private checkGapsFile(gaps: GapRecord[]): ComplianceCheck {
    const criticalOpen = gaps.filter(g => g.severity === 'critical' && g.status === 'open').length;
    return {
      name: 'gaps-file',
      passed: criticalOpen === 0,
      details: criticalOpen > 0 ? `${criticalOpen} critical gaps unresolved` : 'No critical gaps open',
    };
  }

  private checkAdrDirectory(adrs: string[]): ComplianceCheck {
    return {
      name: 'adr-directory',
      passed: adrs.length > 0,
      details: adrs.length > 0 ? `${adrs.length} ADRs found` : 'No ADRs registered',
    };
  }
}
