import type { IEventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { createLogger } from '@ideia/logger';

export type EscalationLevel = 'info' | 'warning' | 'critical' | 'emergency';

export type EscalationTarget = 'developer' | 'tech-lead' | 'security' | 'admin';

export interface EscalationStep {
  level: EscalationLevel;
  target: EscalationTarget;
  maxWaitMs: number;
  autoEscalate: boolean;
}

export interface EscalationRequest {
  id: string;
  issue: string;
  context: string;
  level: EscalationLevel;
  currentStep: number;
  status: 'open' | 'resolved' | 'escalated' | 'timeout';
  createdAt: string;
  resolvedAt?: string;
  history: Array<{ step: number; target: EscalationTarget; action: string; timestamp: string }>;
}

export interface EscalationConfig {
  maxSteps: number;
  baseWaitMs: number;
  waitMultiplier: number;
}

const DEFAULT_STEPS: EscalationStep[] = [
  { level: 'info', target: 'developer', maxWaitMs: 60000, autoEscalate: true },
  { level: 'warning', target: 'tech-lead', maxWaitMs: 300000, autoEscalate: true },
  { level: 'critical', target: 'security', maxWaitMs: 600000, autoEscalate: true },
  { level: 'emergency', target: 'admin', maxWaitMs: 1800000, autoEscalate: false },
];

const DEFAULT_CONFIG: EscalationConfig = {
  maxSteps: 4,
  baseWaitMs: 60000,
  waitMultiplier: 5,
};

export class EscalationProtocol {
  private activeRequests: Map<string, EscalationRequest> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private config: EscalationConfig;
  private steps: EscalationStep[];
  private bus?: IEventBus;
  private audit?: AuditTrail;
  private logger = createLogger('escalation-protocol');

  constructor(bus?: IEventBus, audit?: AuditTrail, config?: Partial<EscalationConfig>, customSteps?: EscalationStep[]) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.steps = customSteps ?? DEFAULT_STEPS;
    this.bus = bus;
    this.audit = audit;
  }

  escalate(issue: string, context: string, level: EscalationLevel = 'info'): EscalationRequest {
    const id = `esc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const request: EscalationRequest = {
      id,
      issue,
      context,
      level,
      currentStep: 0,
      status: 'open',
      createdAt: new Date().toISOString(),
      history: [],
    };

    this.activeRequests.set(id, request);
    this.processStep(id);

    this.bus?.emit({ type: 'control.escalation.started', source: 'escalation-protocol', payload: { id, issue, level } });
    this.audit?.append({ actor: 'system', eventType: 'escalation.start', target: id, decision: 'approved', result: 'success', metadata: { issue, level } });
    this.logger.info(`Escalation ${id}: ${issue} (${level})`);

    return request;
  }

  resolve(id: string, resolution?: string): boolean {
    const req = this.activeRequests.get(id);
    if (!req) return false;

    req.status = 'resolved';
    req.resolvedAt = new Date().toISOString();
    req.history.push({ step: req.currentStep, target: this.getCurrentTarget(req), action: resolution ?? 'Manually resolved', timestamp: new Date().toISOString() });

    this.clearTimer(id);
    this.bus?.emit({ type: 'control.escalation.resolved', source: 'escalation-protocol', payload: { id, resolution } });
    this.audit?.append({ actor: 'system', eventType: 'escalation.resolve', target: id, decision: 'approved', result: 'success' });
    this.logger.info(`Escalation ${id}: resolved`);

    return true;
  }

  getActiveRequests(): EscalationRequest[] {
    return Array.from(this.activeRequests.values()).filter(r => r.status === 'open');
  }

  getRequest(id: string): EscalationRequest | undefined {
    return this.activeRequests.get(id);
  }

  dispose(): void {
    for (const [id] of this.timers) this.clearTimer(id);
    this.activeRequests.clear();
  }

  private processStep(id: string): void {
    const req = this.activeRequests.get(id);
    if (!req || req.status !== 'open') return;

    const stepIdx = req.currentStep;
    if (stepIdx >= this.steps.length) {
      req.status = 'timeout';
      this.bus?.emit({ type: 'control.escalation.timeout', source: 'escalation-protocol', payload: { id } });
      return;
    }

    const step = this.steps[stepIdx];
    req.history.push({ step: stepIdx, target: step.target, action: `Escalated to ${step.target}`, timestamp: new Date().toISOString() });

    this.bus?.emit({
      type: 'control.escalation.step',
      source: 'escalation-protocol',
      payload: { id, step: stepIdx, target: step.target, level: step.level, issue: req.issue },
    });

    this.audit?.append({
      actor: 'system', eventType: 'escalation.step', target: id, decision: 'approved', result: 'success',
      metadata: { step: stepIdx, target: step.target, level: step.level },
    });

    if (step.autoEscalate && stepIdx + 1 < this.steps.length) {
      const waitMs = this.config.baseWaitMs * Math.pow(this.config.waitMultiplier, stepIdx);
      const timer = setTimeout(() => {
        req.currentStep++;
        this.processStep(id);
      }, waitMs);
      this.timers.set(id, timer);
    }
  }

  private getCurrentTarget(req: EscalationRequest): EscalationTarget {
    const idx = Math.min(req.currentStep, this.steps.length - 1);
    return this.steps[idx].target;
  }

  private clearTimer(id: string): void {
    const t = this.timers.get(id);
    if (t) { clearTimeout(t); this.timers.delete(id); }
  }
}

export function createEscalationProtocol(bus?: IEventBus, audit?: AuditTrail, config?: Partial<EscalationConfig>, steps?: EscalationStep[]): EscalationProtocol {
  return new EscalationProtocol(bus, audit, config, steps);
}
