import { createLogger } from '@ideia/logger';

const logger = createLogger('resilience-v2:error-budget-slo');

export interface SloDefinition {
  name: string;
  targetPercent: number;
  windowMs: number;
}

export interface ErrorBudgetState {
  slo: SloDefinition;
  totalBudgetMs: number;
  consumedMs: number;
  remainingMs: number;
  burnRate: number;
  status: 'green' | 'yellow' | 'red';
  lastReset: Date;
  nextReset: Date;
}

export interface BurnRateAlert {
  slo: string;
  status: 'green' | 'yellow' | 'red';
  consumption: number;
  message: string;
}

const DEFAULT_SLOS: SloDefinition[] = [
  { name: 'llm-inference-availability', targetPercent: 99.5, windowMs: 30 * 24 * 3600 * 1000 },
  { name: 'event-bus-availability', targetPercent: 99.9, windowMs: 30 * 24 * 3600 * 1000 },
  { name: 'editor-responsiveness', targetPercent: 99.8, windowMs: 30 * 24 * 3600 * 1000 },
  { name: 'filesystem-operations', targetPercent: 99.9, windowMs: 30 * 24 * 3600 * 1000 },
  { name: 'agent-execution-success', targetPercent: 99.0, windowMs: 30 * 24 * 3600 * 1000 },
];

export class ErrorBudgetSloEngine {
  private slos: SloDefinition[];
  private states = new Map<string, ErrorBudgetState>();
  private failureLog: Array<{ slo: string; timestamp: number; durationMs: number }> = [];
  private maxLogSize = 100000;

  constructor(slos?: SloDefinition[]) {
    this.slos = slos || DEFAULT_SLOS;
    for (const slo of this.slos) {
      this.initializeState(slo);
    }
  }

  getSlos(): SloDefinition[] {
    return [...this.slos];
  }

  addSlo(slo: SloDefinition): void {
    this.slos.push(slo);
    this.initializeState(slo);
  }

  recordFailure(sloName: string, durationMs: number): void {
    const state = this.states.get(sloName);
    if (!state) {
      logger.warn('Unknown SLO for failure recording', { slo: sloName });
      return;
    }

    this.failureLog.push({ slo: sloName, timestamp: Date.now(), durationMs });
    if (this.failureLog.length > this.maxLogSize) this.failureLog.shift();

    state.consumedMs += durationMs;
    this.updateState(state);

    const alert = this.evaluateBurnRate(state);
    if (alert.status !== 'green') {
      logger.warn('Error budget alert', { slo: sloName, status: alert.status, consumption: alert.consumption });
    }
  }

  recordSuccess(sloName: string): void {
    const state = this.states.get(sloName);
    if (!state) return;
    this.updateState(state);
  }

  getState(sloName: string): ErrorBudgetState | undefined {
    const state = this.states.get(sloName);
    if (!state) return undefined;
    this.checkReset(state);
    this.updateState(state);
    return { ...state };
  }

  getAllStates(): ErrorBudgetState[] {
    const states: ErrorBudgetState[] = [];
    for (const slo of this.slos) {
      const state = this.getState(slo.name);
      if (state) states.push(state);
    }
    return states;
  }

  evaluateBurnRate(state: ErrorBudgetState): BurnRateAlert {
    const consumption = state.totalBudgetMs > 0 ? state.consumedMs / state.totalBudgetMs : 0;
    let status: 'green' | 'yellow' | 'red';
    let message: string;

    if (consumption > 0.8) {
      status = 'red';
      message = `Error budget ${state.slo.name} critically depleted (${(consumption * 100).toFixed(1)}%)`;
    } else if (consumption > 0.5) {
      status = 'yellow';
      message = `Error budget ${state.slo.name} partially depleted (${(consumption * 100).toFixed(1)}%)`;
    } else {
      status = 'green';
      message = `Error budget ${state.slo.name} healthy (${(consumption * 100).toFixed(1)}%)`;
    }

    return { slo: state.slo.name, status, consumption, message };
  }

  getFailureLog(sloName?: string, since?: number): Array<{ slo: string; timestamp: number; durationMs: number }> {
    let entries = this.failureLog;
    if (sloName) entries = entries.filter(e => e.slo === sloName);
    if (since) entries = entries.filter(e => e.timestamp >= since);
    return entries;
  }

  resetAll(): void {
    for (const slo of this.slos) {
      this.initializeState(slo);
    }
    logger.info('All error budgets reset');
  }

  private initializeState(slo: SloDefinition): void {
    const totalBudgetMs = Math.round(slo.windowMs * (1 - slo.targetPercent / 100));
    const now = Date.now();
    this.states.set(slo.name, {
      slo,
      totalBudgetMs,
      consumedMs: 0,
      remainingMs: totalBudgetMs,
      burnRate: 0,
      status: 'green',
      lastReset: new Date(now),
      nextReset: new Date(now + slo.windowMs),
    });
  }

  private checkReset(state: ErrorBudgetState): void {
    if (Date.now() >= state.nextReset.getTime()) {
      state.consumedMs = 0;
      state.lastReset = new Date();
      state.nextReset = new Date(Date.now() + state.slo.windowMs);
      state.burnRate = 0;
      state.status = 'green';
    }
  }

  private updateState(state: ErrorBudgetState): void {
    this.checkReset(state);
    state.remainingMs = Math.max(0, state.totalBudgetMs - state.consumedMs);
    state.burnRate = state.totalBudgetMs > 0
      ? Math.round((state.consumedMs / state.totalBudgetMs) * 10000) / 100
      : 0;
    state.status = this.evaluateBurnRate(state).status;
  }
}

export function createErrorBudgetSloEngine(slos?: SloDefinition[]): ErrorBudgetSloEngine {
  return new ErrorBudgetSloEngine(slos);
}
