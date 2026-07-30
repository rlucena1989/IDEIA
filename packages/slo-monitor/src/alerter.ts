import { SloMonitor } from './slo-monitor';
import { SloViolation, SloResult } from './types';
import { createLogger } from '@ideia/logger';

const log = createLogger('slo:alerter');

export interface AlertRule {
  contract: string;
  checkIntervalMs: number;
  consecutiveFailures: number;
  notifyChannels: string[];
}

export interface AlertEvent {
  id: string;
  contract: string;
  severity: string;
  message: string;
  violations: SloViolation[];
  triggeredAt: number;
  acknowledged: boolean;
}

export interface AlerterConfig {
  defaultNotifyChannels?: string[];
  globalCheckIntervalMs?: number;
  eventBus?: { emit(event: { type: string; source: string; payload: Record<string, unknown> }): Promise<void> };
}

export class SloAlerter {
  private monitor: SloMonitor;
  private rules: Map<string, AlertRule> = new Map();
  private consecutiveCounts: Map<string, number> = new Map();
  private alertHistory: AlertEvent[] = [];
  private defaultNotifyChannels: string[];
  private globalCheckIntervalMs: number;
  private eventBus: { emit(event: { type: string; source: string; payload: Record<string, unknown> }): Promise<void> } | undefined;
  private checkTimer: ReturnType<typeof setInterval> | null = null;

  constructor(monitor: SloMonitor, config?: AlerterConfig) {
    this.monitor = monitor;
    this.defaultNotifyChannels = config?.defaultNotifyChannels ?? ['console'];
    this.globalCheckIntervalMs = config?.globalCheckIntervalMs ?? 60000;
    this.eventBus = config?.eventBus;
  }

  addRule(rule: AlertRule): void {
    this.rules.set(rule.contract, rule);
    this.consecutiveCounts.set(rule.contract, 0);
  }

  removeRule(contract: string): void {
    this.rules.delete(contract);
    this.consecutiveCounts.delete(contract);
  }

  start(): void {
    if (this.checkTimer) return;
    this.checkTimer = setInterval(() => this.checkAll(), this.globalCheckIntervalMs);
    log.info('SLO Alerter started', { intervalMs: this.globalCheckIntervalMs });
  }

  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    log.info('SLO Alerter stopped');
  }

  checkNow(contract: string): AlertEvent | null {
    const rule = this.rules.get(contract);
    if (!rule) return null;
    const result = this.monitor.checkSLO(contract);
    return this.evaluateRule(rule, result);
  }

  getAlertHistory(): AlertEvent[] {
    return [...this.alertHistory];
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (!alert) return false;
    alert.acknowledged = true;
    return true;
  }

  private checkAll(): void {
    for (const [contract, rule] of this.rules) {
      const result = this.monitor.checkSLO(contract);
      this.evaluateRule(rule, result);
    }
  }

  private evaluateRule(rule: AlertRule, result: SloResult): AlertEvent | null {
    const isViolated = result.status === 'violated' || result.status === 'degraded';
    const prevCount = this.consecutiveCounts.get(rule.contract) ?? 0;

    if (isViolated) {
      const newCount = prevCount + 1;
      this.consecutiveCounts.set(rule.contract, newCount);

      if (newCount >= rule.consecutiveFailures) {
        const violations = this.monitor.getViolations().filter(v => v.contract === rule.contract);
        const event: AlertEvent = {
          id: `slo-alert-${Date.now()}-${rule.contract}`,
          contract: rule.contract,
          severity: result.status === 'violated' ? 'critical' : 'warning',
          message: `SLO violation for ${rule.contract}: ${result.violations.join(', ')}`,
          violations: violations.slice(0, 10),
          triggeredAt: Date.now(),
          acknowledged: false,
        };

        this.alertHistory.push(event);
        if (this.alertHistory.length > 100) this.alertHistory.shift();
        this.notify(event);
        return event;
      }
    } else {
      this.consecutiveCounts.set(rule.contract, 0);
    }

    return null;
  }

  private async notify(event: AlertEvent): Promise<void> {
    log.warn('SLO Alert triggered', { contract: event.contract, severity: event.severity, message: event.message });
    if (this.eventBus) {
      try {
        await this.eventBus.emit({
          type: 'slo:alert',
          source: 'slo-alerter',
          payload: {
            contract: event.contract,
            severity: event.severity,
            message: event.message,
            violations: event.violations,
            triggeredAt: event.triggeredAt,
          },
        });
      } catch (err) {
        // error handled
      }
    }
  }
}

export function createSloAlerter(monitor: SloMonitor, config?: AlerterConfig): SloAlerter {
  return new SloAlerter(monitor, config);
}
