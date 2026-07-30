import { createLogger } from '@ideia/logger';

const logger = createLogger('llm-integration:connection-pool');

export interface PooledConnection {
  id: string;
  provider: string;
  model: string;
  createdAt: number;
  lastUsed: number;
  active: boolean;
  healthy: boolean;
  endpoint?: string;
}

export interface ConnectionPoolConfig {
  maxPoolSize: number;
  idleTimeoutMs: number;
  healthCheckIntervalMs: number;
  acquireTimeoutMs: number;
  keepAliveMs: number;
  keepAliveEndpoint?: string;
}

interface AcquireWaiter {
  provider: string;
  model: string;
  resolve: (conn: PooledConnection) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class LLMConnectionPool {
  private connections: PooledConnection[] = [];
  private config: ConnectionPoolConfig;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private nextId = 0;
  private waitQueue: AcquireWaiter[] = [];

  constructor(config?: Partial<ConnectionPoolConfig>) {
    this.config = {
      maxPoolSize: 10,
      idleTimeoutMs: 300000,
      healthCheckIntervalMs: 60000,
      acquireTimeoutMs: 5000,
      keepAliveMs: 30000,
      ...config,
    };
  }

  start(): void {
    this.healthTimer = setInterval(() => this.healthCheck(), this.config.healthCheckIntervalMs);
    this.keepAliveTimer = setInterval(() => this.pingIdle(), this.config.keepAliveMs);
  }

  stop(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    const waiters = this.waitQueue.splice(0);
    for (const w of waiters) {
      clearTimeout(w.timer);
      w.reject(new Error('Connection pool stopped'));
    }
  }

  async acquire(provider: string, model: string, timeoutMs?: number): Promise<PooledConnection> {
    const timeout = timeoutMs ?? this.config.acquireTimeoutMs;

    const existing = this.connections.find(
      c => c.provider === provider && c.model === model && !c.active && c.healthy
    );
    if (existing) {
      existing.active = true;
      existing.lastUsed = Date.now();
      return existing;
    }

    if (this.connections.length < this.config.maxPoolSize) {
      const conn = this.createConnection(provider, model);
      this.connections.push(conn);
      return conn;
    }

    return new Promise<PooledConnection>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waitQueue.findIndex(w => w.timer === timer);
        if (idx >= 0) this.waitQueue.splice(idx, 1);
        reject(new Error(`Connection pool timeout: no available connection for ${provider}/${model}`));
      }, timeout);
      this.waitQueue.push({ provider, model, resolve, reject, timer });
    });
  }

  private fulfillWaiter(): void {
    if (this.waitQueue.length === 0) return;
    const next = this.waitQueue[0];
    const existing = this.connections.find(
      c => c.provider === next.provider && c.model === next.model && !c.active && c.healthy
    );
    if (existing) {
      this.waitQueue.shift();
      clearTimeout(next.timer);
      existing.active = true;
      existing.lastUsed = Date.now();
      next.resolve(existing);
      return;
    }
    if (this.connections.length < this.config.maxPoolSize) {
      this.waitQueue.shift();
      clearTimeout(next.timer);
      const conn = this.createConnection(next.provider, next.model);
      this.connections.push(conn);
      next.resolve(conn);
    }
  }

  release(connection: PooledConnection): void {
    connection.active = false;
    connection.lastUsed = Date.now();
    this.fulfillWaiter();
  }

  releaseByProvider(provider: string): void {
    const released = this.connections.filter(c => c.provider === provider && c.active);
    for (const conn of released) {
      conn.active = false;
      conn.lastUsed = Date.now();
    }
    this.fulfillWaiter();
  }

  remove(connection: PooledConnection): void {
    const idx = this.connections.indexOf(connection);
    if (idx >= 0) {
      this.connections.splice(idx, 1);
    }
  }

  getActiveCount(): number {
    return this.connections.filter(c => c.active).length;
  }

  getIdleCount(): number {
    return this.connections.filter(c => !c.active && c.healthy).length;
  }

  getWaitCount(): number {
    return this.waitQueue.length;
  }

  getStats(): {
    total: number;
    active: number;
    idle: number;
    unhealthy: number;
    waitCount: number;
    byProvider: Record<string, { total: number; active: number }>;
  } {
    const active = this.connections.filter(c => c.active).length;
    const unhealthy = this.connections.filter(c => !c.healthy).length;
    const byProvider: Record<string, { total: number; active: number }> = {};
    for (const conn of this.connections) {
      if (!byProvider[conn.provider]) {
        byProvider[conn.provider] = { total: 0, active: 0 };
      }
      byProvider[conn.provider].total++;
      if (conn.active) byProvider[conn.provider].active++;
    }
    return {
      total: this.connections.length,
      active,
      idle: this.connections.length - active,
      unhealthy,
      waitCount: this.waitQueue.length,
      byProvider,
    };
  }

  private createConnection(provider: string, model: string): PooledConnection {
    return {
      id: `pool_${this.nextId++}_${Date.now()}`,
      provider,
      model,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      active: true,
      healthy: true,
      endpoint: this.config.keepAliveEndpoint,
    };
  }

  private async healthCheck(): Promise<void> {
    for (const conn of this.connections) {
      if (conn.active) continue;
      const idleTime = Date.now() - conn.lastUsed;
      if (idleTime > this.config.idleTimeoutMs) {
        logger.debug('Removing idle connection', { id: conn.id, provider: conn.provider, idleTime });
        this.remove(conn);
      }
    }
  }

  private async pingIdle(): Promise<void> {
    const idle = this.connections.filter(c => !c.active);
    for (const conn of idle) {
      try {
        const endpoint = conn.endpoint || 'http://localhost:11434';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${endpoint}/api/tags`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        conn.healthy = response.ok;
        conn.lastUsed = Date.now();
      } catch {
        conn.healthy = false;
        logger.warn('Keep-alive ping failed for connection', { id: conn.id, provider: conn.provider });
      }
    }
  }

  destroy(): void {
    this.stop();
    this.connections = [];
    const waiters = this.waitQueue.splice(0);
    for (const w of waiters) {
      clearTimeout(w.timer);
      w.reject(new Error('Connection pool destroyed'));
    }
  }
}
