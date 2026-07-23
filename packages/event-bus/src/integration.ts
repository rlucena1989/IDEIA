import { createLogger } from '@ideia/logger';
import type { AuditTrail } from '@ideia/audit-trail';
import type { IEventBus } from './types';

const log = createLogger('event-bus-integration');
import type { FeedbackPipeline } from '@ideia/feedback-pipeline';
import type { MemoryStore } from '@ideia/memory-store';
import type { TraceRegistry } from '@ideia/trace-registry';
import type { WorkflowEngine } from '@ideia/workflow-engine';
import type { DeliveryOrchestrator } from '@ideia/delivery-orchestrator';
import type { ObservabilityEngine } from '@ideia/observability-engine';

export interface IntegrationConfig {
  auditTrail?: AuditTrail;
  feedbackPipeline?: FeedbackPipeline;
  memoryStore?: MemoryStore;
  traceRegistry?: TraceRegistry;
  workflowEngine?: WorkflowEngine;
  deliveryOrchestrator?: DeliveryOrchestrator;
  observabilityEngine?: ObservabilityEngine;
}

export async function setupEventBusConsumers(eventBus: IEventBus, config: IntegrationConfig): Promise<{
  subscriptionIds: string[];
  teardown: () => Promise<void>;
}> {
  const subscriptionIds: string[] = [];

  if (config.auditTrail) {
    const subId = await eventBus.subscribe('*', async (event) => {
      await config.auditTrail.append({
        actor: event.source,
        eventType: event.type,
        target: 'system',
        decision: 'approved',
        result: 'logged',
        metadata: { eventId: event.id },
      });
    });
    subscriptionIds.push(subId);
  }

  if (config.memoryStore) {
    const subId = await eventBus.subscribe('memory.*', async (event) => {
      log.info(`Memory event: ${event.type} from ${event.source}`);
    });
    subscriptionIds.push(subId);
  }

  if (config.workflowEngine) {
    const subId = await eventBus.subscribe('workflow.*', async (event) => {
      log.info(`Workflow event: ${event.type}`);
    });
    subscriptionIds.push(subId);
  }

  return {
    subscriptionIds,
    teardown: async () => {
      for (const id of subscriptionIds) {
        await eventBus.unsubscribe(id);
      }
    },
  };
}
