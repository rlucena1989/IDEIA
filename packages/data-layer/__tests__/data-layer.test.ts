import { DataLayer, createDataLayer } from '../src/data-layer';

describe('DataLayer', () => {
  let layer: DataLayer;

  beforeAll(async () => {
    layer = createDataLayer({ type: 'sqlite' });
    await layer.connect({ type: 'sqlite' });
  });
  afterAll(async () => { await layer.disconnect(); });

  it('should connect and run migrations', () => {
    expect(layer.isConnected).toBe(true);
  });

  it('should create, query, and end sessions', async () => {
    const sessionId = await layer.createSession('/test/workspace');
    expect(sessionId).toBeTruthy();

    const result = await layer.query<{ id: string; status: string }>('SELECT id, status FROM ideia_sessions WHERE id = ?', [sessionId]);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].status).toBe('active');

    await layer.endSession(sessionId);
    const ended = await layer.query<{ status: string }>('SELECT status FROM ideia_sessions WHERE id = ?', [sessionId]);
    expect(ended.rows.length).toBe(1);
    expect(ended.rows[0].status).toBe('ended');
  });

  it('should record and query decisions', async () => {
    await layer.recordDecision({ actionId: 'act-1', actionType: 'file.write', decision: 'auto' });

    const result = await layer.query<{ action_id: string; decision: string }>('SELECT action_id, decision FROM ideia_decisions WHERE action_id = ?', ['act-1']);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].decision).toBe('auto');
  });
});

describe('VectorStore', () => {
  let layer: DataLayer;

  beforeAll(async () => {
    layer = createDataLayer({ type: 'sqlite', vectorDimensions: 3 });
    await layer.connect({ type: 'sqlite' });
  });
  afterAll(async () => { await layer.disconnect(); });

  it('should insert, search, count and delete vectors', async () => {
    const vstore = layer.vector;

    await vstore.insert('id-1', 'greeting', [1, 0, 0], 'Hello world', { source: 'test' });
    await vstore.insert('id-2', 'farewell', [0, 1, 0], 'Goodbye world', { source: 'test' });

    const results = await vstore.search([0.9, 0.1, 0], 5);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].key).toBe('greeting');

    const count = await vstore.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await vstore.delete('farewell');
    const afterDelete = await vstore.search([0, 1, 0], 5);
    expect(afterDelete.every(r => r.key !== 'farewell')).toBe(true);
  });
});
