import { createBus, type IEventBus, type EventBus } from '@ideia/event-bus';
import { createLogger } from '@ideia/logger';
const logger = createLogger('ideia-bootstrap');
import { MemoryStore } from '@ideia/memory-store';
import { AuditTrail } from '@ideia/audit-trail';
import type { TraceRegistry } from '@ideia/trace-registry';
import type { ObservabilityEngine } from '@ideia/observability-engine';
import { createTraceRegistry } from '@ideia/trace-registry';
import { createObservabilityEngine } from '@ideia/observability-engine';
import { AgentRuntime } from '@ideia/agent-runtime';
import type { WorkflowEngine } from '@ideia/workflow-engine';
import type { DeliveryOrchestrator } from '@ideia/delivery-orchestrator';
import type { FeedbackPipeline } from '@ideia/feedback-pipeline';
import { createWorkflowEngine } from '@ideia/workflow-engine';
import { createDeliveryOrchestrator } from '@ideia/delivery-orchestrator';
import { createFeedbackPipeline } from '@ideia/feedback-pipeline';
import { setupTraceObservability } from '@ideia/trace-registry/observability-integration';

import path from 'node:path';
import fs from 'node:fs';

export interface IDEIAContext {
  eventBus: IEventBus;
  memoryStore: MemoryStore;
  auditTrail: AuditTrail;
  traceRegistry: TraceRegistry;
  observabilityEngine: ObservabilityEngine;
  agentRuntime: AgentRuntime;
  workflowEngine: WorkflowEngine;
  deliveryOrchestrator: DeliveryOrchestrator;
  feedbackPipeline: FeedbackPipeline;
  teardown: () => Promise<void>;
}

export interface IDEIAConfig {
  workspaceRoot: string;
  eventBusMaxHistory?: number;
  autoSetupObservability?: boolean;
  autoRegisterConsumers?: boolean;
  enableWebSocketBroadcast?: boolean;
  wsPort?: number;
}

export async function bootstrapIDEIA(
  workspaceRoot?: string,
  config?: Partial<IDEIAConfig>,
): Promise<IDEIAContext> {
  const root = workspaceRoot ?? process.cwd();
  const cfg: IDEIAConfig = {
    workspaceRoot: root,
    eventBusMaxHistory: 1000,
    autoSetupObservability: true,
    autoRegisterConsumers: true,
    enableWebSocketBroadcast: false,
    wsPort: 0,
    ...config,
  };

  const dataDir = path.join(cfg.workspaceRoot, '.ai-devkit', 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  logger.info('[IDEIA Bootstrap] Initializing modules...');

  // 1. AuditTrail
  const auditTrail = new AuditTrail(path.join(dataDir, 'audit.jsonl'));

  // 2. EventBus (auto: NATS if available, fallback to in-memory)
  const eventBus = await createBus({
    memory: { maxHistory: cfg.eventBusMaxHistory },
    auditTrail,
  });

  // 3. MemoryStore
  const memoryStore = new MemoryStore(path.join(dataDir, 'memory.json'));

  // 4. TraceRegistry
  const traceRegistry = createTraceRegistry();

  // 5. ObservabilityEngine
  const observabilityEngine = createObservabilityEngine();

  // 6. AgentRuntime
  const agentRuntime = new AgentRuntime(auditTrail, memoryStore);

  // 7. WorkflowEngine
  const workflowEngine = createWorkflowEngine();

  // 8. DeliveryOrchestrator
  const deliveryOrchestrator = createDeliveryOrchestrator();

  // 9. FeedbackPipeline
  const feedbackPipeline = createFeedbackPipeline();

  // 10. Auto-setup trace → observability
  if (cfg.autoSetupObservability) {
    setupTraceObservability(traceRegistry, observabilityEngine, { eventBus: eventBus as unknown as EventBus });
  }

  // 11. Register all event bus consumers
  const consumerSubs: { teardown(): void } | null = null;

  // 12. WebSocket broadcast (optional)
  if (cfg.enableWebSocketBroadcast && cfg.wsPort && cfg.wsPort > 0) {
    const { createWSBroadcast } = await import('@ideia/event-bus');
    const wsBroadcast = createWSBroadcast({ port: cfg.wsPort });
    wsBroadcast.start(eventBus as unknown as EventBus);
    logger.info('[IDEIA Bootstrap] WebSocket broadcast on port ${cfg.wsPort}');
  }

  // 13. Load memory state (eager)
  try {
    memoryStore.load();
    logger.info('[IDEIA Bootstrap] Memory loaded: ${memoryStore.count()} records');
  } catch (_err) {
    console.error('[IDEIA Bootstrap] Memory load error:', _err);
  }

  logger.info('[IDEIA Bootstrap] All modules initialized and connected');

  return {
    eventBus,
    memoryStore,
    auditTrail,
    traceRegistry,
    observabilityEngine,
    agentRuntime,
    workflowEngine,
    deliveryOrchestrator,
    feedbackPipeline,
    teardown: async () => {
      logger.info('[IDEIA Bootstrap] Tearing down...');
      // TODO: consumerSubs teardown when setupEventBusConsumers is implemented
      memoryStore.destroy();
      await eventBus.emit({
        type: 'system.shutdown',
        source: 'ideia-bootstrap',
        payload: { workspaceRoot: cfg.workspaceRoot },
      });
      logger.info('[IDEIA Bootstrap] Teardown complete');
    },
  };
}




