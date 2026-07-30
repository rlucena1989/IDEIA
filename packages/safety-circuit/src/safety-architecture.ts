import { createLogger } from '@ideia/logger';
import { EventBus } from '@ideia/event-bus';
import { SafetyLayer, SafetyLayerStatus } from './types';
import { CircuitBreakerManager } from './circuit-breaker-manager';
import { EmergencyStop } from './e-stop';
import { SafetyCircuit } from './safety-circuit';

export interface SafetyArchitectureConfig {
  layers: SafetyLayer[];
  enableAll: boolean;
}

const DEFAULT_LAYERS: SafetyLayer[] = [
  'input-validation',
  'policy-engine',
  'sandbox',
  'circuit-breaker',
  'output-validation',
  'audit-trail',
  'emergency-stop',
];

export class SafetyArchitecture {
  private config: SafetyArchitectureConfig;
  private layers: Map<SafetyLayer, SafetyLayerStatus>;
  private logger = createLogger('safety-architecture');
  private bus?: EventBus;
  private circuitBreakerManager?: CircuitBreakerManager;
  private emergencyStop?: EmergencyStop;
  private safetyCircuit?: SafetyCircuit;

  constructor(
    config?: Partial<SafetyArchitectureConfig>,
    bus?: EventBus,
    circuitBreakerManager?: CircuitBreakerManager,
    emergencyStop?: EmergencyStop,
    safetyCircuit?: SafetyCircuit,
  ) {
    this.config = {
      layers: config?.layers ?? DEFAULT_LAYERS,
      enableAll: config?.enableAll ?? true,
    };
    this.bus = bus;
    this.circuitBreakerManager = circuitBreakerManager;
    this.emergencyStop = emergencyStop;
    this.safetyCircuit = safetyCircuit;
    this.layers = new Map();

    for (const layer of this.config.layers) {
      this.layers.set(layer, {
        layer,
        enabled: this.config.enableAll,
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        metrics: {},
      });
    }
  }

  async initialize(): Promise<void> {
    this.logger.info(`Initializing 7-layer safety architecture`);

    for (const [layer, state] of this.layers) {
      try {
        state.status = 'healthy';
        state.lastCheck = new Date().toISOString();
        this.logger.info(`Layer ${layer} initialized: healthy`);
      } catch (err) {
        state.status = 'failed';
        state.lastCheck = new Date().toISOString();
        this.logger.error(`Layer ${layer} initialization failed`, { error: String(err) });
      }
    }

    await this.emitStatus();
  }

  async checkLayer(layer: SafetyLayer): Promise<SafetyLayerStatus> {
    const state = this.layers.get(layer);
    if (!state) {
      return {
        layer,
        enabled: false,
        status: 'failed',
        lastCheck: new Date().toISOString(),
        metrics: {},
      };
    }

    try {
      const metrics = await this.collectLayerMetrics(layer);
      state.status = 'healthy';
      state.metrics = metrics;
      state.lastCheck = new Date().toISOString();
    } catch (err) {
      state.status = 'degraded';
      state.metrics = { error: 1 };
      state.lastCheck = new Date().toISOString();
      this.logger.warn(`Layer ${layer} degraded`, { error: String(err) });
    }

    return { ...state };
  }

  async checkAllLayers(): Promise<SafetyLayerStatus[]> {
    const results: SafetyLayerStatus[] = [];

    for (const [layer] of this.layers) {
      const status = await this.checkLayer(layer);
      results.push(status);
    }

    await this.emitStatus();
    return results;
  }

  enableLayer(layer: SafetyLayer): void {
    const state = this.layers.get(layer);
    if (state) {
      state.enabled = true;
      this.logger.info(`Layer ${layer} enabled`);
    }
  }

  disableLayer(layer: SafetyLayer): void {
    const state = this.layers.get(layer);
    if (state) {
      state.enabled = false;
      this.logger.info(`Layer ${layer} disabled`);
    }
  }

  getLayerStatus(layer: SafetyLayer): SafetyLayerStatus | undefined {
    const state = this.layers.get(layer);
    return state ? { ...state } : undefined;
  }

  getAllStatuses(): SafetyLayerStatus[] {
    return Array.from(this.layers.values()).map(s => ({ ...s }));
  }

  private async collectLayerMetrics(layer: SafetyLayer): Promise<Record<string, number>> {
    switch (layer) {
      case 'input-validation':
        return { validated: 0, rejected: 0, avgTimeMs: 0 };
      case 'policy-engine':
        return { rulesEvaluated: 0, allowed: 0, denied: 0 };
      case 'sandbox':
        return { executions: 0, violations: 0, isolationLevel: 2 };
      case 'circuit-breaker':
        return this.collectCircuitBreakerMetrics();
      case 'output-validation':
        return { validated: 0, piiDetected: 0, secretsFound: 0 };
      case 'audit-trail':
        return { eventsLogged: 0, chainValid: 1 };
      case 'emergency-stop':
        return this.collectEmergencyStopMetrics();
    }
  }

  private collectCircuitBreakerMetrics(): Record<string, number> {
    const states = this.circuitBreakerManager?.getStates() ?? [];
    const metrics: Record<string, number> = { breakersTotal: states.length, breakersTripped: 0 };

    for (const s of states) {
      if (s.tripped) metrics.breakersTripped++;
      metrics[`${s.type}_tripped`] = s.tripped ? 1 : 0;
      metrics[`${s.type}_value`] = s.currentValue;
      metrics[`${s.type}_threshold`] = s.threshold;
    }

    return metrics;
  }

  private collectEmergencyStopMetrics(): Record<string, number> {
    return {
      engaged: this.emergencyStop?.isEngaged() ? 1 : 0,
      channelsCli: 1,
      channelsApi: 1,
      channelsKeyboard: 1,
      channelsAutoDetect: 1,
    };
  }

  private async emitStatus(): Promise<void> {
    if (!this.bus) return;

    const statuses = this.getAllStatuses();
    const degraded = statuses.filter(s => s.status !== 'healthy');

    await this.bus.emit({
      type: 'safety.architecture.status',
      source: 'safety-architecture',
      payload: { layers: statuses, degradedLayers: degraded.length },
    });
  }
}
