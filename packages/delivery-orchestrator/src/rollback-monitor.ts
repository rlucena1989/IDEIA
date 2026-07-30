export interface MetricSnapshot {
  timestamp: string;
  errorRate: number;
  latencyP99: number;
  healthStatus: boolean;
  incidentCount: number;
}

export interface RollbackRule {
  name: string;
  condition: (snapshot: MetricSnapshot, previous: MetricSnapshot[]) => boolean;
  cooldownMs: number;
  action: 'rollback' | 'alert' | 'pause';
}

export interface RollbackTrigger {
  ruleName: string;
  reason: string;
  triggeredAt: string;
}

export interface RollbackMonitorConfig {
  checkIntervalMs: number;
  metricsWindowSize: number;
  rules: RollbackRule[];
}

const DEFAULT_RULES: RollbackRule[] = [
  {
    name: 'high_error_rate',
    condition: (s) => s.errorRate > 0.1,
    cooldownMs: 120000,
    action: 'rollback',
  },
  {
    name: 'high_latency',
    condition: (s) => s.latencyP99 > 5000,
    cooldownMs: 120000,
    action: 'rollback',
  },
  {
    name: 'health_check_failure',
    condition: (s) => !s.healthStatus,
    cooldownMs: 60000,
    action: 'rollback',
  },
  {
    name: 'incident_spike',
    condition: (s) => s.incidentCount > 3,
    cooldownMs: 180000,
    action: 'alert',
  },
];

export class RollbackMonitor {
  private metricsHistory: Map<string, MetricSnapshot[]> = new Map();
  private lastTriggered: Map<string, number> = new Map();
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private onTrigger: (deployId: string, trigger: RollbackTrigger) => Promise<void>;
  private config: RollbackMonitorConfig;

  constructor(
    onTrigger: (deployId: string, trigger: RollbackTrigger) => Promise<void>,
    config?: Partial<RollbackMonitorConfig>,
  ) {
    this.onTrigger = onTrigger;
    this.config = {
      checkIntervalMs: config?.checkIntervalMs ?? 30000,
      metricsWindowSize: config?.metricsWindowSize ?? 10,
      rules: config?.rules ?? DEFAULT_RULES,
    };
  }

  startMonitoring(deployId: string, initialMetrics?: MetricSnapshot): void {
    this.metricsHistory.set(deployId, initialMetrics ? [initialMetrics] : []);

    const intervalId = setInterval(() => {
      this.evaluate(deployId).catch(() => {});
    }, this.config.checkIntervalMs);

    this.intervals.set(deployId, intervalId);
  }

  stopMonitoring(deployId: string): void {
    const intervalId = this.intervals.get(deployId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(deployId);
    }
    this.metricsHistory.delete(deployId);
    this.lastTriggered.delete(deployId);
  }

  pushMetrics(deployId: string, snapshot: MetricSnapshot): void {
    let history = this.metricsHistory.get(deployId);
    if (!history) {
      history = [];
      this.metricsHistory.set(deployId, history);
    }

    history.push(snapshot);

    while (history.length > this.config.metricsWindowSize) {
      history.shift();
    }
  }

  getHistory(deployId: string): MetricSnapshot[] {
    return [...(this.metricsHistory.get(deployId) ?? [])];
  }

  async checkNow(deployId: string): Promise<void> {
    await this.evaluate(deployId);
  }

  listActive(): string[] {
    return Array.from(this.intervals.keys());
  }

  private async evaluate(deployId: string): Promise<void> {
    const history = this.metricsHistory.get(deployId);
    if (!history || history.length === 0) return;

    const latest = history[history.length - 1];
    if (!latest) return;

    for (const rule of this.config.rules) {
      const lastTrigger = this.lastTriggered.get(`${deployId}:${rule.name}`);
      if (lastTrigger && Date.now() - lastTrigger < rule.cooldownMs) continue;

      if (rule.condition(latest, history)) {
        this.lastTriggered.set(`${deployId}:${rule.name}`, Date.now());

        await this.onTrigger(deployId, {
          ruleName: rule.name,
          reason: `Rule "${rule.name}" triggered at ${latest.timestamp}: errorRate=${latest.errorRate}, latencyP99=${latest.latencyP99}, health=${latest.healthStatus}, incidents=${latest.incidentCount}`,
          triggeredAt: new Date().toISOString(),
        });
      }
    }
  }
}

export function createRollbackMonitor(
  onTrigger: (deployId: string, trigger: RollbackTrigger) => Promise<void>,
  config?: Partial<RollbackMonitorConfig>,
): RollbackMonitor {
  return new RollbackMonitor(onTrigger, config);
}
