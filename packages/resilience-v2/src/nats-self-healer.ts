import { createLogger } from '@ideia/logger';

const logger = createLogger('resilience-v2:nats-self-healer');

export interface NatsSelfHealConfig {
  reconnectIntervalMs: number;
  maxReconnectAttempts: number;
  healthCheckIntervalMs: number;
  cooldownMs: number;
  endpoint: string;
}

export class NatsSelfHealer {
  private config: NatsSelfHealConfig;
  private reconnectAttempts = 0;
  private connected = false;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private eventBus: { connect?: () => Promise<void>; disconnect?: () => Promise<void>; status?: { connected: boolean } } | null = null;

  constructor(config?: Partial<NatsSelfHealConfig>) {
    this.config = {
      reconnectIntervalMs: 2000,
      maxReconnectAttempts: 10,
      healthCheckIntervalMs: 15000,
      cooldownMs: 60000,
      endpoint: process.env.NATS_URL || 'nats://localhost:4222',
      ...config,
    };
  }

  async start(): Promise<void> {
    await this.loadEventBus();
    this.healthTimer = setInterval(() => this.checkAndHeal(), this.config.healthCheckIntervalMs);
    logger.info('NATS self-healer started');
  }

  stop(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  async forceReconnect(): Promise<boolean> {
    return this.reconnectNats();
  }

  private async loadEventBus(): Promise<void> {
    try {
      const mod = await import('@ideia/event-bus');
      const modAny = mod as Record<string, unknown>;
      const eventBusProto = modAny.EventBus as { prototype?: { connect?: () => Promise<void>; disconnect?: () => Promise<void> } } | undefined;
      if (eventBusProto?.prototype) {
        this.eventBus = eventBusProto.prototype as { connect: () => Promise<void>; disconnect: () => Promise<void> };
      } else {
        const connMgr = modAny.connectionManager as { connect?: () => Promise<void>; disconnect?: () => Promise<void>; status?: { connected: boolean } } | undefined;
        if (connMgr) {
          this.eventBus = connMgr as { connect: () => Promise<void>; disconnect: () => Promise<void>; status?: { connected: boolean } };
        }
      }
    } catch {
      logger.warn('@ideia/event-bus not available for NATS self-healing');
    }
  }

  private async checkAndHeal(): Promise<void> {
    const wasConnected = this.connected;
    this.connected = await this.pingNats();

    if (wasConnected && !this.connected) {
      logger.warn('NATS connection lost, initiating reconnect');
      this.scheduleReconnect();
    } else if (!wasConnected && this.connected) {
      logger.info('NATS connection restored');
      this.reconnectAttempts = 0;
    }
  }

  private async pingNats(): Promise<boolean> {
    if (!this.eventBus && this.reconnectAttempts < 2) {
      await this.loadEventBus();
    }

    try {
      if (this.eventBus && 'status' in this.eventBus && this.eventBus.status) {
        return this.eventBus.status.connected;
      }
      const response = await fetch(`${this.config.endpoint.replace('nats://', 'http://')}/health`, {
        signal: AbortSignal.timeout(3000),
      }).catch(() => null);
      return response?.ok ?? false;
    } catch {
      return false;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('Max NATS reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectIntervalMs * Math.pow(2, this.reconnectAttempts - 1),
      60000,
    );

    logger.info(`Scheduling NATS reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectNats()
        .then(success => {
          if (!success) this.scheduleReconnect();
        })
        .catch(() => this.scheduleReconnect());
    }, delay);
  }

  private async reconnectNats(): Promise<boolean> {
    try {
      if (!this.eventBus) await this.loadEventBus();
      if (this.eventBus) {
        if (typeof this.eventBus.disconnect === 'function') {
          await this.eventBus.disconnect().catch(() => {});
        }
        if (typeof this.eventBus.connect === 'function') {
          await this.eventBus.connect();
        }
      }

      const connected = await this.pingNats();
      this.connected = connected;

      if (connected) {
        logger.info('NATS reconnected successfully');
        this.reconnectAttempts = 0;
      } else {
        logger.warn('NATS reconnect attempt failed');
      }

      return connected;
    } catch (err) {
      logger.error('NATS reconnect error', { error: String(err) });
      return false;
    }
  }
}
