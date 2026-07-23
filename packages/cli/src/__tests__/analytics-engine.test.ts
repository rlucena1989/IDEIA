import { AnalyticsEngine, createAnalyticsEngine } from '../analytics/analytics-engine';
import path from 'path';
import os from 'os';

describe('AnalyticsEngine', () => {
  let engine: AnalyticsEngine;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `analytics-test-${Date.now()}`);
    require('fs').mkdirSync(tmpDir, { recursive: true });
    engine = createAnalyticsEngine(tmpDir);
  });

  it('starts empty', () => {
    const s = engine.getSummary();
    expect(s.totalRecords).toBe(0);
  });

  it('tracks records', () => {
    const r = engine.track('llm', 'request', 1, { model: 'gpt-4' });
    expect(r.category).toBe('llm');
    expect(r.event).toBe('request');
    expect(r.value).toBe(1);
    expect(r.tags.model).toBe('gpt-4');
  });

  it('queries by category', () => {
    engine.track('llm', 'request', 1);
    engine.track('agent', 'decision', 1);
    const result = engine.query({ category: 'llm' });
    expect(result.totalRows).toBe(1);
  });

  it('queries by event', () => {
    engine.track('llm', 'request', 1);
    engine.track('llm', 'response', 1);
    const result = engine.query({ event: 'request' });
    expect(result.totalRows).toBe(1);
  });

  it('groups by tag', () => {
    engine.track('llm', 'request', 5, { model: 'gpt-4' });
    engine.track('llm', 'request', 3, { model: 'claude' });
    const result = engine.query({ groupBy: ['tags.model'], aggregate: 'sum' });
    expect(result.columns).toContain('sum');
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
  });

  it('returns categories', () => {
    engine.track('llm', 'req', 1);
    engine.track('agent', 'dec', 1);
    const cats = engine.getCategories();
    expect(cats).toContain('llm');
    expect(cats).toContain('agent');
  });

  it('returns events filtered by category', () => {
    engine.track('llm', 'request', 1);
    engine.track('llm', 'response', 1);
    engine.track('agent', 'decision', 1);
    const events = engine.getEvents('llm');
    expect(events).toContain('request');
    expect(events).toContain('response');
    expect(events).not.toContain('decision');
  });

  it('generates time series', () => {
    engine.track('llm', 'request', 1);
    engine.track('llm', 'request', 1);
    const ts = engine.getTimeSeries('llm', 'request', 60);
    expect(ts.length).toBe(1);
    expect(ts[0].count).toBe(2);
  });

  it('clears all data', () => {
    engine.track('llm', 'req', 1);
    engine.clear();
    expect(engine.getSummary().totalRecords).toBe(0);
  });

  it('persists data to disk', () => {
    engine.track('llm', 'req', 42);
    const engine2 = createAnalyticsEngine(tmpDir);
    expect(engine2.getSummary().totalRecords).toBe(1);
  });

  it('limits records', () => {
    const limited = new AnalyticsEngine(tmpDir);
    (limited as any).maxRecords = 5;
    for (let i = 0; i < 10; i++) limited.track('test', 'e', i);
    expect(limited.getSummary().totalRecords).toBeLessThanOrEqual(5);
  });

  it('factory creates instance', () => {
    expect(createAnalyticsEngine()).toBeInstanceOf(AnalyticsEngine);
  });
});
