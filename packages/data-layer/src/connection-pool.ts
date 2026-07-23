export interface PoolConfig {
  maxConnections: number;
  minConnections: number;
  idleTimeoutMs: number;
  acquireTimeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface PoolMetrics {
  total: number;
  active: number;
  idle: number;
  waiting: number;
  maxConnections: number;
}

interface Connection {
  id: number;
  state: 'active' | 'idle';
  acquiredAt: number;
  lastUsedAt: number;
}

export class ConnectionPool<T> {
  private pool: Connection[] = [];
  private waiting: Array<{ resolve: (conn: Connection) => void; reject: (err: Error) => void; startedAt: number }> = [];
  private nextId = 1;
  private metrics = { acquired: 0, released: 0, timeouts: 0, errors: 0 };

  private config: PoolConfig;
  private connectFn: () => Promise<T>;
  private disconnectFn: (conn: T) => Promise<void>;
  private validateFn?: (conn: T) => boolean;

  private cleanupTimer: ReturnType<typeof setInterval>;
  private connections = new Map<number, T>();

  constructor(
    connectFn: () => Promise<T>,
    disconnectFn: (conn: T) => Promise<void>,
    config?: Partial<PoolConfig>,
  ) {
    this.connectFn = connectFn;
    this.disconnectFn = disconnectFn;
    this.config = {
      maxConnections: config?.maxConnections ?? 20,
      minConnections: config?.minConnections ?? 2,
      idleTimeoutMs: config?.idleTimeoutMs ?? 30_000,
      acquireTimeoutMs: config?.acquireTimeoutMs ?? 5_000,
      maxRetries: config?.maxRetries ?? 3,
      retryDelayMs: config?.retryDelayMs ?? 200,
    };

    this.initializeMinPool();
    this.cleanupTimer = setInterval(() => this.cleanupIdle(), 15_000);
  }

  private async initializeMinPool(): Promise<void> {
    for (let i = 0; i < this.config.minConnections; i++) {
      try {
        const conn = await this.createConnection();
        this.pool.push(conn);
      } catch {
        break;
      }
    }
  }

  private async createConnection(): Promise<Connection> {
    const actual = await this.connectFn();
    const conn: Connection = {
      id: this.nextId++,
      state: 'idle',
      acquiredAt: Date.now(),
      lastUsedAt: Date.now(),
    };
    this.connections.set(conn.id, actual);
    return conn;
  }

  setValidator(validate: (conn: T) => boolean): void {
    this.validateFn = validate;
  }

  async acquire(): Promise<{ conn: T; release: () => void }> {
    // Try to find an idle connection
    const idleIndex = this.pool.findIndex(c => c.state === 'idle');
    if (idleIndex >= 0) {
      const conn = this.pool[idleIndex];
      conn.state = 'active';
      conn.lastUsedAt = Date.now();

      const actual = this.connections.get(conn.id) ?? null;
      if (this.validateFn && !this.validateFn(actual)) {
        await this.reconnect(conn);
      }

      this.metrics.acquired++;
      return { conn: actual, release: () => this.release(conn) };
    }

    // Create new connection if under max
    if (this.pool.length < this.config.maxConnections) {
      const conn = await this.createConnection();
      conn.state = 'active';
      this.pool.push(conn);
      this.metrics.acquired++;
      return { conn: this.connections.get(conn.id) ?? null, release: () => this.release(conn) };
    }

    // Wait for a connection to be released
    return new Promise((resolve, reject) => {
      const entry = {
        resolve: (conn: Connection) => {
          const actual = this.connections.get(conn.id) ?? null;
          this.metrics.acquired++;
          resolve({ conn: actual, release: () => this.release(conn) });
        },
        reject,
        startedAt: Date.now(),
      };
      this.waiting.push(entry);

      setTimeout(() => {
        const idx = this.waiting.indexOf(entry);
        if (idx >= 0) {
          this.waiting.splice(idx, 1);
          this.metrics.timeouts++;
          reject(new Error('Connection acquire timeout'));
        }
      }, this.config.acquireTimeoutMs);
    });
  }

  private release(conn: Connection): void {
    conn.state = 'idle';
    conn.lastUsedAt = Date.now();
    this.metrics.released++;

    // Fulfill waiting request if any
    if (this.waiting.length > 0) {
      const entry = this.waiting.shift()!;
      entry.resolve(conn);
    }
  }

  private async reconnect(conn: Connection): Promise<void> {
    const old = this.connections.get(conn.id);
    if (old) {
      try { await this.disconnectFn(old); } catch { /* ignore */ }
    }
    const actual = await this.connectFn();
    this.connections.set(conn.id, actual);
  }

  private cleanupIdle(): void {
    const now = Date.now();
    const maxIdle = this.config.idleTimeoutMs;

    for (let i = this.pool.length - 1; i >= 0; i--) {
      const conn = this.pool[i];
      if (conn.state === 'idle' && (now - conn.lastUsedAt) > maxIdle) {
        if (this.pool.length > this.config.minConnections) {
          this.pool.splice(i, 1);
          const actual = this.connections.get(conn.id);
          if (actual) {
            this.disconnectFn(actual).catch(() => {});
          }
          this.connections.delete(conn.id);
        }
      }
    }
  }

  async close(): Promise<void> {
    clearInterval(this.cleanupTimer);
    const errors: Error[] = [];
    for (const [, actual] of this.connections) {
      try { await this.disconnectFn(actual); } catch (_err) { errors.push(err instanceof Error ? err : new Error(String(err))); }
    }
    this.pool = [];
    this.connections.clear();
    this.waiting.forEach(w => w.reject(new Error('Pool closed')));
    this.waiting = [];
  }

  getMetrics(): PoolMetrics {
    return {
      total: this.pool.length,
      active: this.pool.filter(c => c.state === 'active').length,
      idle: this.pool.filter(c => c.state === 'idle').length,
      waiting: this.waiting.length,
      maxConnections: this.config.maxConnections,
    };
  }

  getConfig(): PoolConfig {
    return { ...this.config };
  }
}
