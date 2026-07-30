import { EventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { ControlTower } from '@ideia/control-tower';
import { SafetyCircuit } from '@ideia/safety-circuit';
import { DegradationManager } from '@ideia/resilience-engine';
import { createLogger } from '@ideia/logger';

import { ResourceMonitor } from './monitor';
import { SelfHealer } from './self-healing';
import {
  ResourceManagerConfig,
  DEFAULT_CONFIG,
  DegradationTrigger,
  ResourceSnapshot,
} from './types';

const log = createLogger('resource-manager');

export class ResourceManager {
  private monitor: ResourceMonitor;
  private healer: SelfHealer;
  private config: ResourceManagerConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private lastTrigger: DegradationTrigger | null = null;
  private totalActionsTaken = 0;

  constructor(
    private eventBus?: EventBus,
    private auditTrail?: AuditTrail,
    private controlTower?: ControlTower,
    private safetyCircuit?: SafetyCircuit,
    private degradation?: DegradationManager,
    config?: Partial<ResourceManagerConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.monitor = new ResourceMonitor(this.config.memoryTrendSampleSize, this.config.memoryTrendWindowMs);
    this.healer = new SelfHealer(this.config.selfHealing);
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    log.info('Resource manager started');
    this.emitEvent('resource-manager.started', {});
    await this.cycle();
    this.scheduleNextCycle();
  }

  stop(): void {
    this.running = false;
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    log.info('Resource manager stopped');
    this.emitEvent('resource-manager.stopped', {});
  }

  private scheduleNextCycle(): void {
    if (!this.running) return;
    this.intervalId = setTimeout(async () => {
      try {
        await this.cycle();
      } catch (err) {
        log.error('Resource management cycle failed', { error: (err as Error).message });
      }
      this.scheduleNextCycle();
    }, this.config.monitorIntervalMs);
  }

  private async cycle(): Promise<void> {
    const snapshot = this.takeSnapshot();
    const budgetCheck = this.monitor.checkBudget(this.config.budget);

    if (!budgetCheck.ok) {
      this.lastTrigger = { reason: 'budget_violation', targetMode: 'degraded', metric: 'budget', value: budgetCheck.violations.length, threshold: 0 };
      log.warn('Budget violations detected', { violations: budgetCheck.violations, snapshot });
      await this.handleBudgetViolations(snapshot, budgetCheck.violations);
    }

    const memoryTrend = this.monitor.analyzeMemoryTrend();
    if (memoryTrend.isLeaking && memoryTrend.leakRateMBperMin > this.config.leakDetectionThreshold) {
      this.lastTrigger = { reason: 'memory_leak', targetMode: 'degraded', metric: 'memory', value: memoryTrend.leakRateMBperMin, threshold: this.config.leakDetectionThreshold };
      log.warn('Memory leak trend detected', { leakRateMBperMin: memoryTrend.leakRateMBperMin, snapshot });
      await this.handleMemoryLeak(memoryTrend);
    }

    this.handleAutoDegradation(snapshot);
    this.updateControlTowerHealth(snapshot);
  }

  private takeSnapshot(): ResourceSnapshot {
    return this.monitor.snapshot();
  }

  private updateControlTowerHealth(
    snapshot: ResourceSnapshot,
  ): void {
    if (!this.controlTower) return;
    const violations = this.monitor.checkBudget(this.config.budget);
    const memoryTrend = this.monitor.analyzeMemoryTrend();
    log.info('Control tower health update', {
      budgetOk: violations.ok,
      isLeaking: memoryTrend.isLeaking,
      memoryUsage: snapshot.memory.processHeapUsedMB,
      cpuUsage: snapshot.cpu.percentEstimate,
    });
  }

  private async handleBudgetViolations(snapshot: ResourceSnapshot, violations: string[]): Promise<void> {
    log.warn('Handling budget violations', { violations });

    if (this.config.autoDegrade && this.degradation) {
      this.degradation.setMode('degraded');
    }

    if (this.safetyCircuit) {
      await this.tripSafetyCircuit({
        reason: 'budget_violation',
        targetMode: 'degraded',
        metric: 'budget',
        value: violations.length,
        threshold: 0,
      });
    }

    if (this.config.selfHealing.enabled) {
      await this.triggerSelfHealing('clear_cache', 'resource-manager');
    }
  }

  private async handleMemoryLeak(trend: ReturnType<ResourceMonitor['analyzeMemoryTrend']>): Promise<void> {
    if (this.config.selfHealing.enabled) {
      await this.triggerSelfHealing('clear_cache', 'resource-manager');
    }

    if (trend.leakRateMBperMin > this.config.leakDetectionThreshold * 2 && this.safetyCircuit) {
      await this.tripSafetyCircuit({
        reason: 'critical_memory_leak',
        targetMode: 'emergency' as const,
        metric: 'memory',
        value: trend.leakRateMBperMin,
        threshold: this.config.leakDetectionThreshold * 2,
      });
    }
  }

  private handleAutoDegradation(
    snapshot: ResourceSnapshot,
  ): void {
    if (!this.config.autoDegrade || !this.degradation) return;

    if (snapshot.memory.usedPercent > 95 || snapshot.cpu.percentEstimate > 95) {
      this.degradation.setMode('emergency');
    } else if (snapshot.memory.usedPercent > 80 || snapshot.cpu.percentEstimate > 90) {
      this.degradation.setMode('degraded');
    }
  }

  private async tripSafetyCircuit(trigger: DegradationTrigger): Promise<void> {
    if (!this.safetyCircuit) return;
    this.lastTrigger = trigger;
    log.warn('Tripping safety circuit', { trigger });
    await this.safetyCircuit.evaluate({ type: 'resource-exhaustion', details: `Resource manager triggered: ${trigger.reason}`, metadata: { trigger } });
    this.emitEvent('resource-manager.safety-trip', { trigger });
  }

  private async triggerSelfHealing(action: string, target: string): Promise<void> {
    const typedAction = action as import('./types').SelfHealingConfig['actions'][number];
    const result = await this.healer.executeAction(typedAction, target);
    if (result.ok) {
      this.totalActionsTaken++;
      log.info('Self-healing action executed', { action, target, result: result.message });
      this.emitEvent('resource-manager.self-heal', { action, target, message: result.message });
    }
  }

  private emitEvent(type: string, payload: Record<string, unknown>): void {
    if (this.eventBus) {
      try {
        this.eventBus.emit({ type, source: 'resource-manager', payload }).catch(() => {});
      } catch {}
    }
  }

  private audit(eventType: string, details: string): void {
    if (this.auditTrail) {
      try {
        this.auditTrail.append({
          actor: 'system',
          eventType,
          target: 'resource-manager',
          decision: 'approved',
          result: 'success',
          metadata: { details },
        });
      } catch {}
    }
  }

  getConfig(): ResourceManagerConfig {
    return { ...this.config };
  }

  getTotalActions(): number {
    return this.totalActionsTaken;
  }

  getLastTrigger(): DegradationTrigger | null {
    return this.lastTrigger;
  }

  isRunning(): boolean {
    return this.running;
  }

  updateConfig(cfg: Partial<ResourceManagerConfig>): void {
    this.config = { ...this.config, ...cfg };
    this.monitor = new ResourceMonitor(this.config.memoryTrendSampleSize, this.config.memoryTrendWindowMs);
    this.healer = new SelfHealer(this.config.selfHealing);
  }

  getStatus(): {
    running: boolean;
    config: ResourceManagerConfig;
    lastSnapshot: ResourceSnapshot | null;
    memoryTrend: ReturnType<ResourceMonitor['analyzeMemoryTrend']>;
    budgetOk: boolean;
    budgetViolations: string[];
    degradationMode: string;
    totalActions: number;
    lastTrigger: DegradationTrigger | null;
  } {
    const snapshot = this.monitor.getLastSnapshot();
    const budgetCheck = snapshot ? this.monitor.checkBudget(this.config.budget) : { ok: true, violations: [] as string[] };

    return {
      running: this.running,
      config: this.config,
      lastSnapshot: snapshot,
      memoryTrend: this.monitor.analyzeMemoryTrend(),
      budgetOk: budgetCheck.ok,
      budgetViolations: budgetCheck.violations,
      degradationMode: this.degradation?.mode ?? 'unknown',
      totalActions: this.totalActionsTaken,
      lastTrigger: this.lastTrigger,
    };
  }
}

export function createResourceManager(
  eventBus?: EventBus,
  auditTrail?: AuditTrail,
  controlTower?: ControlTower,
  safetyCircuit?: SafetyCircuit,
  degradation?: DegradationManager,
  config?: Partial<ResourceManagerConfig>,
): ResourceManager {
  return new ResourceManager(eventBus, auditTrail, controlTower, safetyCircuit, degradation, config);
}
