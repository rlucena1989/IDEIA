import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ScannerPool } from '../src/scanner-pool';
import type { EventBus } from '@ideia/event-bus';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
  Logger: jest.fn(),
}));

function createMockBus(): EventBus {
  return { emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn(), publish: jest.fn() } as unknown as EventBus;
}

function mockLogger(): any {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
}

describe('ScannerPool', () => {
  let pool: ScannerPool;
  let bus: EventBus;

  beforeEach(() => {
    bus = createMockBus();
    pool = new ScannerPool(bus, mockLogger());
  });

  it('initializes with default scanner configs', () => {
    const health = pool.getHealth();
    expect(health.scanners).toBeDefined();
    expect(health.overall).toBeDefined();
  });

  it('scanAll returns results for enabled scanners due', async () => {
    const results = await pool.scanAll();
    expect(Array.isArray(results)).toBe(true);
  });

  it('scanOne runs a specific scanner', async () => {
    const result = await pool.scanOne('health');
    expect(result.scanner).toBe('health');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('health scanner returns findings', async () => {
    const result = await pool.scanOne('health');
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.some(f => f.code === 'HEALTH-001')).toBe(true);
  });

  it('version scanner returns version info', async () => {
    const result = await pool.scanOne('version');
    expect(result.findings.length).toBe(2);
    expect(result.findings.some(f => f.code === 'VER-001')).toBe(true);
  });

  it('getResults returns all stored results', () => {
    const results = pool.getResults();
    expect(results instanceof Map).toBe(true);
  });

  it('deriveRecommendations returns critical findings', () => {
    const results = pool['deriveRecommendations']('test', [
      { severity: 'critical', message: 'Critical issue', code: 'CRIT-001' },
      { severity: 'info', message: 'Info issue', code: 'INF-001' },
    ]);
    expect(results.length).toBe(1);
    expect(results[0].priority).toBe(1);
  });

  it('calculateScore deducts for critical findings', () => {
    const score = pool['calculateScore']([
      { severity: 'critical', message: 'Critical', code: 'C1' },
      { severity: 'high', message: 'High', code: 'H1' },
    ]);
    expect(score).toBe(55);
  });

  it('calculateScore caps at 0 minimum', () => {
    const score = pool['calculateScore']([
      { severity: 'critical', message: 'C1', code: 'C1' },
      { severity: 'critical', message: 'C2', code: 'C2' },
      { severity: 'critical', message: 'C3', code: 'C3' },
      { severity: 'critical', message: 'C4', code: 'C4' },
    ]);
    expect(score).toBe(0);
  });
});
