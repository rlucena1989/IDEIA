import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentRuntime } from '../src/agent-runtime';
import { AuditTrail } from '@ideia/audit-trail';
import { MemoryStore } from '@ideia/memory-store';

describe('AgentRuntime', () => {
  let tmpDir: string;
  let runtime: AgentRuntime;
  let auditTrail: AuditTrail;
  let memoryStore: MemoryStore;

  beforeEach(() => {
    jest.useFakeTimers();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-test-'));
    auditTrail = new AuditTrail(path.join(tmpDir, 'audit.json'));
    memoryStore = new MemoryStore(path.join(tmpDir, 'memory.json'));
    runtime = new AgentRuntime(auditTrail, memoryStore);
  });

  afterEach(() => {
    memoryStore.destroy();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.useRealTimers();
  });

  // ── Testes existentes ──

  it('should auto-approve low risk actions', () => {
    const result = runtime.run({
      message: 'Read the file src/app.ts',
      actionType: 'file.read',
      riskLevel: 'low',
    });

    expect(result.decision).toBe('auto');
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.actionId).toBeTruthy();
  });

  it('should return ask decision for medium risk', () => {
    const result = runtime.run({
      message: 'Delete the file src/config.ts',
      actionType: 'file.delete',
      riskLevel: 'medium',
    });

    expect(result.decision).toBe('ask');
    expect(result.reason).toContain('approval');
  });

  it('should return block decision for high risk', () => {
    const result = runtime.run({
      message: 'Format the disk',
      actionType: 'shell.exec',
      resource: 'format c:',
      riskLevel: 'high',
    });

    expect(result.decision).toBe('block');
    expect(result.reason).toContain('blocked');
  });

  it('should build plan with correct steps', () => {
    const result = runtime.run({
      message: 'Show project status',
      actionType: 'shell.exec',
      riskLevel: 'low',
    });

    expect(result.steps[0].description).toContain('interpret message');
    expect(result.steps[1].description).toContain('evaluate action');
    // shell.exec is in HIGH_RISK_ACTIONS → ask → approval steps
    const descriptions = result.steps.map(s => s.description);
    expect(descriptions.some(d => d.includes('approval request'))).toBe(true);
  });

  it('should confirm execution and log to audit', () => {
    const result = runtime.run({
      message: 'Delete temp files',
      actionType: 'file.delete',
      riskLevel: 'medium',
    });

    runtime.confirmExecution(result.actionId, true);

    const result2 = runtime.run({
      message: 'Delete more files',
      actionType: 'file.delete',
      riskLevel: 'medium',
    });

    expect(result2.decision).toBe('ask');
  });

  // ── Novos testes ──

  describe('message interpretation', () => {
    it('should include message in plan steps', () => {
      const result = runtime.run({
        message: 'Create a new user controller',
        actionType: 'file.create',
        riskLevel: 'low',
      });

      expect(result.steps[0].description).toContain('Create a new user controller');
    });

    it('should handle empty message gracefully', () => {
      const result = runtime.run({
        message: '',
        actionType: 'file.read',
        riskLevel: 'low',
      });

      expect(result.decision).toBe('auto');
      expect(result.actionId).toBeTruthy();
    });
  });

  describe('policy evaluation integration', () => {
    it('should block destructive actions via resource pattern', () => {
      const result = runtime.run({
        message: 'Remove root files',
        actionType: 'shell.exec',
        resource: 'rm -rf /',
      });

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('destructive');
    });

    it('should require approval for shell.exec', () => {
      const result = runtime.run({
        message: 'Run npm install',
        actionType: 'shell.exec',
        riskLevel: 'low',
      });

      // shell.exec is in HIGH_RISK_ACTIONS
      expect(result.decision).toBe('ask');
    });
  });

  describe('execution confirmation', () => {
    it('should handle approval confirmation', () => {
      const result = runtime.run({
        message: 'Approve action',
        actionType: 'file.write',
        riskLevel: 'medium',
      });

      runtime.confirmExecution(result.actionId, true, 'Looks good');
      // No exception means success
    });

    it('should handle rejection confirmation', () => {
      const result = runtime.run({
        message: 'Reject action',
        actionType: 'file.write',
        riskLevel: 'medium',
      });

      runtime.confirmExecution(result.actionId, false, 'Not appropriate');
    });

    it('should handle invalid actionId', () => {
      runtime.confirmExecution('', true, 'test');
      // Should not throw
    });

    it('should handle non-existent actionId', () => {
      runtime.confirmExecution('nonexistent', true, 'test');
      // Should not throw
    });
  });

  describe('memory integration', () => {
    it('should store decisions in memory after run', () => {
      runtime.run({
        message: 'Test memory',
        actionType: 'file.read',
        riskLevel: 'low',
      });

      // Advance timers so debounced save fires
      jest.advanceTimersByTime(10);
      const memory = memoryStore.load();
      expect(memory.lastDecisions.length).toBeGreaterThanOrEqual(1);
      expect(memory.lastDecisions[0].decision).toBe('auto');
    });

    it('should persist action decisions in memory', () => {
      const result = runtime.run({
        message: 'Check memory',
        actionType: 'file.delete',
        riskLevel: 'medium',
      });

      jest.advanceTimersByTime(10);
      const memory = memoryStore.load();
      const lastDec = memory.lastDecisions[memory.lastDecisions.length - 1];
      expect(lastDec.actionType).toBe('file.delete');
      expect(lastDec.actionId).toBe(result.actionId);
    });
  });

  describe('lifecycle methods', () => {
    it('should start without error', () => {
      expect(() => runtime.start()).not.toThrow();
    });

    it('should stop without error', () => {
      expect(() => runtime.stop()).not.toThrow();
    });

    it('should pause without error', () => {
      expect(() => runtime.pause()).not.toThrow();
    });

    it('should resume without error', () => {
      expect(() => runtime.resume()).not.toThrow();
    });
  });

  describe('getMemoryStore', () => {
    it('should return the memory store instance', () => {
      const ms = runtime.getMemoryStore();
      expect(ms).toBe(memoryStore);
      expect(ms).toBeInstanceOf(MemoryStore);
    });
  });
});
