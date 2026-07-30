import { ReplayBufferEntry, TrainingExample } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('replay-buffer');

export class ReplayBuffer {
  private _buffer: ReplayBufferEntry[] = [];
  private _maxSize: number;
  private _insertIndex = 0;

  constructor(maxSize = 10000) {
    this._maxSize = maxSize;
  }

  add(entry: ReplayBufferEntry): void {
    if (this._buffer.length < this._maxSize) {
      this._buffer.push(entry);
    } else {
      this._buffer[this._insertIndex] = entry;
      this._insertIndex = (this._insertIndex + 1) % this._maxSize;
    }
  }

  addBatch(entries: ReplayBufferEntry[]): void {
    for (const entry of entries) {
      this.add(entry);
    }
  }

  sample(batchSize: number): TrainingExample[] {
    const size = Math.min(batchSize, this._buffer.length);
    const sampled: TrainingExample[] = [];
    const indices = this._randomSample(size);
    for (const idx of indices) {
      const entry = this._buffer[idx];
      if (entry) {
        sampled.push({ input: entry.input, label: entry.label, weight: entry.weight });
      }
    }
    return sampled;
  }

  sampleByWeight(batchSize: number): TrainingExample[] {
    const totalWeight = this._buffer.reduce((s, e) => s + e.weight, 0);
    if (totalWeight <= 0) return this.sample(batchSize);
    const sampled: TrainingExample[] = [];
    const size = Math.min(batchSize, this._buffer.length);
    for (let i = 0; i < size; i++) {
      const r = Math.random() * totalWeight;
      let cumulative = 0;
      for (const entry of this._buffer) {
        cumulative += entry.weight;
        if (r <= cumulative) {
          sampled.push({ input: entry.input, label: entry.label, weight: entry.weight });
          break;
        }
      }
    }
    return sampled;
  }

  getRecent(n: number): ReplayBufferEntry[] {
    return this._buffer.slice(-n);
  }

  updateWeight(index: number, weight: number): void {
    if (index >= 0 && index < this._buffer.length) {
      this._buffer[index] = { ...this._buffer[index], weight };
    }
  }

  size(): number {
    return this._buffer.length;
  }

  isEmpty(): boolean {
    return this._buffer.length === 0;
  }

  clear(): void {
    this._buffer = [];
    this._insertIndex = 0;
  }

  resize(newSize: number): void {
    if (newSize < this._buffer.length) {
      const sorted = [...this._buffer].sort((a, b) => b.weight - a.weight);
      this._buffer = sorted.slice(0, newSize);
      this._insertIndex = 0;
    }
    this._maxSize = newSize;
  }

  getAll(): ReplayBufferEntry[] {
    return [...this._buffer];
  }

  private _randomSample(count: number): number[] {
    const indices: number[] = [];
    const pool = Array.from({ length: this._buffer.length }, (_, i) => i);
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const chosen = pool[idx];
      if (chosen !== undefined) {
        indices.push(chosen);
        pool.splice(idx, 1);
      }
    }
    return indices;
  }
}
