import { DatabaseAdapter, DataLayerConfig, QueryResult } from './types';

export interface ReplicaConfig {
  replicas: { host: string; port: number; weight: number }[];
  healthCheckIntervalMs: number;
  fallbackToPrimary: boolean;
  stickySessions: boolean;
}

export class ReplicaManager {
  private replicas: { host: string; port: number; weight: number; healthy: boolean; lastCheck: number }[] = [];
  private adapters: Map<string, DatabaseAdapter> = new Map();
  private primaryAdapter: DatabaseAdapter;
  private config: ReplicaConfig;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private currentIndex = 0;
  private totalWeight = 0;

  constructor(primaryAdapter: DatabaseAdapter, config?: Partial<ReplicaConfig>) {
    this.primaryAdapter = primaryAdapter;
    this.config = {
      replicas: [],
      healthCheckIntervalMs: 30_000,
      fallbackToPrimary: true,
      stickySessions: false,
      ...config,
    };
    for (const r of this.config.replicas) {
      this.replicas.push({ ...r, healthy: true, lastCheck: 0 });
      this.totalWeight += r.weight;
    }
    if (this.config.replicas.length > 0) {
      this.healthTimer = setInterval(() => this.checkHealth(), this.config.healthCheckIntervalMs);
    }
  }

  async initReplica(config: DataLayerConfig, replicaCfg: { host: string; port: number }): Promise<DatabaseAdapter> {
    const { PgAdapter } = await import('./adapters/pg-adapter');
    const adapter = new PgAdapter();
    await adapter.connect({ ...config, host: replicaCfg.host, port: replicaCfg.port });
    return adapter;
  }

  async query<T>(sql: string, params?: unknown[], useReplica = true): Promise<QueryResult<T>> {
    if (!useReplica || this.replicas.length === 0 || !this.hasHealthyReplica()) {
      return this.primaryAdapter.query<T>(sql, params);
    }
    const replica = this.pickReplica();
    if (!replica && this.config.fallbackToPrimary) {
      return this.primaryAdapter.query<T>(sql, params);
    }
    if (!replica) throw new Error('No healthy replicas available');
    return this.getAdapter(replica).query<T>(sql, params);
  }

  private hasHealthyReplica(): boolean {
    return this.replicas.some(r => r.healthy);
  }

  private pickReplica(): typeof this.replicas[0] | null {
    const healthy = this.replicas.filter(r => r.healthy);
    if (healthy.length === 0) return null;
    if (healthy.length === 1) return healthy[0];

    let roll = Math.random() * this.totalWeight;
    for (const r of healthy) {
      roll -= r.weight;
      if (roll <= 0) return r;
    }
    return healthy[healthy.length - 1];
  }

  private getAdapter(replica: typeof this.replicas[0]): DatabaseAdapter {
    const key = `${replica.host}:${replica.port}`;
    let adapter = this.adapters.get(key);
    if (!adapter) {
      adapter = new Proxy({} as DatabaseAdapter, {
        get: (_, prop) => {
          if (prop === 'query') return async <T>(sql: string, params?: unknown[]) => {
            if (!replica.healthy && this.config.fallbackToPrimary) {
              return this.primaryAdapter.query<T>(sql, params);
            }
            throw new Error(`Replica ${key} not initialized. Call initReplica() first.`);
          };
          if (prop === 'isConnected') return () => replica.healthy;
          return () => { throw new Error('Not implemented on replica proxy'); };
        },
      });
      this.adapters.set(key, adapter);
    }
    return adapter;
  }

  async registerReplica(host: string, port: number, weight = 1): Promise<void> {
    const existing = this.replicas.find(r => r.host === host && r.port === port);
    if (existing) {
      existing.weight = weight;
      return;
    }
    this.replicas.push({ host, port, weight, healthy: true, lastCheck: 0 });
    this.totalWeight += weight;
  }

  async checkHealth(): Promise<void> {
    for (const replica of this.replicas) {
      try {
        const adapter = this.adapters.get(`${replica.host}:${replica.port}`);
        if (adapter) {
          await adapter.query('SELECT 1');
          replica.healthy = true;
        } else {
          replica.healthy = true;
        }
      } catch {
        replica.healthy = false;
      }
      replica.lastCheck = Date.now();
    }
  }

  getHealthyCount(): number {
    return this.replicas.filter(r => r.healthy).length;
  }

  async close(): Promise<void> {
    if (this.healthTimer) clearInterval(this.healthTimer);
    for (const [_key, adapter] of this.adapters) {
      try { await adapter.disconnect(); } catch { }
    }
    this.adapters.clear();
  }
}
