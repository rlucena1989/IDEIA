import fs from 'fs';
import { AnalyticsEngine, createAnalyticsEngine, AnalyticsResult } from '../analytics-engine';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (fs.existsSync as jest.Mock).mockReturnValue(false);
});

describe('AnalyticsEngine', () => {
  let engine: AnalyticsEngine;

  beforeEach(() => {
    engine = new AnalyticsEngine('/tmp/test');
  });

  it('track() adds a record and persists', () => {
    const record = engine.track('test-category', 'test-event', 42, { env: 'test' });

    expect(record.category).toBe('test-category');
    expect(record.event).toBe('test-event');
    expect(record.value).toBe(42);
    expect(record.tags).toEqual({ env: 'test' });
    expect(record.timestamp).toBeDefined();
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('query() filters by category', () => {
    engine.track('cat-a', 'event-1', 1);
    engine.track('cat-b', 'event-2', 2);
    engine.track('cat-a', 'event-3', 3);

    const result = engine.query({ category: 'cat-a' });

    expect(result.totalRows).toBe(2);
    expect(result.rows).toHaveLength(2);
    result.rows.forEach(row => expect(row[1]).toBe('cat-a'));
  });

  it('query() filters by event', () => {
    engine.track('a', 'ev-1', 1);
    engine.track('b', 'ev-2', 2);
    engine.track('a', 'ev-1', 3);

    const result = engine.query({ event: 'ev-1' });

    expect(result.totalRows).toBe(2);
    result.rows.forEach(row => expect(row[2]).toBe('ev-1'));
  });

  it('query with date range filters correctly', () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 3600000);

    (engine as unknown as { records: Array<{ timestamp: string; category: string; event: string; value: number; tags: Record<string, string> }> }).records = [
      { timestamp: earlier.toISOString(), category: 'test', event: 'old', value: 1, tags: {} },
      { timestamp: now.toISOString(), category: 'test', event: 'new', value: 2, tags: {} },
    ];

    const result = engine.query({ fromDate: now.toISOString() });

    expect(result.totalRows).toBe(1);
    expect(result.rows[0][2]).toBe('new');
  });

  it('query respects toDate filter', () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 3600000);

    (engine as unknown as { records: Array<{ timestamp: string; category: string; event: string; value: number; tags: Record<string, string> }> }).records = [
      { timestamp: earlier.toISOString(), category: 'test', event: 'old', value: 1, tags: {} },
      { timestamp: now.toISOString(), category: 'test', event: 'new', value: 2, tags: {} },
    ];

    const result = engine.query({ toDate: earlier.toISOString() });

    expect(result.totalRows).toBe(1);
    expect(result.rows[0][2]).toBe('old');
  });

  it('aggregate sum works with groupBy', () => {
    engine.track('sales', 'item', 10);
    engine.track('marketing', 'item', 20);
    engine.track('sales', 'item', 30);

    const result = engine.query({ groupBy: ['category'] });

    expect(result.columns).toContain('sum');
    expect(result.columns).toContain('count');
    const salesRow = result.rows.find(r => String(r[0]) === 'sales');
    expect(salesRow).toBeDefined();
    expect(salesRow![2]).toBe(40);
  });

  it('engine persists records to fs', () => {
    engine.track('a', 'e1', 1);
    engine.track('b', 'e2', 2);

    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    const content = (fs.writeFileSync as jest.Mock).mock.calls[0][1] as string;
    expect(content).toContain('"category":"a"');
  });
});

describe('createAnalyticsEngine', () => {
  it('creates an AnalyticsEngine instance', () => {
    const engine = createAnalyticsEngine('/tmp/test');
    expect(engine).toBeInstanceOf(AnalyticsEngine);
  });
});

describe('AnalyticsEngine — non-core methods', () => {
  let engine: AnalyticsEngine;

  beforeEach(() => {
    engine = new AnalyticsEngine('/tmp/test');
    engine.track('cat-a', 'ev-1', 1);
    engine.track('cat-b', 'ev-2', 2);
    engine.track('cat-a', 'ev-3', 3);
  });

  it('getCategories() returns unique categories', () => {
    const cats = engine.getCategories();
    expect(cats).toEqual(['cat-a', 'cat-b']);
  });

  it('getEvents() returns events filtered by category', () => {
    const events = engine.getEvents('cat-a');
    expect(events).toEqual(['ev-1', 'ev-3']);
  });

  it('getSummary() returns accurate statistics', () => {
    const summary = engine.getSummary();
    expect(summary.totalRecords).toBe(3);
    expect(summary.categories).toBe(2);
    expect(summary.firstEvent).not.toBeNull();
    expect(summary.lastEvent).not.toBeNull();
  });

  it('clear() removes all records and persists', () => {
    engine.clear();
    expect(engine.getSummary().totalRecords).toBe(0);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});
