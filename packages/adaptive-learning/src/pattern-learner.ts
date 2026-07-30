import { FeedbackEvent } from './feedback-collector';
import { createLogger } from '@ideia/logger';
const logger = createLogger('pattern-learner');

export interface Pattern {
  id: string;
  type: 'success-sequence' | 'failure-sequence' | 'timeout-pattern' | 'user-correction';
  actions: string[];
  frequency: number;
  confidence: number;
  lastObserved: number;
}

export class PatternLearner {
  private _patterns: Map<string, Pattern> = new Map();
  private _sequenceWindow: number;

  constructor(windowSize: number = 5) {
    this._sequenceWindow = windowSize;
  }

  observe(events: FeedbackEvent[]): void {
    if (events.length === 0) return;

    const sequences = this._findRepeatingSequences(events);
    const total = events.length;

    for (const [seqKey, frequency] of sequences) {
      this._incrementPattern(seqKey);
      const parts = seqKey.split('|');
      const patternType = this._inferPatternType(parts);
      const existing = this._patterns.get(seqKey);

      if (existing) {
        existing.frequency = frequency;
        existing.confidence = this._calculateConfidence(frequency, total);
        existing.lastObserved = Math.max(...events.map(e => e.timestamp));
      } else {
        const pattern: Pattern = {
          id: seqKey,
          type: patternType,
          actions: parts,
          frequency,
          confidence: this._calculateConfidence(frequency, total),
          lastObserved: Math.max(...events.map(e => e.timestamp)),
        };
        this._patterns.set(seqKey, pattern);
      }
    }
  }

  getPatterns(): Pattern[] {
    return Array.from(this._patterns.values());
  }

  getPattern(id: string): Pattern | undefined {
    return this._patterns.get(id);
  }

  getPatternByType(type: Pattern['type']): Pattern[] {
    return Array.from(this._patterns.values()).filter(p => p.type === type);
  }

  getTopPatterns(n: number): Pattern[] {
    return Array.from(this._patterns.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, n);
  }

  detectSequence(actions: string[]): Pattern | null {
    if (actions.length === 0) return null;
    const key = actions.join('|');
    return this._patterns.get(key) || null;
  }

  getRecommendations(_agentId: string): { avoid: string[]; prefer: string[] } {
    const avoid: string[] = [];
    const prefer: string[] = [];

    for (const pattern of this._patterns.values()) {
      if (pattern.type === 'failure-sequence' || pattern.type === 'timeout-pattern') {
        avoid.push(...pattern.actions);
      }
      if (pattern.type === 'success-sequence' || pattern.type === 'user-correction') {
        prefer.push(...pattern.actions);
      }
    }

    return {
      avoid: [...new Set(avoid)],
      prefer: [...new Set(prefer)],
    };
  }

  private _findRepeatingSequences(events: FeedbackEvent[]): Map<string, number> {
    const sequences = new Map<string, number>();

    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1];
      const curr = events[i];
      if (prev.agentId === curr.agentId) {
        const seq = `${prev.action}|${curr.action}`;
        sequences.set(seq, (sequences.get(seq) || 0) + 1);
      }
    }

    for (let i = 2; i < events.length; i++) {
      const a = events[i - 2];
      const b = events[i - 1];
      const c = events[i];
      if (a.agentId === b.agentId && b.agentId === c.agentId) {
        const seq = `${a.action}|${b.action}|${c.action}`;
        sequences.set(seq, (sequences.get(seq) || 0) + 1);
      }
    }

    const timeoutPatterns = new Map<string, number>();
    for (const event of events) {
      if (event.type === 'timeout' && event.latencyMs > 10000) {
        timeoutPatterns.set(event.action, (timeoutPatterns.get(event.action) || 0) + 1);
      }
    }
    for (const [action, count] of timeoutPatterns) {
      sequences.set(`timeout:${action}`, count);
    }

    return sequences;
  }

  private _calculateConfidence(frequency: number, total: number): number {
    if (total === 0) return 0;
    const ratio = frequency / total;
    if (ratio > 0.3) return 0.9;
    if (ratio > 0.2) return 0.7;
    if (ratio > 0.1) return 0.5;
    return 0.3;
  }

  private _incrementPattern(key: string): void {
    const existing = this._patterns.get(key);
    if (existing) {
      existing.frequency += 1;
    }
  }

  private _inferPatternType(actions: string[]): Pattern['type'] {
    const actionStr = actions.join(' ');
    if (actionStr.includes('timeout')) return 'timeout-pattern';
    return 'failure-sequence';
  }
}
