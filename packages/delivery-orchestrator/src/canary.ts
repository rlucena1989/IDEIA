import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { DeployEnvironment } from './types';

export type CanaryStep = 'verify' | '10_percent' | '50_percent' | '100_percent';

export interface CanaryConfig {
  enabled: boolean;
  steps: CanaryStep[];
  cooldownMs: number;
  healthCheckEndpoint: string;
  healthCheckTimeoutMs: number;
  autoPromote: boolean;
  autoRollbackOnFailure: boolean;
}

export interface CanaryState {
  deployId: string;
  version: string;
  environment: DeployEnvironment;
  config: CanaryConfig;
  currentStep: CanaryStep;
  stepResults: CanaryStepResult[];
  status: 'running' | 'promoted' | 'rolled_back' | 'failed';
  startedAt: string;
  completedAt?: string;
}

export interface CanaryStepResult {
  step: CanaryStep;
  weight: number;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  durationMs: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

const STEPS_WEIGHT: Record<CanaryStep, number> = {
  verify: 0,
  '10_percent': 10,
  '50_percent': 50,
  '100_percent': 100,
};

const DEFAULT_CANARY_CONFIG: CanaryConfig = {
  enabled: true,
  steps: ['verify', '10_percent', '50_percent', '100_percent'],
  cooldownMs: 60000,
  healthCheckEndpoint: 'http://localhost:3000/health',
  healthCheckTimeoutMs: 10000,
  autoPromote: true,
  autoRollbackOnFailure: true,
};

export class CanaryDeployer {
  private activeCanaries: Map<string, CanaryState> = new Map();
  private config: CanaryConfig;

  constructor(config?: Partial<CanaryConfig>) {
    this.config = { ...DEFAULT_CANARY_CONFIG, ...config };
  }

  setConfig(config: Partial<CanaryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): CanaryConfig {
    return { ...this.config };
  }

  async startCanary(version: string, environment: DeployEnvironment): Promise<CanaryState> {
    if (!this.config.enabled) {
      return {
        deployId: randomUUID(), version, environment, config: this.config,
        currentStep: '100_percent', stepResults: [], status: 'promoted',
        startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
      };
    }

    if (environment !== 'production') {
      const state: CanaryState = {
        deployId: randomUUID(), version, environment, config: this.config,
        currentStep: '100_percent', stepResults: [], status: 'promoted',
        startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
      };
      this.activeCanaries.set(state.deployId, state);
      return state;
    }

    const state: CanaryState = {
      deployId: randomUUID(), version, environment, config: this.config,
      currentStep: this.config.steps[0],
      stepResults: [], status: 'running',
      startedAt: new Date().toISOString(),
    };

    this.activeCanaries.set(state.deployId, state);
    this.runCanaryPipeline(state).catch(() => {});
    return state;
  }

  private async runCanaryPipeline(state: CanaryState): Promise<void> {
    for (const step of this.config.steps) {
      if (state.status !== 'running') break;

      state.currentStep = step;
      const weight = STEPS_WEIGHT[step];
      const result = await this.executeStep(state, step, weight);
      state.stepResults.push(result);

      if (result.status === 'failed') {
        if (this.config.autoRollbackOnFailure) {
          state.status = 'rolled_back';
          state.completedAt = new Date().toISOString();
        } else {
          state.status = 'failed';
          state.completedAt = new Date().toISOString();
        }
        return;
      }

      if (step !== this.config.steps[this.config.steps.length - 1]) {
        await this.delay(this.config.cooldownMs);
      }
    }

    if (state.status === 'running') {
      state.status = 'promoted';
      state.completedAt = new Date().toISOString();
    }
  }

  private async executeStep(
    state: CanaryState, step: CanaryStep, weight: number
  ): Promise<CanaryStepResult> {
    const startedAt = new Date().toISOString();
    const start = Date.now();

    try {
      const healthOk = await this.checkHealth();
      if (!healthOk) {
        return {
          step, weight, status: 'failed', durationMs: Date.now() - start,
          error: 'Health check failed before canary step', startedAt,
          completedAt: new Date().toISOString(),
        };
      }

      return {
        step, weight, status: 'passed', durationMs: Date.now() - start,
        startedAt, completedAt: new Date().toISOString(),
      };
    } catch (_err) {
      return {
        step, weight, status: 'failed', durationMs: Date.now() - start,
        error: String(_err), startedAt, completedAt: new Date().toISOString(),
      };
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(this.config.healthCheckEndpoint, {
        signal: AbortSignal.timeout(this.config.healthCheckTimeoutMs),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  promote(deployId: string): boolean {
    const state = this.activeCanaries.get(deployId);
    if (!state || state.status !== 'running') return false;
    state.status = 'promoted';
    state.completedAt = new Date().toISOString();
    return true;
  }

  rollback(deployId: string): boolean {
    const state = this.activeCanaries.get(deployId);
    if (!state || state.status !== 'running') return false;
    state.status = 'rolled_back';
    state.completedAt = new Date().toISOString();
    return true;
  }

  getState(deployId: string): CanaryState | undefined {
    return this.activeCanaries.get(deployId);
  }

  listActive(): CanaryState[] {
    return Array.from(this.activeCanaries.values())
      .filter(s => s.status === 'running');
  }

  listCompleted(): CanaryState[] {
    return Array.from(this.activeCanaries.values())
      .filter(s => s.status !== 'running');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function createCanaryDeployer(config?: Partial<CanaryConfig>): CanaryDeployer {
  return new CanaryDeployer(config);
}
