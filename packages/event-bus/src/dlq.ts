import { NatsConnectionManager } from './nats-connection';
import { createLogger } from '@ideia/logger';

const log = createLogger('dead-letter-queue');

export interface DeadLetterMessage {
  id?: string;
  originalSubject: string;
  originalData: unknown;
  error: string;
  timestamp: number;
  retryCount: number;
  maxRetries?: number;
}

export interface DLQConfig {
  maxRetries?: number;
  maxAge?: number;
  maxMessages?: number;
}

const DEFAULT_DLQ_CONFIG: DLQConfig = {
  maxRetries: 3,
  maxAge: 24 * 60 * 60 * 1000,
  maxMessages: 10000,
};

export class DeadLetterQueue {
  private connectionManager: NatsConnectionManager;
  private config: DLQConfig;
  private messages: DeadLetterMessage[] = [];

  constructor(connectionManager: NatsConnectionManager, config: DLQConfig = {}) {
    this.connectionManager = connectionManager;
    this.config = { ...DEFAULT_DLQ_CONFIG, ...config };
  }

  async initialize(config?: Partial<DLQConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    try {
      await this.connectionManager.connect();
      log.info('Initialized');
    } catch (_err) {
      log.info(`Initialized (offline mode): ${_err}`);
    }
  }

  async add(message: DeadLetterMessage): Promise<void> {
    const now = Date.now();
    const enrichedMessage: DeadLetterMessage = {
      ...message,
      id: message.id || `dlq-${now}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now,
      retryCount: message.retryCount || 0,
      maxRetries: message.maxRetries || this.config.maxRetries,
    };
    this.messages.push(enrichedMessage);
    await this.cleanup();
    log.info(`Added message to DLQ: ${message.originalSubject} (retry ${enrichedMessage.retryCount})`);
  }

  async getRetryableMessages(): Promise<DeadLetterMessage[]> {
    return this.messages.filter(msg => {
      const maxRetries = msg.maxRetries ?? this.config.maxRetries;
      return msg.retryCount < (maxRetries ?? 3);
    });
  }

  async getFailedMessages(): Promise<DeadLetterMessage[]> {
    return this.messages.filter(msg => {
      const maxRetries = msg.maxRetries ?? this.config.maxRetries;
      return msg.retryCount >= (maxRetries ?? 3);
    });
  }

  async retry(message: DeadLetterMessage): Promise<void> {
    const found = this.messages.find(m => m.id === message.id || m === message);
    if (!found) throw new Error('Message not found in DLQ');
    found.retryCount++;
    found.timestamp = Date.now();
    const maxRetries = found.maxRetries ?? this.config.maxRetries;
    if (found.retryCount < (maxRetries ?? 3)) {
      log.info(`Retrying message: ${found.originalSubject} (attempt ${found.retryCount})`);
    } else {
      log.warn(`Message permanently failed: ${found.originalSubject}`);
    }
  }

  async remove(message: DeadLetterMessage): Promise<void> {
    const idx = this.messages.findIndex(m => (message.id && m.id === message.id) || m === message);
    if (idx !== -1) {
      this.messages.splice(idx, 1);
      log.info(`Removed message from DLQ: ${message.originalSubject}`);
    }
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    if (this.config.maxAge) {
      const cutoff = now - this.config.maxAge;
      this.messages = this.messages.filter(msg => msg.timestamp >= cutoff);
    }
    if (this.config.maxMessages && this.messages.length > this.config.maxMessages) {
      this.messages = this.messages.slice(-this.config.maxMessages);
    }
  }

  async getStats(): Promise<{ total: number; retryable: number; failed: number }> {
    const retryable = await this.getRetryableMessages();
    const failed = await this.getFailedMessages();
    return { total: this.messages.length, retryable: retryable.length, failed: failed.length };
  }

  async purge(): Promise<void> {
    const count = this.messages.length;
    this.messages = [];
    log.info(`Purged ${count} messages`);
  }
}

export function createDeadLetterQueue(
  connectionManager: NatsConnectionManager,
  config?: DLQConfig
): DeadLetterQueue {
  return new DeadLetterQueue(connectionManager, config);
}
