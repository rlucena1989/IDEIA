import { createLogger } from '@ideia/logger';
import { ContinuityEngine } from './continuity-engine';
import {
  ContinuityEventPayload,
  ContinuityStatus,
  EscalationLevel,
  SchedulerConfig,
  ESCALATION_ORDER,
} from './types';

const log = createLogger('continuity-scheduler');

const DEFAULT_CHECK_INTERVAL = 30_000;
const DEFAULT_MAX_ALTERNATIVES = 4;

export class ContinuityScheduler {
  private engine: ContinuityEngine;
  private checkIntervalMs: number;
  private maxAlternatives: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private checkCount = 0;
  private lastStatus: ContinuityStatus | null = null;

  constructor(engine: ContinuityEngine, config?: SchedulerConfig) {
    this.engine = engine;
    this.checkIntervalMs = config?.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL;
    this.maxAlternatives = config?.maxAlternatives ?? DEFAULT_MAX_ALTERNATIVES;

    if (config?.autoStart) {
      this.start();
    }
  }

  start(): void {
    if (this.running) return;

    this.running = true;
    this.timer = setInterval(() => this.tick(), this.checkIntervalMs);
    log.info(`Scheduler started (interval=${this.checkIntervalMs}ms)`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
    log.info('Scheduler stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  getCheckCount(): number {
    return this.checkCount;
  }

  getLastStatus(): ContinuityStatus | null {
    return this.lastStatus;
  }

  setCheckInterval(ms: number): void {
    this.checkIntervalMs = ms;
    if (this.running) {
      this.stop();
      this.start();
    }
  }

  private tick(): void {
    this.checkCount++;
    const events = this.engine.processTimeout();
    this.lastStatus = this.engine.getContinuityStatus();

    if (events.length > 0) {
      for (const event of events) {
        this.handleEvent(event);
      }
    }
  }

  private handleEvent(event: ContinuityEventPayload): void {
    const { decisionId, phase, description } = event;

    switch (phase) {
      case 'suggesting':
        log.info(`Decision ${decisionId} needs alternatives: "${description}"`);
        this.suggestAlternatives(decisionId, description);
        break;

      case 'escalated':
      case 'escalation-exhausted':
        log.warn(`Decision ${decisionId} escalated to ${event.escalationLevel}: "${description}"`);
        break;

      case 'auto-continue':
        log.info(`Decision ${decisionId} auto-continued: "${description}"`);
        break;

      case 'forced':
        log.warn(`Decision ${decisionId} forced: "${description}"`);
        break;

      default:
        break;
    }
  }

  private suggestAlternatives(decisionId: string, description: string): void {
    const alternatives = this.generateAlternatives(description);
    this.engine.suggestAlternatives(decisionId, alternatives);
  }

  private generateAlternatives(description: string): string[] {
    return [
      `Decompose "${description}" into smaller sub-tasks`,
      `Skip "${description}" and move to next priority`,
      `Defer "${description}" with 24h delay`,
      `Run "${description}" in parallel with reduced scope`,
      `Request human input for "${description}"`,
      `Use cached/default value for "${description}"`,
      `Fall back to safe default for "${description}"`,
    ].slice(0, this.maxAlternatives);
  }

  setMaxAlternatives(n: number): void {
    this.maxAlternatives = Math.max(1, n);
  }

  async executeEscalationPlan(decisionId: string): Promise<boolean> {
    const decision = this.engine.getDecision(decisionId);
    if (!decision || decision.status !== 'pending') return false;

    const escalationPath = this.buildEscalationPath(decision.escalationLevel);

    for (const level of escalationPath) {
      log.info(`Escalating ${decisionId} to ${level}`);
      this.engine.escalateDecision(decisionId, level);
    }

    return true;
  }

  private buildEscalationPath(from: EscalationLevel): EscalationLevel[] {
    const fromIdx = ESCALATION_ORDER.indexOf(from);
    return ESCALATION_ORDER.slice(fromIdx + 1);
  }
}
