import type { EventBus } from './event-bus';
import { createLogger } from '@ideia/logger';
const logger = createLogger('integration-events');

export function emitMemoryUpdated(eventBus: EventBus, memoryId: string, category: string, summary: string): void {
  eventBus.emit({
    type: 'memory:update',
    source: 'memory-store',
    payload: { code: { memoryId, category, summary } as Record<string, unknown> },
  }).catch(() => {});
}

export function emitMemoryCreated(eventBus: EventBus, memoryId: string, category: string, summary: string): void {
  eventBus.emit({
    type: 'memory.created',
    source: 'memory-store',
    payload: { code: { memoryId, category, summary } as Record<string, unknown> },
  }).catch(() => {});
}

export function emitSessionCreated(eventBus: EventBus, sessionId: string, source: string): void {
  eventBus.emit({
    type: 'session:created',
    source,
    payload: { code: { sessionId } as Record<string, unknown> },
  }).catch(() => {});
}

export function emitOptimizationEvent(eventBus: EventBus, action: string, details: Record<string, unknown>): void {
  eventBus.emit({
    type: 'agent.action',
    source: 'optimization-engine',
    payload: { code: { action, ...details } as Record<string, unknown> },
  }).catch(() => {});
}

export function emitSLOEvent(eventBus: EventBus, metric: string, status: string, value: number): void {
  eventBus.emit({
    type: 'feedback.submitted',
    source: 'slo-monitor',
    payload: { code: { metric, status, value } as Record<string, unknown> },
  }).catch(() => {});
}

export function emitContractDrift(eventBus: EventBus, contractKey: string, changes: string[], severity: string): void {
  eventBus.emit({
    type: 'trace.linked',
    source: 'contract-validator',
    payload: { code: { contractKey, changes, severity } as Record<string, unknown> },
  }).catch(() => {});
}
