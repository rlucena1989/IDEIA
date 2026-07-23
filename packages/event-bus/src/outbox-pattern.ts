import fs from 'fs';
import path from 'path';
import { createLogger } from '@ideia/logger';

const log = createLogger('outbox-relay');

export interface OutboxEntry {
  id: string;
  type: string;
  source: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  published: boolean;
  retryCount: number;
}

export interface OutboxConfig {
  filePath: string;
  maxRetries?: number;
  relayIntervalMs?: number;
  batchSize?: number;
}

type EventEmitter = {
  emit(event: { type: string; source: string; payload?: Record<string, unknown>; metadata?: Record<string, unknown> }): Promise<unknown>;
};

export class OutboxRelay {
  private config: OutboxConfig;
  private bus: EventEmitter;
  private timer: NodeJS.Timeout | null = null;
  private pending: OutboxEntry[] = [];

  constructor(bus: EventEmitter, config: OutboxConfig) {
    this.bus = bus;
    this.config = {
      maxRetries: 3,
      relayIntervalMs: 5000,
      batchSize: 10,
      ...config,
    };

    this.recoverPending();
  }

  async emit(event: { type: string; source: string; payload?: Record<string, unknown>; metadata?: Record<string, unknown> }): Promise<{ id: string }> {
    const entry: OutboxEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: event.type,
      source: event.source,
      payload: event.payload,
      metadata: event.metadata,
      createdAt: new Date().toISOString(),
      published: false,
      retryCount: 0,
    };

    this.pending.push(entry);
    await this.appendToFileAsync(entry);
    return { id: entry.id };
  }

  startRelay(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.relayBatch(), this.config.relayIntervalMs);
    this.relayBatch();
  }

  stopRelay(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getPendingCount(): number {
    return this.pending.filter(e => !e.published).length;
  }

  private async relayBatch(): Promise<void> {
    const toSend = this.pending
      .filter(e => !e.published && e.retryCount < (this.config.maxRetries ?? 3))
      .slice(0, this.config.batchSize);

    for (const entry of toSend) {
      try {
        await this.bus.emit({
          type: entry.type,
          source: entry.source,
          payload: entry.payload,
          metadata: entry.metadata,
        });
        entry.published = true;
        await this.removeFromFileAsync(entry);
      } catch {
        entry.retryCount++;
      }
    }
  }

  private async appendToFileAsync(entry: OutboxEntry): Promise<void> {
    try {
      const dir = path.dirname(this.config.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(this.config.filePath, JSON.stringify(entry) + '\n');
    } catch (_err) {
      // Log silenciado propositalmente — falha nao bloqueia fluxo
    }
  }

  private async removeFromFileAsync(entry: OutboxEntry): Promise<void> {
    try {
      if (fs.existsSync(this.config.filePath)) {
        const content = fs.readFileSync(this.config.filePath, 'utf-8');
        const lines = content.split('\n').filter(Boolean);
        const updated = lines.filter(line => {
          try { return JSON.parse(line).id !== entry.id; } catch { return true; }
        });
        fs.writeFileSync(this.config.filePath, updated.join('\n') + (updated.length > 0 ? '\n' : ''));
      }
    } catch (_err) {
      // Log silenciado propositalmente — falha nao bloqueia fluxo
    }
  }

  private recoverPending(): void {
    try {
      if (fs.existsSync(this.config.filePath)) {
        const content = fs.readFileSync(this.config.filePath, 'utf-8');
        const lines = content.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const entry: OutboxEntry = JSON.parse(line);
            if (!entry.published) {
              this.pending.push(entry);
            }
          } catch (_err) {
            // Log silenciado propositalmente — falha nao bloqueia fluxo
          }
        }
        log.info(`Recovered ${this.pending.filter(e => !e.published).length} pending events`);
      }
    } catch (_err) {
      // Log silenciado propositalmente — falha nao bloqueia fluxo
    }
  }
}
