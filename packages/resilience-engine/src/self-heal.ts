export interface HealthProbe {
  name: string;
  check: () => Promise<ProbeResult>;
  intervalMs: number;
  timeoutMs: number;
  retryCount: number;
}

export interface ProbeResult {
  healthy: boolean;
  latencyMs: number;
  error?: string;
  metrics?: Record<string, number>;
}

export interface HealAction {
  name: string;
  condition: (probes: ProbeResult[]) => boolean;
  heal: () => Promise<HealResult>;
  undo?: () => Promise<HealResult>;
  cooldownMs: number;
}

export interface HealResult {
  success: boolean;
  action: string;
  durationMs: number;
  details?: string;
}

export interface SelfHealConfig {
  probeIntervalMs: number;
  maxConcurrentHeals: number;
  cooldownMs: number;
}

export class SelfHealEngine {
  private probes: HealthProbe[] = [];
  private healActions: HealAction[] = [];
  private lastHealTimes = new Map<string, number>();
  private activeHeals = 0;
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private healLog: Array<{ action: string; result: HealResult; timestamp: string }> = [];
  private config: SelfHealConfig;

  constructor(config?: Partial<SelfHealConfig>) {
    this.config = {
      probeIntervalMs: 30000,
      maxConcurrentHeals: 3,
      cooldownMs: 60000,
      ...config,
    };
  }

  registerProbe(probe: HealthProbe): void {
    this.probes.push(probe);
  }

  registerHealAction(action: HealAction): void {
    this.healActions.push(action);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => this.runCycle(), this.config.probeIntervalMs);
    this.runCycle();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getHealLog(): Array<{ action: string; result: HealResult; timestamp: string }> {
    return [...this.healLog];
  }

  async rollbackAction(actionName: string): Promise<HealResult | null> {
    const action = this.healActions.find(a => a.name === actionName);
    if (!action?.undo) return null;
    const start = Date.now();
    try {
      const result = await action.undo();
      result.durationMs = Date.now() - start;
      this.healLog.push({ action: `undo:${action.name}`, result, timestamp: new Date().toISOString() });
      return result;
    } catch (error) {
      const result: HealResult = { success: false, action: `undo:${action.name}`, durationMs: Date.now() - start, details: String(error) };
      this.healLog.push({ action: `undo:${action.name}`, result, timestamp: new Date().toISOString() });
      return result;
    }
  }

  private async runCycle(): Promise<void> {
    if (!this.running) return;

    const probeResults = await this.runProbes();
    const unhealthyProbes = probeResults.filter(p => !p.healthy);

    if (unhealthyProbes.length === 0) return;

    await this.applyHealActions(probeResults);
  }

  private async runProbes(): Promise<ProbeResult[]> {
    const settled = await Promise.allSettled(this.probes.map(async (probe) => {
      const start = Date.now();
      try {
        const result = await Promise.race([
          probe.check(),
          new Promise<ProbeResult>((_, reject) =>
            setTimeout(() => reject(new Error(`Probe ${probe.name} timeout after ${probe.timeoutMs}ms`)), probe.timeoutMs)
          ),
        ]);
        return { ...result, latencyMs: Date.now() - start };
      } catch (error) {
        return { healthy: false, latencyMs: probe.timeoutMs, error: String(error) };
      }
    }));
    return settled.map(s => s.status === 'fulfilled' ? s.value : { healthy: false, latencyMs: 0, error: s.reason instanceof Error ? s.reason.message : String(s.reason) });
  }

  private async applyHealActions(probeResults: ProbeResult[]): Promise<void> {
    const now = Date.now();
    for (const action of this.healActions) {
      const lastHeal = this.lastHealTimes.get(action.name) ?? 0;
      if (now - lastHeal < action.cooldownMs) continue;
      if (this.activeHeals >= this.config.maxConcurrentHeals) break;
      if (!action.condition(probeResults)) continue;

      this.activeHeals++;
      let healResult: HealResult;
      try {
        const start = Date.now();
        healResult = await action.heal();
        healResult.durationMs = Date.now() - start;
        this.healLog.push({ action: action.name, result: healResult, timestamp: new Date().toISOString() });
        this.lastHealTimes.set(action.name, now);
        if (!healResult.success && action.undo) {
          await action.undo();
          this.healLog.push({ action: `undo:${action.name}`, result: { success: true, action: `undo:${action.name}`, durationMs: 0, details: 'Auto-rollback after failed heal' }, timestamp: new Date().toISOString() });
        }
      } catch {
        healResult = { success: false, action: action.name, durationMs: 0, details: 'heal threw exception' };
        this.healLog.push({
          action: action.name,
          result: healResult,
          timestamp: new Date().toISOString(),
        });
        if (action.undo) {
          try {
            await action.undo();
            this.healLog.push({ action: `undo:${action.name}`, result: { success: true, action: `undo:${action.name}`, durationMs: 0, details: 'Auto-rollback after heal exception' }, timestamp: new Date().toISOString() });
          } catch {}
        }
      } finally {
        this.activeHeals--;
      }
    }
  }
}
