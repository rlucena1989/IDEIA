import * as crypto from 'node:crypto';
import { OperationalEvent, OperationalPattern } from './pattern-types';

export class PatternStore {
  private events: OperationalEvent[] = [];
  private patterns: OperationalPattern[] = [];

  addEvent(event: OperationalEvent): void {
    this.events.push(event);
  }

  createAndAddEvent(params: {
    type: OperationalEvent['type'];
    command: string;
    outcome: OperationalEvent['outcome'];
    scoreBefore?: number;
    scoreAfter?: number;
    metadata?: Record<string, string | number | boolean>;
  }): OperationalEvent {
    const event: OperationalEvent = {
      eventId: crypto.randomUUID(),
      type: params.type,
      command: params.command,
      outcome: params.outcome,
      scoreBefore: params.scoreBefore,
      scoreAfter: params.scoreAfter,
      createdAt: new Date().toISOString(),
      metadata: params.metadata,
    };
    this.events.push(event);
    return event;
  }

  listEvents(): OperationalEvent[] {
    return [...this.events];
  }

  setPatterns(patterns: OperationalPattern[]): void {
    this.patterns = patterns;
  }

  listPatterns(): OperationalPattern[] {
    return [...this.patterns];
  }

  clear(): void {
    this.events = [];
    this.patterns = [];
  }
}
