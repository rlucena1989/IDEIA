import { HealthMonitor } from './health-monitor';
import { AnomalyDetector } from './anomaly-detector';
import { DiagnosticEngine } from './diagnostic-engine';
import { AutoHealingEngine } from './auto-healing-engine';
import { HealingPolicyManager } from './healing-policy-manager';
import {
  OrchestratorConfig, Incident, IncidentStatus, Symptom,
  HealingAction, TheiaHealthWidgetData,
} from './types';

export class SelfHealingOrchestrator {
  private _healthMonitor: HealthMonitor;
  private _anomalyDetector: AnomalyDetector;
  private _diagnosticEngine: DiagnosticEngine;
  private _healingEngine: AutoHealingEngine;
  private _policyManager: HealingPolicyManager;
  private _config: OrchestratorConfig;
  private _incidents: Map<string, Incident> = new Map();
  private _activeIncidents: number = 0;
  private _running: boolean = false;
  private _cycleCount: number = 0;
  private _successCount: number = 0;
  private _failureCount: number = 0;

  constructor(
    healthMonitor: HealthMonitor,
    anomalyDetector: AnomalyDetector,
    diagnosticEngine: DiagnosticEngine,
    healingEngine: AutoHealingEngine,
    policyManager: HealingPolicyManager,
    config: OrchestratorConfig
  ) {
    this._healthMonitor = healthMonitor;
    this._anomalyDetector = anomalyDetector;
    this._diagnosticEngine = diagnosticEngine;
    this._healingEngine = healingEngine;
    this._policyManager = policyManager;
    this._config = config;
  }

  get config(): OrchestratorConfig { return this._config; }
  get isRunning(): boolean { return this._running; }
  get cycleCount(): number { return this._cycleCount; }
  get successCount(): number { return this._successCount; }
  get failureCount(): number { return this._failureCount; }

  updateConfig(partial: Partial<OrchestratorConfig>): void {
    this._config = { ...this._config, ...partial };
  }

  async runCycle(): Promise<Incident[]> {
    const incidents: Incident[] = [];
    if (!this._config.enableAutoHealing) return incidents;
    if (this._activeIncidents >= this._config.maxConcurrentIncidents) return incidents;

    const report = await this._healthMonitor.getReport();
    const metricsSnapshot = this._healthMonitor.getMetricsSnapshot();
    const metricsMap = new Map(Object.entries(metricsSnapshot));
    const anomalyResults = this._anomalyDetector.analyzeAllMetrics(metricsMap);
    const anomalousMetrics: string[] = [];
    for (const [name, result] of anomalyResults) {
      if (result.isAnomaly) anomalousMetrics.push(name);
    }
    if (anomalousMetrics.length === 0) return incidents;

    const symptoms: Symptom[] = [];
    for (const metricName of anomalousMetrics) {
      const result = anomalyResults.get(metricName);
      if (!result) continue;
      const series = this._anomalyDetector.getHistory(metricName);
      const currentValue = series.length > 0 ? series[series.length - 1]?.value ?? 0 : 0;
      const baseline = series.length > 0
        ? series.reduce((a, p) => a + p.value, 0) / series.length
        : 0;
      symptoms.push({
        metricName,
        currentValue,
        baseline,
        deviation: baseline !== 0 ? (currentValue - baseline) / baseline : 0,
        anomalyScore: result.score,
        method: result.method,
        timestamp: Date.now(),
        service: metricName.split('_')[0] ?? metricName,
      });
    }

    const affectedServices = [...new Set(symptoms.map(s => s.service))];
    const diagnosis = this._diagnosticEngine.diagnose(symptoms, anomalyResults, affectedServices);
    const plan = this._healingEngine.createPlan(diagnosis);

    const incident: Incident = {
      id: diagnosis.incidentId,
      title: `Anomaly detected: ${anomalousMetrics.join(', ')}`,
      severity: diagnosis.confidence.score > 0.8 ? 'critical' : 'warning',
      status: 'healing',
      timestamp: Date.now(),
      affectedServices,
      metrics: Object.fromEntries(anomalousMetrics.map(m => {
        const ar = anomalyResults.get(m);
        return [m, { current: metricsSnapshot[m] ?? 0, baseline: 0, anomalyScore: ar?.score ?? 0 }];
      })),
      diagnosticReport: diagnosis,
      healingPlan: plan,
      tags: ['auto-detected'],
    };

    this._incidents.set(incident.id, incident);
    this._activeIncidents++;
    this._cycleCount++;

    const defaultOnApproval = async (_action: HealingAction): Promise<boolean> => true;
    const results = await this._healingEngine.executePlan(plan, defaultOnApproval);
    incident.healingResults = results;

    const allSuccess = results.every(r => r.status === 'success' || r.status === 'executing');
    incident.status = allSuccess ? 'resolved' : 'failed';
    if (allSuccess) {
      incident.resolvedAt = Date.now();
      this._successCount++;
    } else {
      this._failureCount++;
    }

    this._incidents.set(incident.id, incident);
    this._activeIncidents--;
    incidents.push(incident);
    return incidents;
  }

  getIncident(id: string): Incident | undefined {
    return this._incidents.get(id);
  }

  getAllIncidents(): readonly Incident[] {
    return Array.from(this._incidents.values());
  }

  getIncidentsByStatus(status: IncidentStatus): Incident[] {
    return Array.from(this._incidents.values()).filter(i => i.status === status);
  }

  getStats(): { totalCycles: number; successes: number; failures: number; activeIncidents: number; totalIncidents: number; uptimePercent: number } {
    const totalIncidents = this._incidents.size;
    const resolvedCount = Array.from(this._incidents.values()).filter(i => i.status === 'resolved').length;
    const uptimePercent = totalIncidents > 0 ? (resolvedCount / totalIncidents) * 100 : 100;
    return {
      totalCycles: this._cycleCount,
      successes: this._successCount,
      failures: this._failureCount,
      activeIncidents: this._activeIncidents,
      totalIncidents,
      uptimePercent,
    };
  }
}

export class TheiaHealthWidget {
  private _refreshIntervalMs: number = 15000;
  private _onUpdate: ((data: TheiaHealthWidgetData) => void) | null = null;
  private _timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private _healthMonitor: HealthMonitor,
    private _orchestrator: SelfHealingOrchestrator
  ) {}

  set onUpdate(cb: (data: TheiaHealthWidgetData) => void) {
    this._onUpdate = cb;
  }

  set refreshInterval(ms: number) {
    this._refreshIntervalMs = ms;
  }

  startAutoRefresh(): void {
    if (this._timer) return;
    this._timer = setInterval(() => {
      this._emitData();
    }, this._refreshIntervalMs);
  }

  stopAutoRefresh(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  async getData(): Promise<TheiaHealthWidgetData> {
    const { overall, checks } = await this._healthMonitor.getStatus();
    const stats = this._orchestrator.getStats();
    return {
      overall,
      totalChecks: checks.length,
      healthyChecks: checks.filter(c => c.status === 'healthy').length,
      degradedChecks: checks.filter(c => c.status === 'degraded').length,
      unhealthyChecks: checks.filter(c => c.status === 'unhealthy').length,
      recentIncidents: stats.totalIncidents,
      uptimePercent: stats.uptimePercent,
      lastUpdated: Date.now(),
      checks,
    };
  }

  private async _emitData(): Promise<void> {
    if (!this._onUpdate) return;
    const data = await this.getData();
    this._onUpdate(data);
  }
}
