export interface QueuedMessage {
  id: string;
  topic: string;
  payload: unknown;
  timestamp: number;
  retries: number;
}

export interface OfflineQueueConfig {
  maxSize: number;
  ttlMs: number;
}

const DEFAULT_CONFIG: OfflineQueueConfig = { maxSize: 1000, ttlMs: 86400000 };

export class OfflineQueue {
  private messages: Map<string, QueuedMessage> = new Map();
  private config: OfflineQueueConfig;

  constructor(config?: Partial<OfflineQueueConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private prune(): void {
    const cutoff = Date.now() - this.config.ttlMs;
    for (const [id, msg] of this.messages) {
      if (msg.timestamp < cutoff) {
        this.messages.delete(id);
      }
    }
  }

  enqueue(topic: string, payload: unknown, existingId?: string): string {
    this.prune();
    const id = existingId ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (this.messages.has(id)) return id;
    if (this.messages.size >= this.config.maxSize) {
      const oldest = this.dequeue();
      if (!oldest) return id;
    }
    const msg: QueuedMessage = { id, topic, payload, timestamp: Date.now(), retries: 0 };
    this.messages.set(id, msg);
    return id;
  }

  dequeue(): QueuedMessage | undefined {
    this.prune();
    if (this.messages.size === 0) return undefined;
    let oldest: QueuedMessage | undefined;
    let oldestKey: string | undefined;
    for (const [key, msg] of this.messages) {
      if (!oldest || msg.timestamp < oldest.timestamp) {
        oldest = msg;
        oldestKey = key;
      }
    }
    if (oldestKey !== undefined) {
      this.messages.delete(oldestKey);
    }
    return oldest;
  }

  peek(): QueuedMessage | undefined {
    this.prune();
    if (this.messages.size === 0) return undefined;
    let oldest: QueuedMessage | undefined;
    for (const msg of this.messages.values()) {
      if (!oldest || msg.timestamp < oldest.timestamp) {
        oldest = msg;
      }
    }
    return oldest;
  }

  getAll(): QueuedMessage[] {
    this.prune();
    return Array.from(this.messages.values());
  }

  getCount(): number {
    this.prune();
    return this.messages.size;
  }

  clear(): void {
    this.messages.clear();
  }

  remove(id: string): boolean {
    return this.messages.delete(id);
  }

  getByTopic(topic: string): QueuedMessage[] {
    this.prune();
    const result: QueuedMessage[] = [];
    for (const msg of this.messages.values()) {
      if (msg.topic === topic) {
        result.push(msg);
      }
    }
    return result;
  }
}
