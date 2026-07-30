import { v4 as uuid } from 'uuid';
import { createLogger } from '@ideia/logger';
import { FeedbackEvent, FeedbackAction, PatternEntry } from './types';

export class FeedbackOrchestrator {
  private events: FeedbackEvent[] = [];
  private actions: FeedbackAction[] = [];
  private patterns: PatternEntry[] = [];
  private queue: FeedbackEvent[] = [];

  async onEvent(event: Omit<FeedbackEvent, 'id'>): Promise<FeedbackAction> {
    const id = uuid();
    const full: FeedbackEvent = { ...event, id };
    this.events.push(full);
    this.queue.push(full);

    const actionType = this.resolveActionType(full);
    const action: FeedbackAction = {
      id: uuid(),
      eventId: id,
      type: actionType,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.actions.push(action);

    if (full.severity === 'critical' || full.severity === 'high') {
      action.status = 'running';
      action.result = 'Action dispatched';
    } else if (full.severity === 'medium') {
      action.status = 'completed';
      action.result = 'Logged for review';
    } else {
      action.status = 'completed';
      action.result = 'Acknowledged';
    }

    return action;
  }

  registerPattern(pattern: Omit<PatternEntry, 'id'>): string {
    const id = uuid();
    this.patterns.push({ ...pattern, id });
    return id;
  }

  findPatterns(symptom: string): PatternEntry[] {
    const q = symptom.toLowerCase();
    return this.patterns.filter(
      p =>
        p.pattern.toLowerCase().includes(q) ||
        p.symptom.toLowerCase().includes(q),
    );
  }

  getStats(): { totalEvents: number; totalActions: number; patternsCount: number; topSeverity: string } {
    const severityOrder = ['critical', 'high', 'medium', 'low'];
    let topSeverity = 'none';
    for (const s of severityOrder) {
      if (this.events.some(e => e.severity === s)) {
        topSeverity = s;
        break;
      }
    }
    return {
      totalEvents: this.events.length,
      totalActions: this.actions.length,
      patternsCount: this.patterns.length,
      topSeverity,
    };
  }

  async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const event = this.queue.shift() as (typeof this.queue)[number];
      const action = this.actions.find(a => a.eventId === event.id);
      if (action && action.status === 'pending') {
        action.status = 'running';
        action.result = 'Processing...';
        action.result = 'Processed';
        action.status = 'completed';
      }
    }
  }

  private resolveActionType(event: FeedbackEvent): FeedbackAction['type'] {
    if (event.severity === 'critical') return 'escalate';
    if (event.severity === 'high') return 'fix';
    if (event.type === 'pattern_detected') return 'log';
    if (event.type === 'improvement') return 'log';
    return 'notify';
  }
}
