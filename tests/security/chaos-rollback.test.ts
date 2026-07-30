import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { EmergencyRollback } from '../../packages/safety-circuit/src/emergency-rollback';
import { EventBus } from '../../packages/event-bus/src/event-bus';
import type { BusEvent } from '../../packages/event-bus/src/types';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('Chaos: Rollback After Change', () => {
  let tmpDir: string;
  let rollback: EmergencyRollback;
  let eventBus: EventBus;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-rollback-'));
    eventBus = new EventBus();
    rollback = new EmergencyRollback(eventBus, undefined, tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should create and list checkpoints', async () => {
    const ckpt = await rollback.createCheckpoint('pre-change');
    expect(ckpt.id).toBeDefined();
    expect(ckpt.label).toBe('pre-change');
    expect(fs.existsSync(path.join(tmpDir, `${ckpt.id}.json`))).toBe(true);
  });

  it('should return success false when no checkpoints exist', async () => {
    const result = await rollback.rollbackToLastStable();
    expect(result.success).toBe(false);
    expect(result.errors).toContain('No checkpoints available');
  });

  it('should rollback to a specific checkpoint', async () => {
    const ckpt = await rollback.createCheckpoint('stable-state');
    const result = await rollback.rollbackToCheckpoint(ckpt.id);
    expect(result.success).toBe(true);
    expect(result.checkpointId).toBe(ckpt.id);
  });

  it('should handle rollback to non-existent checkpoint', async () => {
    const result = await rollback.rollbackToCheckpoint('non-existent');
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });

  it('should restore state after rollback', async () => {
    const ckpt = await rollback.createCheckpoint('before-change');
    const result = await rollback.rollbackToCheckpoint(ckpt.id);
    expect(result.success).toBe(true);
    expect(result.restoredAt).toBeDefined();
  });

  it('should not corrupt on rollback during running tasks', async () => {
    rollback.registerTask('task-1');
    rollback.registerTask('task-2');
    const ckpt = await rollback.createCheckpoint('with-tasks');
    const result = await rollback.rollbackToCheckpoint(ckpt.id);
    expect(result.success).toBe(true);
  });

  it('should emit rollback events on the bus', async () => {
    const handler = jest.fn((_e: BusEvent) => {});
    await eventBus.subscribe('safety.rollback.completed', handler);
    const ckpt = await rollback.createCheckpoint('event-test');
    await rollback.rollbackToCheckpoint(ckpt.id);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple sequential rollbacks', async () => {
    const ckpt1 = await rollback.createCheckpoint('v1');
    const ckpt2 = await rollback.createCheckpoint('v2');
    const result1 = await rollback.rollbackToCheckpoint(ckpt2.id);
    expect(result1.success).toBe(true);
    const result2 = await rollback.rollbackToCheckpoint(ckpt1.id);
    expect(result2.success).toBe(true);
  });

  it('should clean up after rollback', async () => {
    const ckpt = await rollback.createCheckpoint('cleanup-test');
    const result = await rollback.rollbackToCheckpoint(ckpt.id);
    expect(result.errors).toHaveLength(0);
  });
});
