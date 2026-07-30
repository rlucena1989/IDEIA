import { createLogger } from '@ideia/logger';
import { EventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { BreakerConfig, BreakerState, BreakerType, BreakerAction } from './types';
import { ErrorRateBreaker } from './breakers/error-rate';
import { ThroughputBreaker } from './breakers/throughput';
import { LatencyBreaker } from './breakers/latency';
import { MemoryBreaker } from './breakers/memory';
import { RollbackRateBreaker } from './breakers/rollback-rate';

export interface BreakerEvaluationResult {
  tripped: boolean;
  breakerType: BreakerType;
  action: BreakerAction;
  currentValue: number;
  threshold: number;
  reason: string;
}

export type DegradationCallback = (breakerType: string, action: string) => void;

export class CircuitBreakerManager {
  private breakers: Map<BreakerType, { config: BreakerConfig; state: BreakerState }>;
  private logger = createLogger('circuit-breaker-manager');
  private bus?: EventBus;
  private audit?: AuditTrail;
  private onDegradation?: DegradationCallback;

  constructor(bus?: EventBus, audit?: AuditTrail, configs?: BreakerConfig[], degradationCallback?: DegradationCallback) {
    this.bus = bus;
    this.audit = audit;
    this.onDegradation = degradationCallback;
    this.breakers = new Map();

    const defaults: BreakerConfig[] = [
      { type: 'error-rate', enabled: true, threshold: 10, cooldownMs: 300000, action: 'stop' },
      { type: 'throughput', enabled: true, threshold: 50, cooldownMs: 300000, action: 'throttle' },
      { type: 'latency', enabled: true, threshold: 10000, cooldownMs: 60000, action: 'throttle' },
      { type: 'memory', enabled: true, threshold: 80, cooldownMs: 120000, action: 'alert' },
      { type: 'rollback-rate', enabled: true, threshold: 2, cooldownMs: 3600000, action: 'stop' },
    ];

    const merged = defaults.map(def => {
      const custom = configs?.find(c => c.type === def.type);
      return custom ?? def;
    });

    for (const cfg of merged) {
      this.breakers.set(cfg.type, {
        config: cfg,
        state: this.initialState(cfg),
      });
    }
  }

  private initialState(config: BreakerConfig): BreakerState {
    return {
      type: config.type,
      tripped: false,
      trippedAt: null,
      currentValue: 0,
      threshold: config.threshold,
      cooldownUntil: null,
      action: config.action,
    };
  }

  async evaluateAll(): Promise<BreakerEvaluationResult[]> {
    const results: BreakerEvaluationResult[] = [];

    const errorRateResult = await this.evaluateErrorRate();
    if (errorRateResult) results.push(errorRateResult);

    const throughputResult = await this.evaluateThroughput();
    if (throughputResult) results.push(throughputResult);

    const latencyResult = await this.evaluateLatency();
    if (latencyResult) results.push(latencyResult);

    const memoryResult = await this.evaluateMemory();
    if (memoryResult) results.push(memoryResult);

    const rollbackResult = await this.evaluateRollbackRate();
    if (rollbackResult) results.push(rollbackResult);

    await this.emitResults(results);
    return results;
  }

  async evaluateSingle(type: BreakerType, currentValue: number): Promise<BreakerEvaluationResult> {
    const entry = this.breakers.get(type);
    if (!entry || !entry.config.enabled) {
      return {
        tripped: false,
        breakerType: type,
        action: 'alert',
        currentValue,
        threshold: entry?.config.threshold ?? 0,
        reason: 'Breaker disabled or not found',
      };
    }

    const { config, state } = entry;

    if (state.tripped && state.cooldownUntil && Date.now() < state.cooldownUntil) {
      return {
        tripped: true,
        breakerType: type,
        action: config.action,
        currentValue,
        threshold: config.threshold,
        reason: `Breaker ${type} in cooldown until ${new Date(state.cooldownUntil).toISOString()}`,
      };
    }

    if (state.tripped && state.cooldownUntil && Date.now() >= state.cooldownUntil) {
      this.resetBreaker(type);
    }

    if (currentValue >= config.threshold) {
      return this.tripBreaker(type, currentValue);
    }

    state.currentValue = currentValue;
    return {
      tripped: false,
      breakerType: type,
      action: 'alert',
      currentValue,
      threshold: config.threshold,
      reason: `Breaker ${type}: ${currentValue} < threshold ${config.threshold}`,
    };
  }

  private async evaluateErrorRate(): Promise<BreakerEvaluationResult | null> {
    try {
      const errorRate = ErrorRateBreaker.evaluate();
      return this.evaluateSingle('error-rate', errorRate);
    } catch (err) {
      this.logger.error('Error evaluating error rate breaker', { error: String(err) });
      return null;
    }
  }

  private async evaluateThroughput(): Promise<BreakerEvaluationResult | null> {
    try {
      const throughput = ThroughputBreaker.evaluate();
      return this.evaluateSingle('throughput', throughput);
    } catch (err) {
      this.logger.error('Error evaluating throughput breaker', { error: String(err) });
      return null;
    }
  }

  private async evaluateLatency(): Promise<BreakerEvaluationResult | null> {
    try {
      const latency = LatencyBreaker.evaluate();
      return this.evaluateSingle('latency', latency);
    } catch (err) {
      this.logger.error('Error evaluating latency breaker', { error: String(err) });
      return null;
    }
  }

  private async evaluateMemory(): Promise<BreakerEvaluationResult | null> {
    try {
      const memory = MemoryBreaker.evaluate();
      return this.evaluateSingle('memory', memory);
    } catch (err) {
      this.logger.error('Error evaluating memory breaker', { error: String(err) });
      return null;
    }
  }

  private async evaluateRollbackRate(): Promise<BreakerEvaluationResult | null> {
    try {
      const rollbackRate = RollbackRateBreaker.evaluate();
      return this.evaluateSingle('rollback-rate', rollbackRate);
    } catch (err) {
      this.logger.error('Error evaluating rollback rate breaker', { error: String(err) });
      return null;
    }
  }

  private tripBreaker(type: BreakerType, currentValue: number): BreakerEvaluationResult {
    const entry = this.breakers.get(type);
    if (!entry) {
      throw new Error(`Unknown breaker type: ${type}`);
    }

    const { config, state } = entry;
    state.tripped = true;
    state.trippedAt = Date.now();
    state.currentValue = currentValue;
    state.cooldownUntil = Date.now() + config.cooldownMs;

    const result: BreakerEvaluationResult = {
      tripped: true,
      breakerType: type,
      action: config.action,
      currentValue,
      threshold: config.threshold,
      reason: `Breaker ${type} tripped: ${currentValue} >= threshold ${config.threshold}, action: ${config.action}`,
    };

    this.logger.warn(result.reason);

    if (this.onDegradation) {
      this.onDegradation(type, config.action);
    }

    if (this.audit) {
      this.audit.append({
        actor: 'system',
        eventType: `breaker.tripped.${type}`,
        target: `circuit-breaker/${type}`,
        decision: 'rejected',
        result: 'success',
        metadata: result as unknown as Record<string, unknown>,
      });
    }

    return result;
  }

  resetBreaker(type: BreakerType): void {
    const entry = this.breakers.get(type);
    if (!entry) return;

    entry.state.tripped = false;
    entry.state.trippedAt = null;
    entry.state.cooldownUntil = null;
    this.logger.info(`Breaker ${type} reset`);
  }

  resetAll(): void {
    for (const [type] of this.breakers) {
      this.resetBreaker(type);
    }
  }

  updateConfig(config: BreakerConfig): void {
    const entry = this.breakers.get(config.type);
    if (entry) {
      entry.config = config;
      entry.state.threshold = config.threshold;
      this.logger.info(`Breaker ${config.type} config updated`);
    }
  }

  getStates(): BreakerState[] {
    return Array.from(this.breakers.values()).map(e => ({ ...e.state }));
  }

  getConfigs(): BreakerConfig[] {
    return Array.from(this.breakers.values()).map(e => ({ ...e.config }));
  }

  private async emitResults(results: BreakerEvaluationResult[]): Promise<void> {
    if (!this.bus) return;

    const tripped = results.filter(r => r.tripped);

    if (tripped.length > 0) {
      await this.bus.emit({
        type: 'breaker.tripped',
        source: 'circuit-breaker-manager',
        payload: { results: tripped },
      });
    }

    await this.bus.emit({
      type: 'breaker.evaluated',
      source: 'circuit-breaker-manager',
      payload: { count: results.length, tripped: tripped.length },
    });
  }
}
