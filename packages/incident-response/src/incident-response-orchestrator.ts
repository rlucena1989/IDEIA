import { Logger, createLogger } from '@ideia/logger';
import type { Incident, IncidentSeverity, IncidentType, IncidentStatus, ExecutedAction, DetectionSource, RecoveryResult } from './types';
import { IncidentDetector, type DetectionInput } from './incident-detector';
import { IncidentClassifier } from './incident-classifier';
import { PlaybookEngine } from './playbook-engine';
import { ForensicsCollector } from './forensics-collector';
import { AutoRecoveryEngine } from './auto-recovery-engine';
import { SLATracker } from './sla-tracker';

export interface ViolationEvent {
  id: string;
  agentId: string;
  actions: Array<{ type: string; destination?: string; payload?: string }>;
  agentsAffected: number;
  filesAffected: string[];
  violationCount: number;
  pattern?: string;
  llmPrompt?: string;
  llmResponse?: string;
  source?: DetectionSource;
  context?: Record<string, unknown>;
}

export interface OrchestratorConfig {
  autoRecover: boolean;
  enableForensics: boolean;
  maxActiveIncidents: number;
  autonomyLevel: 'N1' | 'N2' | 'N3' | 'N4';
}

export interface IncidentReport {
  total: number;
  bySeverity: Record<IncidentSeverity, number>;
  byStatus: Record<IncidentStatus, number>;
  slaMet: number;
  avgResolutionTimeMs: number;
  activeCount: number;
  recentIncidents: Incident[];
  mttdMs: number;
  mttrMs: number;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  autoRecover: true,
  enableForensics: true,
  maxActiveIncidents: 50,
  autonomyLevel: 'N3',
};

export class IncidentResponseOrchestrator {
  private readonly _incidents: Map<string, Incident> = new Map();
  private readonly _activeIncidents: Map<string, Incident> = new Map();
  private readonly _logger: Logger;

  constructor(
    private readonly _detector: IncidentDetector,
    private readonly _classifier: IncidentClassifier,
    private readonly _playbookEngine: PlaybookEngine,
    private readonly _forensicsCollector: ForensicsCollector,
    private readonly _recoveryEngine: AutoRecoveryEngine,
    private readonly _slaTracker: SLATracker,
    private readonly _config: OrchestratorConfig = DEFAULT_CONFIG,
    logger?: Logger
  ) {
    this._logger = logger || createLogger('incident-response');
  }

  async handleViolation(violation: ViolationEvent): Promise<Incident> {
    const startTime = Date.now();

    const detectionResult = await this._detector.analyze({
      agentId: violation.agentId,
      actions: violation.actions,
      filesAffected: violation.filesAffected,
      agentsAffected: violation.agentsAffected,
      violationCount: violation.violationCount,
      pattern: violation.pattern,
      llmPrompt: violation.llmPrompt,
      llmResponse: violation.llmResponse,
      source: violation.source,
      context: violation.context,
    });

    const classification = this._classifier.classify(violation);

    const incidentId = this._generateId();
    const severity = detectionResult.detected ? detectionResult.severity : classification.severity;
    const type = detectionResult.detected ? detectionResult.type : classification.type;

    const incident: Incident = {
      id: incidentId,
      severity,
      type,
      status: 'detection',
      title: `[${severity}] ${type} — Agent ${violation.agentId}`,
      description: classification.factors.length > 0
        ? `Factors: ${classification.factors.join(', ')}. Score: ${classification.score}. Confidence: ${(classification.confidence * 100).toFixed(0)}%`
        : `Violation detected: ${violation.pattern || type}`,
      timestamp: startTime,
      detectedAt: startTime,
      agentId: violation.agentId,
      source: violation.source || 'policy',
      violationType: violation.pattern || type,
      violationCount: violation.violationCount,
      actions: [],
      tags: [`severity:${severity}`, `type:${type}`, `source:${violation.source || 'policy'}`, `score:${classification.score}`],
    };

    this._activeIncidents.set(incident.id, incident);
    this._logger.info(`Incident ${incident.id} created — ${severity}/${type} for agent ${violation.agentId}`);

    const slaStatus = this._slaTracker.trackDetect(incident.id, severity, Date.now() - startTime);
    incident.slaStatus = slaStatus;

    incident.status = 'analysis';

    const playbookResult = await this._playbookEngine.execute(severity, type, violation.agentId);
    incident.actions = playbookResult.stepResults.map(r => ({
      type: r.action,
      success: r.success,
      error: r.error,
      timestamp: Date.now(),
    }));

    incident.status = 'containment';

    if (this._config.enableForensics && (severity === 'P0' || severity === 'P1')) {
      try {
        const forensics = await this._forensicsCollector.capture(violation.agentId, 'full');
        incident.forensics = {
          id: `ev-${incident.id}`,
          agentId: violation.agentId,
          type: 'memory_dump',
          timestamp: Date.now(),
          hash: forensics.evidenceHash,
          size: 0,
          path: `/forensics/${violation.agentId}/${incident.id}`,
          chainOfCustody: forensics.chainOfCustody,
          metadata: { depth: 'full', evidenceHash: forensics.evidenceHash },
        };
      } catch (error) {
        this._logger.error(`Forensics collection failed for ${incident.id}: ${String(error)}`);
      }
    }

    incident.status = 'eradication';

    if (this._config.autoRecover && (severity === 'P0' || severity === 'P1' || (severity === 'P2' && this._config.autonomyLevel >= 'N2'))) {
      try {
        const recoveryResult = await this._recoveryEngine.recover(violation.agentId, violation.filesAffected);
        incident.recovery = recoveryResult;
      } catch (error) {
        this._logger.error(`Auto-recovery failed for ${incident.id}: ${String(error)}`);
      }
    }

    incident.status = 'recovery';

    if (severity === 'P0' || severity === 'P1') {
      await this._sendNotification(severity, incident, violation.agentId);
    }

    incident.status = 'resolved';
    incident.resolvedAt = Date.now();

    const slaStatusFinal = this._slaTracker.trackResolve(incident.id, severity, slaStatus, Date.now() - startTime);
    incident.slaStatus = slaStatusFinal;

    this._incidents.set(incident.id, incident);
    this._activeIncidents.delete(incident.id);

    this._logger.info(`Incident ${incident.id} resolved in ${Date.now() - startTime}ms. SLA met: ${slaStatusFinal.overallSlaMet}`);

    return incident;
  }

  async getActiveIncidents(): Promise<Incident[]> {
    return Array.from(this._activeIncidents.values());
  }

  async getIncident(id: string): Promise<Incident | undefined> {
    return this._incidents.get(id);
  }

  async getReport(filters?: { severity?: IncidentSeverity; since?: number; agentId?: string }): Promise<IncidentReport> {
    let incidents = Array.from(this._incidents.values());
    if (filters) {
      if (filters.severity) incidents = incidents.filter(i => i.severity === filters.severity);
      if (filters.since) incidents = incidents.filter(i => i.timestamp >= filters.since!);
      if (filters.agentId) incidents = incidents.filter(i => i.agentId === filters.agentId);
    }

    const bySeverity: Record<IncidentSeverity, number> = { P0: 0, P1: 0, P2: 0, P3: 0, P4: 0 };
    const byStatus: Record<IncidentStatus, number> = {
      preparation: 0, detection: 0, analysis: 0, containment: 0,
      eradication: 0, recovery: 0, post_mortem: 0, resolved: 0,
    };
    let slaMisses = 0;

    for (const inc of incidents) {
      bySeverity[inc.severity]++;
      byStatus[inc.status]++;
      if (inc.slaStatus && !inc.slaStatus.overallSlaMet) slaMisses++;
    }

    const resolutionTimes = incidents.filter(i => i.resolvedAt).map(i => (i.resolvedAt || 0) - i.timestamp);

    return {
      total: incidents.length,
      bySeverity,
      byStatus,
      slaMet: incidents.length > 0 ? (incidents.length - slaMisses) / incidents.length : 1,
      avgResolutionTimeMs: resolutionTimes.length > 0
        ? resolutionTimes.reduce((s, t) => s + t, 0) / resolutionTimes.length
        : 0,
      activeCount: this._activeIncidents.size,
      recentIncidents: incidents.slice(-10).reverse(),
      mttdMs: this._calculateMTTD(incidents),
      mttrMs: this._calculateMTTR(incidents),
    };
  }

  async resolveIncident(id: string): Promise<boolean> {
    const incident = this._incidents.get(id);
    if (!incident) return false;
    incident.status = 'resolved';
    incident.resolvedAt = Date.now();
    this._activeIncidents.delete(id);
    return true;
  }

  private async _sendNotification(severity: IncidentSeverity, _incident: Incident, _agentId: string): Promise<void> {
    const channel = severity === 'P0' ? 'pagerduty+sms' : 'slack-urgent';
    this._logger.warn(`[NOTIFICATION] ${severity} incident — notify via ${channel}`);
  }

  private _calculateMTTD(incidents: Incident[]): number {
    const withDetection = incidents.filter(i => i.detectedAt > 0);
    if (withDetection.length === 0) return 0;
    return withDetection.reduce((s, i) => s + i.timestamp, 0) / withDetection.length;
  }

  private _calculateMTTR(incidents: Incident[]): number {
    const resolved = incidents.filter(i => i.resolvedAt);
    if (resolved.length === 0) return 0;
    return resolved.reduce((s, i) => s + ((i.resolvedAt || 0) - i.timestamp), 0) / resolved.length;
  }

  private _generateId(): string {
    return `inc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}
