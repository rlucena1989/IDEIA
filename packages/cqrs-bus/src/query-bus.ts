import { IKvStore } from './command-bus';
import { createLogger } from '@ideia/logger';
const logger = createLogger('query-bus');

export interface Query {
  type: 'get_by_id' | 'list' | 'search';
  collection: string;
  id?: string;
  filter?: Record<string, unknown>;
  query?: string;
}

export class QueryBus {
  constructor(private kv: IKvStore) {}

  async execute<T>(query: Query): Promise<T> {
    switch (query.type) {
      case 'get_by_id': {
        if (!query.id) throw new Error('id required for get_by_id');
        const entry = await this.kv.get(`proj:${query.collection}:${query.id}`);
        return entry ? JSON.parse(new TextDecoder().decode(entry.value)) as T : undefined as T;
      }
      case 'list':
        return this.listCollection<T>(query.collection, query.filter);
      case 'search':
        return this.searchCollection<T>(query.collection, query.query ?? '');
      default:
        throw new Error(`Unknown query type: ${query.type}`);
    }
  }

  private async listCollection<T>(_collection: string, _filter?: Record<string, unknown>): Promise<T> {
    return [] as T;
  }

  private async searchCollection<T>(_collection: string, _query: string): Promise<T> {
    return [] as T;
  }

  async queryCached<T>(query: Query, ttl = 5000): Promise<T> {
    const cacheKey = `qcache:${JSON.stringify(query)}`;
    const cached = await this.kv.get(cacheKey);
    if (cached) return JSON.parse(new TextDecoder().decode(cached.value));
    const result = await this.execute<T>(query);
    await this.kv.put(cacheKey, new TextEncoder().encode(JSON.stringify(result)), { ttl });
    return result;
  }

  async queryWithConsistency<T>(query: Query, projectionName: string, maxWait = 5000): Promise<T> {
    const cm = new (require('./consistency-manager').ConsistencyManager)(this.kv);
    await cm.waitForConsistency(projectionName, maxWait);
    return this.execute<T>(query);
  }
}
