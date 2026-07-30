import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RollbackManager, createRollbackManager } from '../src/rollback-manager';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));

describe('RollbackManager', () => {
  let manager: RollbackManager;

  beforeEach(() => {
    manager = new RollbackManager();
  });

  it('saves a rollback point', () => {
    const point = manager.savePoint('Test change', { key: 'value' }, { throughput: 100 });
    expect(point.id).toContain('rb-');
    expect(point.description).toBe('Test change');
    expect(point.snapshot).toEqual({ key: 'value' });
    expect(point.metrics.throughput).toBe(100);
  });

  it('returns undefined for non-existent point', () => {
    expect(manager.getPoint('nonexistent')).toBeUndefined();
  });

  it('lists saved rollback points', () => {
    manager.savePoint('First', { a: 1 });
    manager.savePoint('Second', { b: 2 });

    const points = manager.listPoints();
    expect(points.length).toBe(2);
  });

  it('limits points to max of 20', () => {
    for (let i = 0; i < 25; i++) {
      manager.savePoint(`Point ${i}`, { idx: i });
    }

    expect(manager.listPoints().length).toBe(20);
  });

  it('rollback returns error for unknown point id', async () => {
    const result = await manager.rollback('unknown-id');
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Rollback point unknown-id not found');
  });

  it('rollback succeeds for existing point', async () => {
    const saved = manager.savePoint('Test', { data: 'test' }, { throughput: 50, errorRate: 0.01 });
    const result = await manager.rollback(saved.id);

    expect(result.success).toBe(true);
    expect(result.restoredMetrics.throughput).toBe(50);
  });

  it('rollbackToLatest returns null when no points', async () => {
    const result = await manager.rollbackToLatest();
    expect(result).toBeNull();
  });

  it('rollbackToLatest rolls back most recent point', async () => {
    manager.savePoint('Old', { v: 1 });
    manager.savePoint('Recent', { v: 2 });

    const result = await manager.rollbackToLatest();
    expect(result).not.toBeNull();
    expect(result!.point!.description).toBe('Recent');
  });

  it('clears all points', () => {
    manager.savePoint('Temp', { x: 1 });
    manager.clear();
    expect(manager.listPoints().length).toBe(0);
  });

  it('createRollbackManager factory works', () => {
    expect(createRollbackManager()).toBeInstanceOf(RollbackManager);
  });
});
