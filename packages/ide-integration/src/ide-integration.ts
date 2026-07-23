import { EventBus, createBus, EventType, BusEvent, type IEventBus } from '@ideia/event-bus';
import { TraceRegistry, TraceLink, LinkRequest } from '@ideia/trace-registry';
import { FeedbackPipeline, FeedbackSubmission, FeedbackEntry } from '@ideia/feedback-pipeline';
import { PolicyGateway, GatewayRequest } from '@ideia/policy-gateway';

export class IDEIntegration {
  readonly eventBus: EventBus;
  readonly traceRegistry: TraceRegistry;
  readonly feedbackPipeline: FeedbackPipeline;
  readonly policyGateway: PolicyGateway;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus ?? new EventBus();
    this.traceRegistry = new TraceRegistry();
    this.feedbackPipeline = new FeedbackPipeline();
    this.policyGateway = new PolicyGateway();
    this.wireInternalHooks();
  }

  async submitFeedback(submission: FeedbackSubmission, actor?: string): Promise<FeedbackEntry> {
    const entry = this.feedbackPipeline.submit(submission);

    this.traceRegistry.link({
      sourceType: 'feedback_event',
      sourceId: entry.id,
      targetType: submission.targetType as LinkRequest['sourceType'],
      targetId: submission.targetId,
      relationship: 'related_to',
      createdBy: actor,
    });

    await this.eventBus.emit({
      type: 'feedback.submitted',
      source: submission.source,
      payload: { feedback: entry },
    });

    return entry;
  }

  async processFeedback(feedbackId: string): Promise<void> {
    const rec = this.feedbackPipeline.process(feedbackId);
    if (rec) {
      await this.eventBus.emit({
        type: 'task.created',
        source: 'feedback-pipeline',
        payload: { task: rec },
      });
    }
  }

  async createTraceLink(request: LinkRequest, actor?: string): Promise<TraceLink> {
    const link = this.traceRegistry.link({ ...request, createdBy: actor ?? request.createdBy });

    await this.eventBus.emit({
      type: 'trace.linked',
      source: actor || 'system',
      payload: { trace: link },
    });

    return link;
  }

  async evaluatePolicy(request: GatewayRequest): Promise<ReturnType<PolicyGateway['evaluate']>> {
    const response = this.policyGateway.evaluate(request);

    if (response.decision === 'block') {
      await this.eventBus.emit({
        type: 'policy.violated',
        source: 'policy-gateway',
        payload: {
          policy: {
            actionType: request.actionType,
            resource: request.resource,
            decision: response.decision,
            reason: response.reason,
          },
        },
      });
    }

    return response;
  }

  async completeCycle(metadata?: Record<string, unknown>): Promise<void> {
    await this.eventBus.emit({
      type: 'cycle.completed',
      source: 'ide-integration',
      payload: { cycle: metadata ?? {} },
    });
  }

  async onEvent(eventType: EventType | '*', handler: (event: BusEvent) => void): Promise<string> {
    return await this.eventBus.subscribe(eventType, handler);
  }

  private wireInternalHooks(): void {
    this.eventBus.subscribe('task.created', (event: BusEvent) => {
      if (event.payload?.task) {
        const task = event.payload.task as Record<string, unknown>;
        this.traceRegistry.link({
          sourceType: 'agent_action',
          sourceId: event.id,
          targetType: 'workflow_task',
          targetId: String(task.id || task.title || 'unknown'),
          relationship: 'related_to',
          confidence: 0.8,
        });
      }
    });

    this.eventBus.subscribe('policy.violated', (event: BusEvent) => {
      const policy = event.payload?.policy as Record<string, unknown> | undefined;
      if (policy) {
        this.feedbackPipeline.submit({
          type: 'issue',
          source: 'system',
          targetType: 'policy_rule',
          targetId: String(policy.actionType || 'unknown'),
          content: `Policy violated: ${policy.reason}`,
          severity: 'warning',
        });
      }
    });
  }
}

export async function createIDEIntegration(config?: { eventBus?: IEventBus }): Promise<IDEIntegration> {
  const bus = config?.eventBus ?? await createBus();
  return new IDEIntegration(bus);
}

export async function createIDEIntegrationWithAutoBus(): Promise<IDEIntegration> {
  const bus = await createBus();
  return new IDEIntegration(bus);
}
