import { Logger, createLogger } from '@ideia/logger';
import type { IncidentSeverity, SLAConfig, SLAStatus, SLABreach } from './types';
import { SLA_DEFAULTS } from './types';

export class SLATracker {
  private readonly _configs: Map<IncidentSeverity, SLAConfig>;
  private readonly _breaches: Map<string, SLABreach> = new Map();
  private readonly _logger: Logger;
  private _breachCallbacks: Array<(breach: SLABreach) => void> = [];

  constructor(configs?: Partial<Record<IncidentSeverity, SLAConfig>>, logger?: Logger) {
    this._logger = logger || createLogger('incident-response');
    this._configs = new Map();
    for (const [severity, config] of Object.entries(SLA_DEFAULTS)) {
      const s = severity as IncidentSeverity;
      this._configs.set(s, configs?.[s] ? { ...config, ...configs[s] } : config);
    }
  }

  onBreach(callback: (breach: SLABreach) => void): void {
    this._breachCallbacks.push(callback);
  }

  getConfig(severity: IncidentSeverity): SLAConfig | undefined {
    return this._configs.get(severity);
  }

  updateConfig(severity: IncidentSeverity, config: Partial<SLAConfig>): void {
    const existing = this._configs.get(severity);
    if (existing) {
      this._configs.set(severity, { ...existing, ...config });
    }
  }

  trackDetect(incidentId: string, severity: IncidentSeverity, detectTimeMs: number): SLAStatus {
    const config = this._configs.get(severity);
    if (!config) {
      return this._defaultStatus(severity);
    }
    const detectSlaMet = detectTimeMs <= config.detectTimeMs;
    if (!detectSlaMet) {
      this._recordBreach(incidentId, severity, 'detect', config.detectTimeMs, detectTimeMs);
    }
    return {
      severity,
      detectTimeMs,
      respondTimeMs: 0,
      resolveTimeMs: 0,
      detectSlaMet,
      respondSlaMet: false,
      resolveSlaMet: false,
      overallSlaMet: false,
    };
  }

  trackRespond(incidentId: string, severity: IncidentSeverity, status: SLAStatus, respondTimeMs: number): SLAStatus {
    const config = this._configs.get(severity);
    if (!config) {
      return { ...status, respondSlaMet: true };
    }
    const respondSlaMet = respondTimeMs <= config.respondTimeMs;
    if (!respondSlaMet) {
      this._recordBreach(incidentId, severity, 'respond', config.respondTimeMs, respondTimeMs);
    }
    return { ...status, respondTimeMs, respondSlaMet };
  }

  trackResolve(incidentId: string, severity: IncidentSeverity, status: SLAStatus, resolveTimeMs: number): SLAStatus {
    const config = this._configs.get(severity);
    if (!config) {
      return { ...status, resolveSlaMet: true, overallSlaMet: status.detectSlaMet && status.respondSlaMet };
    }
    const resolveSlaMet = resolveTimeMs <= config.resolveTimeMs;
    if (!resolveSlaMet) {
      this._recordBreach(incidentId, severity, 'resolve', config.resolveTimeMs, resolveTimeMs);
    }
    const finalStatus = { ...status, resolveTimeMs, resolveSlaMet };
    finalStatus.overallSlaMet = finalStatus.detectSlaMet && finalStatus.respondSlaMet && finalStatus.resolveSlaMet;
    if (!finalStatus.overallSlaMet) {
      finalStatus.breachedAt = Date.now();
    }
    return finalStatus;
  }

  checkSLA(incidentId: string, severity: IncidentSeverity, elapsedMs: number): SLAStatus {
    const config = this._configs.get(severity);
    if (!config) {
      return this._defaultStatus(severity);
    }
    const detectSlaMet = elapsedMs <= config.detectTimeMs;
    const respondSlaMet = elapsedMs <= config.respondTimeMs;
    const resolveSlaMet = elapsedMs <= config.resolveTimeMs;
    const status: SLAStatus = {
      severity,
      detectTimeMs: elapsedMs,
      respondTimeMs: elapsedMs,
      resolveTimeMs: elapsedMs,
      detectSlaMet,
      respondSlaMet,
      resolveSlaMet,
      overallSlaMet: detectSlaMet && respondSlaMet && resolveSlaMet,
    };

    if (!detectSlaMet) {
      this._recordBreach(incidentId, severity, 'detect', config.detectTimeMs, elapsedMs);
    }
    if (!status.overallSlaMet) {
      status.breachedAt = Date.now();
    }
    return status;
  }

  getBreaches(): SLABreach[] {
    return Array.from(this._breaches.values());
  }

  getBreachesForIncident(incidentId: string): SLABreach[] {
    return Array.from(this._breaches.values()).filter(b => b.incidentId === incidentId);
  }

  getMetrics(): { totalBreaches: number; breachesBySeverity: Record<string, number> } {
    const breaches = Array.from(this._breaches.values());
    const breachesBySeverity: Record<string, number> = {};
    for (const b of breaches) {
      breachesBySeverity[b.severity] = (breachesBySeverity[b.severity] || 0) + 1;
    }
    return {
      totalBreaches: breaches.length,
      breachesBySeverity,
    };
  }

  private _recordBreach(incidentId: string, severity: IncidentSeverity, metric: 'detect' | 'respond' | 'resolve', thresholdMs: number, actualMs: number): void {
    const breachKey = `${incidentId}:${metric}`;
    if (this._breaches.has(breachKey)) return;

    const breach: SLABreach = {
      incidentId,
      severity,
      metric,
      thresholdMs,
      actualMs,
      breachedAt: Date.now(),
      escalated: false,
    };
    this._breaches.set(breachKey, breach);
    this._logger.warn(`SLA breach: ${metric} for ${incidentId} (${severity}) — ${actualMs}ms vs ${thresholdMs}ms threshold`);

    for (const callback of this._breachCallbacks) {
      try {
        callback(breach);
      } catch (error) {
        this._logger.error(`SLA breach callback failed: ${String(error)}`);
      }
    }
  }

  private _defaultStatus(severity: IncidentSeverity): SLAStatus {
    return {
      severity,
      detectTimeMs: 0,
      respondTimeMs: 0,
      resolveTimeMs: 0,
      detectSlaMet: true,
      respondSlaMet: true,
      resolveSlaMet: true,
      overallSlaMet: true,
    };
  }
}
