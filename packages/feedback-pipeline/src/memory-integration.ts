import { FeedbackPipeline } from './feedback-pipeline';
import type { FeedbackEntry, Recommendation } from './types';
import type { MemoryStore, MemoryRecord } from '@ideia/memory-store';
import type { EventBus } from '@ideia/event-bus';
import type { AuditTrail } from '@ideia/audit-trail';

export interface FeedbackMemoryResult {
  recommendation: Recommendation;
  memory: MemoryRecord;
}

const CATEGORY_MAP: Record<string, MemoryRecord['category']> = {
  approval: 'decision',
  rejection: 'failure',
  suggestion: 'pattern',
  question: 'pattern',
  comment: 'trend',
  issue: 'failure',
};

export async function processFeedbackWithMemory(
  feedback: FeedbackEntry,
  feedbackPipeline: FeedbackPipeline,
  memoryStore: MemoryStore,
  deps?: {
    eventBus?: EventBus;
    auditTrail?: AuditTrail;
  },
): Promise<FeedbackMemoryResult> {
  const log = (msg: string) => console.log(`[FeedbackMemoryIntegration] ${msg}`);

  const processed = feedbackPipeline.process(feedback.id);
  if (!processed) {
    throw new Error(`Feedback ${feedback.id} could not be processed`);
  }

  const memoryCategory = CATEGORY_MAP[feedback.type] ?? 'pattern';

  const memoryRecord: MemoryRecord = {
    memoryId: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category: memoryCategory,
    source: `feedback:${feedback.source}`,
    summary: processed.title,
    tags: [...feedback.tags, feedback.type, feedback.source, processed.priority],
    createdAt: new Date().toISOString(),
    severity: feedback.severity === 'critical' ? 'critical'
      : feedback.severity === 'error' ? 'high'
      : feedback.severity === 'warning' ? 'medium'
      : 'low',
    decision: { recommendationId: processed.id, status: processed.status },
    context: {
      feedbackId: feedback.id,
      targetType: feedback.targetType,
      targetId: feedback.targetId,
      recommendationType: processed.type,
    },
  };

  memoryStore.append(memoryRecord);
  log(`Memory record saved: ${memoryRecord.memoryId} (${memoryCategory})`);

  if (deps?.eventBus) {
    await deps.eventBus.emit({
      type: 'feedback.memory.stored',
      source: 'feedback-pipeline:memory-integration',
      payload: {
        feedbackId: feedback.id,
        recommendationId: processed.id,
        memoryId: memoryRecord.memoryId,
        category: memoryCategory,
      },
    });
  }

  if (deps?.auditTrail) {
    deps.auditTrail.append({
      actor: 'system',
      eventType: 'feedback.memory.integration',
      target: `feedback:${feedback.id}`,
      decision: 'approved',
      result: 'success',
      metadata: {
        recommendationId: processed.id,
        memoryId: memoryRecord.memoryId,
        category: memoryCategory,
      },
    });
  }

  return { recommendation: processed, memory: memoryRecord };
}

export async function processAllFeedbackWithMemory(
  feedbackPipeline: FeedbackPipeline,
  memoryStore: MemoryStore,
  deps?: {
    eventBus?: EventBus;
    auditTrail?: AuditTrail;
  },
): Promise<FeedbackMemoryResult[]> {
  const results: FeedbackMemoryResult[] = [];
  const allFeedback = feedbackPipeline.getAllFeedback();

  for (const fb of allFeedback) {
    if (fb.decision === 'pending') {
      try {
        const result = await processFeedbackWithMemory(fb, feedbackPipeline, memoryStore, deps);
        results.push(result);
      } catch (_err) {
        console.error(`[FeedbackMemoryIntegration] Error processing feedback ${fb.id}:`, err);
      }
    }
  }

  return results;
}
