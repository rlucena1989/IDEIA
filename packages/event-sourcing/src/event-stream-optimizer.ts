import { DomainEvent, StreamConfig, StreamInfo } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('event-stream-optimizer');

export class EventStreamOptimizer {
  private _batchBuffer: Map<string, DomainEvent[]> = new Map();
  private _flushTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(
    private _flushFn: (subject: string, events: DomainEvent[]) => Promise<void>,
    private _batchWindowMs = 50,
    private _maxBatchSize = 100
  ) {}

  append(subject: string, event: DomainEvent): void {
    const buffer = this._batchBuffer.get(subject) ?? [];
    buffer.push(event);
    this._batchBuffer.set(subject, buffer);

    if (buffer.length >= this._maxBatchSize) {
      this.flush(subject);
      return;
    }

    if (!this._flushTimers.has(subject)) {
      const timer = setTimeout(() => this.flush(subject), this._batchWindowMs);
      this._flushTimers.set(subject, timer);
    }
  }

  async flush(subject: string): Promise<void> {
    const timer = this._flushTimers.get(subject);
    if (timer) {
      clearTimeout(timer);
      this._flushTimers.delete(subject);
    }

    const buffer = this._batchBuffer.get(subject);
    if (!buffer || buffer.length === 0) return;

    this._batchBuffer.delete(subject);
    await this._flushFn(subject, buffer);
  }

  async flushAll(): Promise<void> {
    const subjects = Array.from(this._batchBuffer.keys());
    await Promise.all(subjects.map(s => this.flush(s)));
  }

  get bufferSize(): number {
    let total = 0;
    for (const buffer of this._batchBuffer.values()) {
      total += buffer.length;
    }
    return total;
  }
}

export class InMemoryEventStore {
  private _streams = new Map<string, DomainEvent[]>();
  private _streamConfigs = new Map<string, StreamConfig>();

  async ensureStream(name: string, config?: StreamConfig): Promise<void> {
    if (!this._streams.has(name)) {
      this._streams.set(name, []);
      this._streamConfigs.set(name, config ?? {});
    }
  }

  async append(subject: string, events: DomainEvent[]): Promise<void> {
    const parts = subject.split('.');
    const streamName = parts[0];
    if (!this._streams.has(streamName)) {
      await this.ensureStream(streamName);
    }
    const stream = this._streams.get(streamName)!;
    stream.push(...events);
  }

  async *readStream(subject: string, opts?: { startSeq?: number; aggregateId?: string; signal?: AbortSignal }): AsyncGenerator<DomainEvent> {
    const parts = subject.split('.');
    const streamName = parts[0];
    const stream = this._streams.get(streamName) ?? [];
    const startSeq = opts?.startSeq ?? 1;

    for (let i = startSeq - 1; i < stream.length; i++) {
      if (opts?.signal?.aborted) break;
      if (opts?.aggregateId && stream[i].aggregateId !== opts.aggregateId) continue;
      yield stream[i];
    }
  }

  async readLastEvent(subject: string): Promise<DomainEvent | null> {
    const parts = subject.split('.');
    const streamName = parts[0];
    const stream = this._streams.get(streamName);
    if (!stream || stream.length === 0) return null;
    return stream[stream.length - 1];
  }

  async getStreamInfo(subject: string): Promise<StreamInfo> {
    const parts = subject.split('.');
    const streamName = parts[0];
    const stream = this._streams.get(streamName) ?? [];
    return {
      name: streamName,
      subject,
      firstSeq: stream.length > 0 ? 1 : 0,
      lastSeq: stream.length,
      messageCount: stream.length,
      byteCount: stream.reduce((acc, e) => acc + JSON.stringify(e).length, 0),
      created: Date.now(),
    };
  }

  async deleteStream(name: string): Promise<void> {
    this._streams.delete(name);
    this._streamConfigs.delete(name);
  }

  async purgeSubject(subject: string): Promise<number> {
    const parts = subject.split('.');
    const streamName = parts[0];
    const stream = this._streams.get(streamName);
    if (!stream) return 0;
    const count = stream.length;
    this._streams.set(streamName, []);
    return count;
  }

  getStreamCount(): number {
    return this._streams.size;
  }

  getEventCount(streamName: string): number {
    return this._streams.get(streamName)?.length ?? 0;
  }
}
