import { createLogger } from '@ideia/logger';
import { ReplaySample } from './types';

const _log = createLogger('replay-buffer');

export class ElderlyReplayBuffer {
  private _buffer: ReplaySample[] = [];
  private _capacity: number;
  private _minHistory: number;
  private _alpha: number;

  constructor(capacity = 10000, minHistory = 100, alpha = 0.6) {
    this._capacity = capacity;
    this._minHistory = minHistory;
    this._alpha = alpha;
  }

  add(sample: ReplaySample): void {
    if (this._buffer.length >= this._capacity) this._buffer.shift();
    this._buffer.push(sample);
  }

  addBatch(samples: ReplaySample[]): void {
    for (const s of samples) this.add(s);
  }

  sample(batchSize: number): ReplaySample[] {
    if (this._buffer.length < this._minHistory) return [];
    const actualSize = Math.min(batchSize, this._buffer.length);
    const prioritized = this._buffer.map((s, i) => ({ sample: s, priority: this._computePriority(s, i), idx: i }));
    prioritized.sort((a, b) => b.priority - a.priority);
    return prioritized.slice(0, actualSize).map(p => p.sample);
  }

  private _computePriority(sample: ReplaySample, _idx: number): number {
    const recency = sample.timestamp ? Date.now() - sample.timestamp : 0;
    const recencyScore = Math.max(0, 1 - recency / 86400000);
    const relevanceScore = sample.metrics?.success ? 0.8 : 0.3;
    return Math.pow(recencyScore + relevanceScore, this._alpha) || 0.01;
  }

  size(): number { return this._buffer.length; }

  clear(): void {
    this._buffer = [];
    _log.info('Replay buffer cleared');
  }

  getStats(): { size: number; capacity: number; utilization: number } {
    return { size: this._buffer.length, capacity: this._capacity, utilization: this._buffer.length / this._capacity };
  }
}
