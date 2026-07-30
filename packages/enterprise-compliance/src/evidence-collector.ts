import { randomUUID, createHash } from 'crypto';
import { createLogger, Logger } from '@ideia/logger';
import { Evidence, EvidenceType, EvidenceSource, EvidenceChainEntry } from './types';

export interface CollectorConfig {
  types: EvidenceType[];
  retentionDays: number;
  storagePath: string;
  schedule: string;
}

export class EvidenceCollector {
  private _collected: Evidence[] = [];
  private _config: CollectorConfig;
  private _logger: Logger;

  constructor(config: CollectorConfig) {
    this._config = config;
    this._logger = createLogger('evidence-collector');
  }

  get collected(): Evidence[] {
    return [...this._collected];
  }

  get config(): CollectorConfig {
    return { ...this._config };
  }

  async collect(type: EvidenceType, content: Record<string, unknown>, controlIds: string[]): Promise<Evidence> {
    const evidence = this._buildEvidence(type, content, controlIds);
    evidence.hash = this._computeHash(evidence);
    evidence.chain = this._buildChain(evidence, 'created', 'system');
    this._collected.push(evidence);
    this._logger.info('Evidence collected', { evidenceId: evidence.id, type });
    return evidence;
  }

  getRecentByType(type: EvidenceType, limit: number = 10): Evidence[] {
    return this._collected.filter((e) => e.type === type).slice(-limit);
  }

  getEvidenceForControl(controlId: string): Evidence[] {
    return this._collected.filter((e) => e.controlIds.includes(controlId));
  }

  getEvidenceById(id: string): Evidence | undefined {
    return this._collected.find((e) => e.id === id);
  }

  verifyEvidenceIntegrity(evidence: Evidence): boolean {
    const { hash, chain: _chain, ...rest } = evidence;
    const computed = this._computeHash(rest as Evidence);
    return hash === computed;
  }

  verifyChainIntegrity(evidence: Evidence): boolean {
    if (evidence.chain.length === 0) return false;
    let prevHash = '0'.repeat(64);
    for (const entry of evidence.chain) {
      const computed = this._computeEntryHash(entry);
      if (entry.previousHash !== prevHash) return false;
      if (entry.hash !== computed) return false;
      prevHash = entry.hash;
    }
    return true;
  }

  verifyEvidence(evidenceId: string): boolean {
    const evidence = this.getEvidenceById(evidenceId);
    if (evidence == null) return false;
    const contentValid = this.verifyEvidenceIntegrity(evidence);
    const chainValid = this.verifyChainIntegrity(evidence);
    const result = contentValid && chainValid;
    if (result) {
      evidence.verified = true;
      evidence.chain.push(this._buildChainEntry(evidence, 'verified', 'auditor'));
    }
    return result;
  }

  collectConfigSnapshot(policies: Record<string, unknown>, preferences: Record<string, unknown>, controlSettings: Record<string, unknown>): Promise<Evidence> {
    return this.collect('configuration_snapshot', { policies, preferences, controlSettings }, ['SOC2-CC1', 'SOC2-CC3', 'ISO-A9']);
  }

  collectAccessReview(users: unknown[], roles: unknown[], permissions: unknown[]): Promise<Evidence> {
    return this.collect('access_review', { users, roles, permissions, reviewPeriod: 'monthly' }, ['SOC2-CC6.1', 'SOC2-CC6.2', 'HIPAA-164.312(a)']);
  }

  collectVulnerabilityScan(vulnerabilities: unknown[], summary: Record<string, unknown>): Promise<Evidence> {
    return this.collect('vulnerability_scan', { vulnerabilities, summary, scanner: 'trivy' }, ['SOC2-CC7.3', 'SOC2-CC7.1']);
  }

  collectIncidentReport(incidentData: Record<string, unknown>): Promise<Evidence> {
    return this.collect('incident_report', incidentData, ['SOC2-CC7.2', 'HIPAA-164.308(a)(6)']);
  }

  collectAuditLog(logData: Record<string, unknown>): Promise<Evidence> {
    return this.collect('audit_log', logData, ['SOC2-CC7.1', 'PCI-DSS-Req.10']);
  }

  collectPolicyAcknowledgment(userId: string, policyName: string, accepted: boolean): Promise<Evidence> {
    return this.collect('policy_acknowledgment', { userId, policyName, accepted, timestamp: new Date().toISOString() }, []);
  }

  generateCoverageReport(): { totalRequired: number; totalCollected: number; coveragePercent: number; byType: Partial<Record<EvidenceType, { required: number; collected: number }>> } {
    const byType: Partial<Record<EvidenceType, { required: number; collected: number }>> = {};
    const allTypes: EvidenceType[] = ['configuration_snapshot', 'access_review', 'penetration_test', 'vulnerability_scan', 'training_record', 'policy_acknowledgment', 'audit_log', 'incident_report', 'change_management', 'backup_verification'];

    let totalRequired = 0;
    let totalCollected = 0;

    for (const t of allTypes) {
      const collected = this._collected.filter((e) => e.type === t).length;
      const required = 1;
      totalRequired += required;
      totalCollected += collected;
      byType[t] = { required, collected };
    }

    return {
      totalRequired,
      totalCollected,
      coveragePercent: totalRequired > 0 ? Math.round((totalCollected / totalRequired) * 100) : 0,
      byType,
    };
  }

  getRetentionReport(): Array<{ evidenceId: string; type: EvidenceType; retainedUntil: string; daysRemaining: number; expired: boolean }> {
    const now = new Date().getTime();
    return this._collected.map((e) => {
      const expiry = new Date(e.retainedUntil).getTime();
      const daysRemaining = Math.max(0, Math.round((expiry - now) / (1000 * 60 * 60 * 24)));
      return {
        evidenceId: e.id,
        type: e.type,
        retainedUntil: e.retainedUntil,
        daysRemaining,
        expired: now >= expiry,
      };
    });
  }

  getEvidenceBySource(source: EvidenceSource): Evidence[] {
    return this._collected.filter((e) => e.source === source);
  }

  getUnverifiedEvidence(): Evidence[] {
    return this._collected.filter((e) => !e.verified);
  }

  invalidateEvidence(id: string, reason: string): boolean {
    const evidence = this.getEvidenceById(id);
    if (evidence == null) return false;
    evidence.verified = false;
    evidence.metadata['invalidatedReason'] = reason;
    evidence.chain.push(this._buildChainEntry(evidence, 'invalidated', 'system'));
    this._logger.warn('Evidence invalidated', { evidenceId: id, reason });
    return true;
  }

  archiveEvidence(id: string): boolean {
    const evidence = this.getEvidenceById(id);
    if (evidence == null) return false;
    evidence.chain.push(this._buildChainEntry(evidence, 'archived', 'system'));
    this._logger.info('Evidence archived', { evidenceId: id });
    return true;
  }

  private _buildEvidence(type: EvidenceType, content: Record<string, unknown>, controlIds: string[]): Evidence {
    return {
      id: randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      source: 'automated_collector' as EvidenceSource,
      content,
      hash: '',
      metadata: {
        environment: process.env['NODE_ENV'] ?? 'production',
        collectorVersion: '1.0.0',
      },
      retainedUntil: this._computeRetentionDate(),
      controlIds,
      verified: false,
      chain: [],
    };
  }

  private _computeHash(evidence: Omit<Evidence, 'hash' | 'chain'>): string {
    const relevant = {
      id: evidence.id,
      type: evidence.type,
      timestamp: evidence.timestamp,
      content: evidence.content,
      controlIds: evidence.controlIds,
    };
    return createHash('sha256').update(JSON.stringify(relevant)).digest('hex');
  }

  private _computeRetentionDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + this._config.retentionDays);
    return date.toISOString();
  }

  private _buildChainEntry(evidence: Evidence, action: EvidenceChainEntry['action'], actor: string): EvidenceChainEntry {
    const prevHash = evidence.chain.length > 0
      ? evidence.chain[evidence.chain.length - 1].hash
      : '0'.repeat(64);
    const entry: EvidenceChainEntry = {
      id: randomUUID(),
      evidenceId: evidence.id,
      action,
      timestamp: new Date().toISOString(),
      actor,
      hash: '',
      previousHash: prevHash,
    };
    entry.hash = this._computeEntryHash(entry);
    return entry;
  }

  private _buildChain(evidence: Evidence, action: EvidenceChainEntry['action'], actor: string): EvidenceChainEntry[] {
    return [this._buildChainEntry(evidence, action, actor)];
  }

  private _computeEntryHash(entry: EvidenceChainEntry): string {
    const data = `${entry.id}${entry.evidenceId}${entry.action}${entry.timestamp}${entry.actor}${entry.previousHash}`;
    return createHash('sha256').update(data).digest('hex');
  }
}
