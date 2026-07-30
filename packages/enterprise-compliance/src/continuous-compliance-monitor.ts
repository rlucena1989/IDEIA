import { randomUUID } from 'crypto';
import { createLogger, Logger } from '@ideia/logger';
import {
  ComplianceFramework,
  Control,
  ControlStatus,
  Evidence,
  DriftReport,
  DriftSeverity,
  ContinuousComplianceResult,
  ComplianceCheckSummary,
} from './types';

interface MonitorConfig {
  intervalMs: number;
  frameworks: ComplianceFramework[];
  alertOnDrift: boolean;
  autoRemediate: boolean;
  evidenceFreshnessDays: number;
}

interface MonitoredControl {
  controlId: string;
  framework: ComplianceFramework;
  lastChecked: string | null;
  lastStatus: ControlStatus;
  lastEvidenceHash: string | null;
  checkCount: number;
  failureCount: number;
}

export class ContinuousComplianceMonitor {
  private _monitored: Map<string, MonitoredControl> = new Map();
  private _drifts: DriftReport[] = [];
  private _config: MonitorConfig;
  private _logger: Logger;
  private _intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<MonitorConfig>) {
    this._config = {
      intervalMs: 3600000,
      frameworks: ['soc2', 'iso27001', 'gdpr', 'lgpd', 'hipaa', 'pci-dss'],
      alertOnDrift: true,
      autoRemediate: false,
      evidenceFreshnessDays: 30,
      ...config,
    };
    this._logger = createLogger('continuous-compliance-monitor');
  }

  get config(): MonitorConfig {
    return { ...this._config };
  }

  get monitoredCount(): number {
    return this._monitored.size;
  }

  get driftCount(): number {
    return this._drifts.length;
  }

  addControl(control: Control): void {
    const key = this._buildKey(control.framework, control.controlId);
    if (this._monitored.has(key)) return;

    this._monitored.set(key, {
      controlId: control.controlId,
      framework: control.framework,
      lastChecked: null,
      lastStatus: control.status,
      lastEvidenceHash: null,
      checkCount: 0,
      failureCount: 0,
    });
    this._logger.info('Control added to monitoring', { controlId: control.controlId, framework: control.framework });
  }

  addControls(controls: Control[]): void {
    for (const ctrl of controls) {
      this.addControl(ctrl);
    }
  }

  removeControl(framework: ComplianceFramework, controlId: string): boolean {
    const key = this._buildKey(framework, controlId);
    return this._monitored.delete(key);
  }

  start(): void {
    if (this._intervalId != null) return;
    this._logger.info('Continuous compliance monitor started', { intervalMs: this._config.intervalMs });
    this._intervalId = setInterval(() => {
      this.runCheck().catch((err: unknown) => {
        this._logger.error('Continuous check failed', { error: String(err) });
      });
    }, this._config.intervalMs);
  }

  stop(): void {
    if (this._intervalId != null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
      this._logger.info('Continuous compliance monitor stopped');
    }
  }

  async runCheck(): Promise<ComplianceCheckSummary> {
    const startTime = Date.now();
    const results: ContinuousComplianceResult[] = [];
    let driftsDetected = 0;

    for (const monitored of this._monitored.values()) {
      const result = await this._checkControl(monitored);
      results.push(result);
      if (result.driftDetected) {
        driftsDetected++;
      }
      monitored.lastChecked = result.checkedAt;
      monitored.checkCount++;
    }

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const durationMs = Date.now() - startTime;

    const summary: ComplianceCheckSummary = {
      totalControls: results.length,
      passed,
      failed,
      driftsDetected,
      durationMs,
      timestamp: new Date().toISOString(),
      results,
    };

    this._logger.info('Compliance check completed', {
      total: summary.totalControls,
      passed,
      failed,
      drifts: driftsDetected,
      duration: durationMs,
    });

    return summary;
  }

  getDrifts(framework?: ComplianceFramework, acknowledged?: boolean): DriftReport[] {
    let filtered = [...this._drifts];

    if (framework != null) {
      filtered = filtered.filter((d) => d.framework === framework);
    }
    if (acknowledged != null) {
      filtered = filtered.filter((d) => d.acknowledged === acknowledged);
    }

    return filtered.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
  }

  acknowledgeDrift(driftId: string, acknowledgedBy: string): boolean {
    const drift = this._drifts.find((d) => d.id === driftId);
    if (drift == null) return false;

    drift.acknowledged = true;
    drift.acknowledgedBy = acknowledgedBy;
    drift.acknowledgedAt = new Date().toISOString();
    return true;
  }

  getMonitorHealth(): { status: 'healthy' | 'degraded' | 'failing' | 'unknown'; monitoredCount: number; drifts: number; lastCheckTime: string | null } {
    const checkedItems = Array.from(this._monitored.values()).filter((m) => m.lastChecked != null);
    const allItems = Array.from(this._monitored.values());

    if (allItems.length === 0) return { status: 'unknown', monitoredCount: 0, drifts: 0, lastCheckTime: null };

    const failureRate = checkedItems.length > 0
      ? checkedItems.filter((m) => m.failureCount > 3).length / checkedItems.length
      : 0;

    let status: 'healthy' | 'degraded' | 'failing' | 'unknown';
    if (failureRate > 0.5) status = 'failing';
    else if (failureRate > 0.2) status = 'degraded';
    else status = 'healthy';

    const latestCheck = checkedItems
      .map((m) => m.lastChecked!)
      .sort()
      .reverse()[0] ?? null;

    return {
      status,
      monitoredCount: allItems.length,
      drifts: this._drifts.filter((d) => !d.acknowledged).length,
      lastCheckTime: latestCheck,
    };
  }

  getEvidenceFreshnessReport(evidence: Evidence[]): Array<{ evidenceId: string; type: string; daysOld: number; fresh: boolean }> {
    const now = Date.now();
    return evidence.map((e) => {
      const created = new Date(e.timestamp).getTime();
      const daysOld = Math.round((now - created) / (1000 * 60 * 60 * 24));
      return {
        evidenceId: e.id,
        type: e.type,
        daysOld,
        fresh: daysOld <= this._config.evidenceFreshnessDays,
      };
    });
  }

  private async _checkControl(monitored: MonitoredControl): Promise<ContinuousComplianceResult> {
    const startTime = Date.now();
    const details: string[] = [];
    let passed = true;
    let driftDetected = false;

    try {
      const statusCheck = await this._simulateControlCheck(monitored);
      passed = statusCheck;
      details.push(passed ? 'Control check passed' : 'Control check failed');

      if (passed !== (monitored.lastStatus === 'implemented')) {
        driftDetected = true;
        const driftReport = this._createDriftReport(monitored, passed);
        this._drifts.push(driftReport);
        this._logger.warn('Control drift detected', { controlId: monitored.controlId, driftId: driftReport.id });
      }

      if (!passed) {
        monitored.failureCount++;
      }
    } catch (err: unknown) {
      passed = false;
      details.push(`Check error: ${String(err)}`);
      monitored.failureCount++;
    }

    const durationMs = Date.now() - startTime;
    return {
      controlId: monitored.controlId,
      framework: monitored.framework,
      passed,
      checkedAt: new Date().toISOString(),
      durationMs,
      details,
      driftDetected,
      evidenceId: null,
    };
  }

  private async _simulateControlCheck(_monitored: MonitoredControl): Promise<boolean> {
    return Math.random() > 0.1;
  }

  private _createDriftReport(monitored: MonitoredControl, passed: boolean): DriftReport {
    return {
      id: randomUUID(),
      controlId: monitored.controlId,
      framework: monitored.framework,
      previousStatus: monitored.lastStatus,
      currentStatus: passed ? 'implemented' : 'not-implemented',
      detectedAt: new Date().toISOString(),
      severity: this._calculateDriftSeverity(monitored, passed),
      description: `Control ${monitored.controlId} status changed from ${monitored.lastStatus} to ${passed ? 'implemented' : 'not-implemented'}`,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
    };
  }

  private _calculateDriftSeverity(monitored: MonitoredControl, passed: boolean): DriftSeverity {
    if (!passed && monitored.lastStatus === 'implemented') return 'critical';
    if (passed && monitored.lastStatus !== 'implemented') return 'high';
    return 'medium';
  }

  private _buildKey(framework: ComplianceFramework, controlId: string): string {
    return `${framework}:${controlId}`;
  }
}
