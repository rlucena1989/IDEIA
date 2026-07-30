export type FeedbackType = 'success' | 'failure' | 'timeout' | 'rejection' | 'correction';
export type FeedbackSource = 'user' | 'system' | 'quality-gate' | 'peer-review';

export interface FeedbackEvent {
  id: string;
  type: FeedbackType;
  source: FeedbackSource;
  agentId: string;
  taskId: string;
  action: string;
  result: string;
  score: number;
  latencyMs: number;
  context: Record<string, unknown>;
  timestamp: number;
}

export class FeedbackCollector {
  private _events: FeedbackEvent[] = [];
  private _maxSize: number;

  constructor(maxSize: number = 10000) {
    this._maxSize = maxSize;
  }

  record(event: FeedbackEvent): void {
    this._events.push(event);
    if (this._events.length > this._maxSize) {
      this._events = this._events.slice(this._events.length - this._maxSize);
    }
  }

  getByAgent(agentId: string): FeedbackEvent[] {
    return this._events.filter(e => e.agentId === agentId);
  }

  getByType(type: FeedbackType): FeedbackEvent[] {
    return this._events.filter(e => e.type === type);
  }

  getBySource(source: FeedbackSource): FeedbackEvent[] {
    return this._events.filter(e => e.source === source);
  }

  getRecent(count: number): FeedbackEvent[] {
    return this._events.slice(-count);
  }

  getStats(): { total: number; byType: Record<FeedbackType, number>; byAgent: Record<string, number>; avgScore: number; avgLatency: number } {
    const total = this._events.length;
    const byType = {
      success: 0, failure: 0, timeout: 0, rejection: 0, correction: 0,
    } as Record<FeedbackType, number>;
    const byAgent: Record<string, number> = {};
    let totalScore = 0;
    let totalLatency = 0;

    for (const event of this._events) {
      byType[event.type] = (byType[event.type] || 0) + 1;
      byAgent[event.agentId] = (byAgent[event.agentId] || 0) + 1;
      totalScore += event.score;
      totalLatency += event.latencyMs;
    }

    return {
      total,
      byType,
      byAgent,
      avgScore: total > 0 ? totalScore / total : 0,
      avgLatency: total > 0 ? totalLatency / total : 0,
    };
  }

  getStatsByCategory(): Record<string, { count: number; avgScore: number; avgLatency: number }> {
    const categoryMap = new Map<string, { count: number; totalScore: number; totalLatency: number }>();
    for (const event of this._events) {
      const cat = event.action.split(':')[0] ?? 'other';
      const existing = categoryMap.get(cat) ?? { count: 0, totalScore: 0, totalLatency: 0 };
      existing.count++;
      existing.totalScore += event.score;
      existing.totalLatency += event.latencyMs;
      categoryMap.set(cat, existing);
    }
    const result: Record<string, { count: number; avgScore: number; avgLatency: number }> = {};
    for (const [cat, data] of categoryMap) {
      result[cat] = {
        count: data.count,
        avgScore: data.count > 0 ? data.totalScore / data.count : 0,
        avgLatency: data.count > 0 ? data.totalLatency / data.count : 0,
      };
    }
    return result;
  }

  getRecentFeedback(n: number): FeedbackEvent[] {
    return this._events.slice(-n);
  }

  getFeedbackRate(): number {
    if (this._events.length < 2) return 0;
    const first = this._events[0].timestamp;
    const last = this._events[this._events.length - 1].timestamp;
    const durationMs = last - first;
    if (durationMs <= 0) return 0;
    return (this._events.length / durationMs) * 60000;
  }

  clear(): void {
    this._events = [];
  }

  getEvents(): FeedbackEvent[] {
    return [...this._events];
  }
}
