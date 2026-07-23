import { randomUUID } from 'crypto';
import { EventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { createLogger } from '@ideia/logger';
import { BHPConfig, BHPContext, BHPMessage, BHPMessageType, BHPPlatform, BHPPlan, PlanEvaluation, CollaborationState, BHPDecision } from './types';

const log = createLogger('bhp');

const DEFAULT_CONFIG: BHPConfig = {
  timeout: 30000,
  autoApproveThreshold: 0.9,
  maxHistory: 1000,
};

const BHP_EVENT_PREFIX = 'bhp.';

function messageTypeToEventType(type: BHPMessageType): string {
  return `${BHP_EVENT_PREFIX}${type.toLowerCase().replace('!', '')}`;
}

export class BHP {
  private config: BHPConfig;
  private eventBus: EventBus;
  private auditTrail?: AuditTrail;
  private messages: BHPMessage[] = [];
  private activePlans: Map<string, { plan: BHPPlan; state: CollaborationState; timer: NodeJS.Timeout }> = new Map();
  private cleanupFunctions: (() => void)[] = [];

  constructor(
    eventBus: EventBus,
    config?: Partial<BHPConfig>,
    auditTrail?: AuditTrail,
  ) {
    this.eventBus = eventBus;
    this.auditTrail = auditTrail;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupListeners();
  }

  private async setupListeners(): Promise<void> {
    const types: BHPMessageType[] = ['HELP!', 'STATS', 'PLAN', 'APPROVE', 'REJECT', 'CLARIFY', 'ADAPT'];
    for (const type of types) {
      const eventType = messageTypeToEventType(type);
      const subId = await this.eventBus.subscribe(eventType, (event) => {
        const msg = event.payload?.message as BHPMessage | undefined;
        if (msg) {
          this.handleMessage(msg);
        }
      });
      this.cleanupFunctions.push(() => { this.eventBus.unsubscribe(subId); });
    }
  }

  private handleMessage(msg: BHPMessage): void {
    this.messages.push(msg);
    if (this.messages.length > this.config.maxHistory) {
      this.messages.shift();
    }

    const actor: 'user' | 'system' | 'ai' = msg.source === 'human' ? 'user' : msg.source === 'ia' ? 'ai' : 'system';
    const decisionType = this.mapToDecision(msg.type);
    this.auditTrail?.append({
      actor,
      eventType: `bhp.${msg.type}`,
      target: msg.target,
      decision: decisionType as 'approved' | 'rejected',
      result: 'success',
      metadata: { messageId: msg.id, payload: msg.payload },
    });

    switch (msg.type) {
      case 'PLAN':
        this.handlePlan(msg);
        break;
      case 'APPROVE':
      case 'REJECT':
      case 'CLARIFY':
        this.handlePlanDecision(msg);
        break;
      default:
        log.debug('Message handled', { type: msg.type, id: msg.id });
        break;
    }
  }

  private handlePlan(msg: BHPMessage): void {
    const plan = msg.payload.plan as BHPPlan | undefined;
    if (!plan) return;

    const state: CollaborationState = {
      planId: plan.id,
      status: 'pending',
      messages: [msg],
      startedAt: new Date().toISOString(),
    };

    const timer = setTimeout(() => {
      this.handlePlanTimeout(plan.id);
    }, this.config.timeout);

    this.activePlans.set(plan.id, { plan, state, timer });
    log.info('Plan received', { planId: plan.id, agentId: plan.agentId });
  }

  private handlePlanDecision(msg: BHPMessage): void {
    const planId = msg.payload.planId as string | undefined;
    if (!planId) return;

    const active = this.activePlans.get(planId);
    if (!active) return;

    clearTimeout(active.timer);
    active.state.messages.push(msg);

    switch (msg.type) {
      case 'APPROVE':
        active.state.status = 'approved';
        break;
      case 'REJECT':
        active.state.status = 'rejected';
        break;
      case 'CLARIFY':
        active.state.status = 'clarify';
        break;
    }

    active.state.resolvedAt = new Date().toISOString();
    log.info('Plan resolved', { planId, status: active.state.status });
  }

  private handlePlanTimeout(planId: string): void {
    const active = this.activePlans.get(planId);
    if (!active) return;

    active.state.status = 'escalated';
    active.state.resolvedAt = new Date().toISOString();
    log.warn('Plan timed out', { planId, timeout: this.config.timeout });

    const timeoutMsg = this.createMessage('ADAPT', 'ideia', 'ia', {
      planId,
      reason: 'timeout',
      adjustments: { escalated: true, timeoutMs: this.config.timeout },
    });
    this.emit(timeoutMsg);

    this.auditTrail?.append({
      actor: 'system',
      eventType: 'bhp.timeout',
      target: 'ia',
      decision: 'rejected',
      result: 'failure',
      metadata: { planId, reason: 'timeout' },
    });
  }

  private createMessage(
    type: BHPMessageType,
    source: BHPPlatform,
    target: BHPPlatform,
    payload: Record<string, unknown>,
  ): BHPMessage {
    return {
      id: randomUUID(),
      type,
      source,
      target,
      timestamp: new Date().toISOString(),
      payload,
      ttl: this.config.timeout,
    };
  }

  private emit(msg: BHPMessage): void {
    const eventType = messageTypeToEventType(msg.type);
    this.eventBus.emit({
      type: eventType,
      source: 'bhp',
      payload: { message: msg },
      metadata: { bhpVersion: '1.0' },
    });

    this.messages.push(msg);
    if (this.messages.length > this.config.maxHistory) {
      this.messages.shift();
    }
  }

  private mapToDecision(type: BHPMessageType): 'approved' | 'rejected' | 'unknown' {
    switch (type) {
      case 'APPROVE': return 'approved';
      case 'REJECT': return 'rejected';
      default: return 'unknown';
    }
  }

  sendHelp(source: BHPPlatform, target: BHPPlatform, context: BHPContext): string {
    const msg = this.createMessage('HELP!', source, target, { context });
    this.emit(msg);
    log.info('HELP! sent', { source, target, intent: context.intent });
    return msg.id;
  }

  sendStats(metrics: Record<string, unknown>): void {
    const msg = this.createMessage('STATS', 'ideia', 'ia', { metrics });
    this.emit(msg);
    log.info('STATS sent', { metricCount: Object.keys(metrics).length });
  }

  submitPlan(plan: BHPPlan): string {
    const msg = this.createMessage('PLAN', 'ia', 'ideia', { plan });
    this.emit(msg);
    log.info('PLAN submitted', { planId: plan.id, agentId: plan.agentId });
    return plan.id;
  }

  approvePlan(planId: string): void {
    const msg = this.createMessage('APPROVE', 'ideia', 'ia', { planId });
    this.emit(msg);
    log.info('PLAN approved', { planId });
  }

  rejectPlan(planId: string, reason: string): void {
    const msg = this.createMessage('REJECT', 'ideia', 'ia', { planId, reason });
    this.emit(msg);
    log.info('PLAN rejected', { planId, reason });
  }

  requestClarification(planId: string, questions: string[]): void {
    const msg = this.createMessage('CLARIFY', 'ideia', 'ia', { planId, questions });
    this.emit(msg);
    log.info('CLARIFY sent', { planId, questions: questions.length });
  }

  adapt(adjustments: Record<string, unknown>): void {
    const msg = this.createMessage('ADAPT', 'ideia', 'ia', { adjustments });
    this.emit(msg);
    log.info('ADAPT sent', { adjustmentKeys: Object.keys(adjustments) });
  }

  evaluatePlan(plan: BHPPlan, policyRules?: Record<string, unknown>): PlanEvaluation {
    const score = this.computePlanScore(plan);
    const policyPass = this.checkPolicy(plan, policyRules);
    const risks = this.identifyRisks(plan);
    const recommendations = this.generateRecommendations(plan, score, risks);

    const evaluation: PlanEvaluation = {
      planId: plan.id,
      score,
      policyPass,
      risks,
      recommendations,
      evaluatedAt: new Date().toISOString(),
    };

    this.auditTrail?.append({
      actor: 'system',
      eventType: 'bhp.evaluation',
      target: plan.agentId,
      decision: score >= this.config.autoApproveThreshold ? 'approved' : 'rejected',
      result: 'success',
      metadata: { evaluation },
    });

    return evaluation;
  }

  private computePlanScore(plan: BHPPlan): number {
    let score = 0.5;
    if (plan.steps.length > 0) score += 0.1;
    if (plan.resources.length > 0) score += 0.1;
    if (plan.description.length > 10) score += 0.1;
    if (plan.estimatedDuration > 0 && plan.estimatedDuration <= 3600) score += 0.1;
    if (Object.keys(plan.context).length > 0) score += 0.1;
    return Math.min(score, 1.0);
  }

  private checkPolicy(plan: BHPPlan, _policyRules?: Record<string, unknown>): boolean {
    if (plan.estimatedDuration > 86400) return false;
    for (const step of plan.steps) {
      if (step.toLowerCase().includes('rm -rf') || step.toLowerCase().includes('format c:')) return false;
    }
    return true;
  }

  private identifyRisks(plan: BHPPlan): string[] {
    const risks: string[] = [];
    if (plan.estimatedDuration > 3600) risks.push('Long estimated duration');
    if (!plan.resources.length) risks.push('No resources specified');
    if (plan.steps.some(s => s.toLowerCase().includes('delete') || s.toLowerCase().includes('drop'))) {
      risks.push('Destructive operations detected');
    }
    return risks;
  }

  private generateRecommendations(plan: BHPPlan, score: number, risks: string[]): string[] {
    const recommendations: string[] = [];
    if (score < 0.7) recommendations.push('Add more detail to plan steps');
    if (!plan.resources.length) recommendations.push('Specify required resources');
    if (risks.length > 0) recommendations.push('Review risk items before execution');
    return recommendations;
  }

  getActivePlan(planId: string): CollaborationState | undefined {
    const active = this.activePlans.get(planId);
    return active?.state;
  }

  getHistory(): BHPMessage[] {
    return [...this.messages];
  }

  getPlanHistory(planId: string): BHPMessage[] {
    const active = this.activePlans.get(planId);
    return active ? [...active.state.messages] : [];
  }

  getConfig(): BHPConfig {
    return { ...this.config };
  }

  dispose(): void {
    for (const [, active] of this.activePlans) {
      clearTimeout(active.timer);
    }
    this.activePlans.clear();
    this.messages = [];
    for (const cleanup of this.cleanupFunctions) {
      cleanup();
    }
    this.cleanupFunctions = [];
    log.info('BHP disposed');
  }
}
