import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { QueryBus, Query } from '../src/query-bus';
import type { IKvStore } from '../src/command-bus';

function createMockKv(): IKvStore {
  return {
    get: jest.fn() as any,
    put: jest.fn() as any,
  } as unknown as IKvStore;
}

describe('QueryBus', () => {
  let kv: IKvStore;
  let queryBus: QueryBus;

  beforeEach(() => {
    kv = createMockKv();
    queryBus = new QueryBus(kv);
  });

  it('get_by_id returns parsed entry when found', async () => {
    const data = { id: 'agg-1', name: 'Test' };
    (kv.get as any).mockResolvedValue({ value: new TextEncoder().encode(JSON.stringify(data)) });
    const query: Query = { type: 'get_by_id', collection: 'users', id: 'agg-1' };
    const result = await queryBus.execute<typeof data>(query);
    expect(result).toEqual(data);
  });

  it('get_by_id returns undefined when not found', async () => {
    (kv.get as any).mockResolvedValue(null);
    const query: Query = { type: 'get_by_id', collection: 'users', id: 'missing' };
    const result = await queryBus.execute(query);
    expect(result).toBeUndefined();
  });

  it('get_by_id throws when id is missing', async () => {
    const query: Query = { type: 'get_by_id', collection: 'users' } as any;
    await expect(queryBus.execute(query)).rejects.toThrow('id required for get_by_id');
  });

  it('list returns empty array', async () => {
    const result = await queryBus.execute({ type: 'list', collection: 'items' });
    expect(result).toEqual([]);
  });

  it('search returns empty array', async () => {
    const result = await queryBus.execute({ type: 'search', collection: 'items', query: 'test' });
    expect(result).toEqual([]);
  });

  it('throws for unknown query type', async () => {
    await expect(queryBus.execute({ type: 'unknown' as any, collection: 'x' })).rejects.toThrow('Unknown query type');
  });

  it('queryCached returns cached result when available', async () => {
    const data = { cached: true };
    (kv.get as any).mockResolvedValue({ value: new TextEncoder().encode(JSON.stringify(data)) });
    const query: Query = { type: 'list', collection: 'test' };
    const result = await queryBus.queryCached(query);
    expect(result).toEqual(data);
    expect(kv.get).toHaveBeenCalled();
  });
});
