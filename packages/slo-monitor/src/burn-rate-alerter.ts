import { createLogger } from '@ideia/logger';
import { SloMetric } from './types';

const logger = createLogger('slo-monitor:burn-rate-alerter');

export interface BurnRateConfig {
  sloName: string;
  targetPercent: number;
  windows: Array<{
    name: string;
    durationMs: number;
    warningThreshold: number;
    criticalThreshold: number;
  }>;
}

export interface BurnRateState {
  sloName: string;
  windowName: string;
  windowDurationMs: number;
  totalRequests: number;
  failedRequests: number;
  burnRate: number;
  status: 'green' | 'yellow' | 'red';
  lastUpdated: string;
}

export interface BurnRateAlert {
  sloName: string;
  windowName: string;
  status: 'yellow' | 'red';
  burnRate: number;
  threshold: number;
  message: string;
  timestamp: string;
}

export class BurnRateAlerter {
  private configs: Map<string, BurnRateConfig> = new Map();
  private states: Map<string, BurnRateState> = new Map();
  private alertHistory: BurnRateAlert[] = [];
  private maxAlerts: number;
  private metricBuffer: Map<string, SloMetric[]> = new Map();
  private alertHandlers: Array<(alert: BurnRateAlert) => void> = [];

  constructor(maxAlerts = 1000) {
    this.maxAlerts = maxAlerts;
  }

  registerSlo(config: BurnRateConfig): void {
    this.configs.set(config.sloName, config);
    this.metricBuffer.set(config.sloName, []);

    for (const window of config.windows) {
      const key = this.stateKey(config.sloName, window.name);
      this.states.set(key, {
        sloName: config.sloName,
        windowName: window.name,
        windowDurationMs: window.durationMs,
        totalRequests: 0,
        failedRequests: 0,
        burnRate: 0,
        status: 'green',
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  onAlert(handler: (alert: BurnRateAlert) => void): void {
    this.alertHandlers.push(handler);
  }

  recordMetric(metric: SloMetric): void {
    const buffer = this.metricBuffer.get(metric.name ?? '');
    if (!buffer) return;

    buffer.push(metric);
    const config = this.configs.get(metric.name ?? '');
    if (!config) return;

    const now = Date.now();

    for (const window of config.windows) {
      const cutoff = now - window.durationMs;
      const windowMetrics = buffer.filter((m) => m.timestamp >= cutoff);

      const totalRequests = windowMetrics.length;
      const failedRequests = windowMetrics.filter((m) => !m.success).length;
      const burnRate = totalRequests > 0 ? failedRequests / totalRequests : 0;

      const key = this.stateKey(metric.name || '', window.name);
      const state = this.states.get(key);
      if (!state) continue;

      state.totalRequests = totalRequests;
      state.failedRequests = failedRequests;
      state.burnRate = Math.round(burnRate * 10000) / 100;
      state.lastUpdated = new Date().toISOString();

      let newStatus: 'green' | 'yellow' | 'red' = 'green';
      if (burnRate >= window.criticalThreshold) {
        newStatus = 'red';
      } else if (burnRate >= window.warningThreshold) {
        newStatus = 'yellow';
      }

      if (newStatus !== state.status && newStatus !== 'green') {
        const alert: BurnRateAlert = {
          sloName: metric.name || 'unknown',
          windowName: window.name,
          status: newStatus,
          burnRate: state.burnRate,
          threshold: newStatus === 'red' ? window.criticalThreshold : window.warningThreshold,
          message: `SLO "${metric.name || ''}" burn rate ${state.burnRate}% exceeds ${newStatus} threshold in ${window.name} window`,
          timestamp: new Date().toISOString(),
        };

        this.alertHistory.push(alert);
        if (this.alertHistory.length > this.maxAlerts) {
          this.alertHistory = this.alertHistory.slice(-this.maxAlerts);
        }

        logger.warn('Burn rate alert', alert as unknown as Record<string, unknown>);
        for (const handler of this.alertHandlers) {
          try {
            handler(alert);
          } catch {}
        }
      }

      state.status = newStatus;
    }
  }

  getState(sloName: string, windowName: string): BurnRateState | undefined {
    const key = this.stateKey(sloName, windowName);
    return this.states.get(key);
  }

  getAllStates(): BurnRateState[] {
    return Array.from(this.states.values());
  }

  getAlerts(sloName?: string, since?: Date): BurnRateAlert[] {
    let alerts = this.alertHistory;
    if (sloName) alerts = alerts.filter((a) => a.sloName === sloName);
    if (since) alerts = alerts.filter((a) => new Date(a.timestamp) >= since);
    return alerts;
  }

  getStatusSummary(): Record<string, { status: 'green' | 'yellow' | 'red'; worstBurnRate: number }> {
    const summary: Record<string, { status: 'green' | 'yellow' | 'red'; worstBurnRate: number }> = {};
    for (const [key, state] of this.states) {
      const sloName = key.split('::')[0];
      const existing = summary[sloName];
      const statusOrder = { green: 0, yellow: 1, red: 2 };
      if (!existing || statusOrder[state.status] > statusOrder[existing.status]) {
        summary[sloName] = { status: state.status, worstBurnRate: state.burnRate };
      } else if (existing && state.burnRate > existing.worstBurnRate) {
        existing.worstBurnRate = state.burnRate;
      }
    }
    return summary;
  }

  getWeeklyBurnRate(sloName: string): number {
    const config = this.configs.get(sloName);
    if (!config) return 0;
    const weekWindow = config.windows.find((w) => w.name === 'weekly' || w.durationMs >= 604800000);
    if (!weekWindow) return 0;
    const state = this.getState(sloName, weekWindow.name);
    return state?.burnRate ?? 0;
  }

  isExceedingBudget(sloName: string): boolean {
    const weeklyRate = this.getWeeklyBurnRate(sloName);
    return weeklyRate > 10;
  }

  reset(): void {
    this.states.clear();
    this.alertHistory = [];
    this.metricBuffer.clear();
  }

  private stateKey(sloName: string, windowName: string): string {
    return `${sloName}::${windowName}`;
  }
}
