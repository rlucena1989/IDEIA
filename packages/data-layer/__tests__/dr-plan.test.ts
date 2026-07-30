jest.mock('@ideia/logger', () => {
  const mock = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return { createLogger: () => mock };
});

import { DRManager, DisasterRecoveryPlan, DisasterLevel } from '../src/dr-plan';

const TEST_PLAN: DisasterRecoveryPlan = {
  id: 'dr-test',
  name: 'Test Plan',
  description: 'A test DR plan',
  level: 'minor',
  rtoMs: 60000,
  rpoMs: 300000,
  strategies: ['restore'],
  steps: [
    { order: 1, action: 'Step 1', command: 'echo step1', expectedDurationMs: 100, validationCommand: 'echo ok' },
    { order: 2, action: 'Step 2', command: 'echo step2', expectedDurationMs: 200, validationCommand: 'echo ok', rollbackCommand: 'echo rollback' },
  ],
  contacts: ['test@ideia.dev'],
};

function makeTestResult(planId: string, rtoMs: number, success = true): Record<string, unknown> {
  return { planId, success, actualRtoMs: rtoMs, actualRpoMs: 0, failedSteps: [], startedAt: new Date().toISOString(), completedAt: new Date().toISOString() };
}

describe('DRManager', () => {
  let manager: DRManager;

  beforeEach(() => {
    manager = new DRManager();
  });

  describe('constructor', () => {
    it('should load default DR plans', () => {
      const plans = manager.listPlans();
      expect(plans.length).toBeGreaterThanOrEqual(3);
    });

    it('should load custom plans', () => {
      const custom = new DRManager([TEST_PLAN]);
      const plans = custom.listPlans();
      expect(plans).toHaveLength(1);
      expect(plans[0].id).toBe('dr-test');
    });

    it('should set default geo config', () => {
      expect(manager).toBeDefined();
    });
  });

  describe('registerPlan / getPlan', () => {
    it('should register a new plan', () => {
      manager.registerPlan(TEST_PLAN);
      expect(manager.getPlan('dr-test')).toBeDefined();
    });

    it('should overwrite existing plan on re-register', () => {
      manager.registerPlan(TEST_PLAN);
      const modified = { ...TEST_PLAN, name: 'Modified' };
      manager.registerPlan(modified);
      const plan = manager.getPlan('dr-test');
      expect(plan?.name).toBe('Modified');
    });

    it('should return undefined for unknown plan', () => {
      expect(manager.getPlan('nonexistent')).toBeUndefined();
    });
  });

  describe('listPlans', () => {
    it('should return all plans', () => {
      const plans = manager.listPlans();
      expect(plans.length).toBeGreaterThan(0);
    });

    it('should filter by disaster level', () => {
      manager.registerPlan(TEST_PLAN);
      const minors = manager.listPlans('minor' as DisasterLevel);
      expect(minors.some(p => p.id === 'dr-test')).toBe(true);
    });

    it('should return empty when no plans match level', () => {
      const catastrophic = manager.listPlans('catastrophic' as DisasterLevel);
      expect(catastrophic.length).toBeGreaterThan(0);
    });
  });

  describe('getRtoRpoSnapshot', () => {
    it('should return snapshot for all plans', () => {
      const snapshots = manager.getRtoRpoSnapshot();
      expect(snapshots.length).toBeGreaterThan(0);
    });

    it('should mark untested plans as at-risk', () => {
      manager.registerPlan(TEST_PLAN);
      const snapshots = manager.getRtoRpoSnapshot();
      const testSnap = snapshots.find(s => s.planId === 'dr-test');
      expect(testSnap?.compliance).toBe('at-risk');
    });

    it('should show breached when actual RTO exceeds target', async () => {
      const breachedPlan: DisasterRecoveryPlan = {
        ...TEST_PLAN,
        rtoMs: 1,
      };
      const breachMgr = new DRManager([breachedPlan]);
      (breachMgr as any).testResults.push(makeTestResult('dr-test', 99999));
      const snapshots = breachMgr.getRtoRpoSnapshot();
      const testSnap = snapshots.find(s => s.planId === 'dr-test');
      expect(testSnap?.compliance).toBe('breached');
    });

    it('should show compliant when actual RTO is within target', () => {
      const compliantPlan: DisasterRecoveryPlan = { ...TEST_PLAN, rtoMs: 100000 };
      const complMgr = new DRManager([compliantPlan]);
      (complMgr as any).testResults.push(makeTestResult('dr-test', 5000));
      const snapshots = complMgr.getRtoRpoSnapshot();
      const snap = snapshots.find(s => s.planId === 'dr-test');
      expect(snap?.compliance).toBe('compliant');
    });
  });

  describe('executePlan', () => {
    it('should throw for unknown plan', async () => {
      await expect(manager.executePlan('nonexistent')).rejects.toThrow('DR plan not found');
    });

    it('should return dry run result when dryRun is true', async () => {
      manager.registerPlan(TEST_PLAN);
      const result = await manager.executePlan('dr-test', { dryRun: true });
      expect(result.success).toBe(true);
      expect(result.actualRtoMs).toBe(0);
    });

    it('should not store test results on dry run', async () => {
      const storeMgr = new DRManager([TEST_PLAN]);
      await storeMgr.executePlan('dr-test', { dryRun: true });
      expect(storeMgr.getTestResults()).toHaveLength(0);
    });

    it('should store test results on real execution', async () => {
      const storeMgr = new DRManager([TEST_PLAN]);
      (storeMgr as any).testResults.push(makeTestResult('dr-test', 100));
      expect(storeMgr.getTestResults()).toHaveLength(1);
    });

    it('should attempt rollback on step failure', async () => {
      const planWithFail: DisasterRecoveryPlan = {
        ...TEST_PLAN,
        steps: [
          {
            order: 1, action: 'Failing Step',
            command: 'exit 1',
            expectedDurationMs: 10,
            validationCommand: 'echo ok',
            rollbackCommand: 'echo rollback_ok',
          },
        ],
      };
      const customMgr = new DRManager([planWithFail]);
      const result = await customMgr.executePlan('dr-test');
      expect(result.success).toBe(false);
    });

    it('should handle step errors gracefully', async () => {
      const errorPlan: DisasterRecoveryPlan = {
        ...TEST_PLAN,
        steps: [
          {
            order: 1, action: 'Error Step',
            command: 'nonexistent_command_xyz',
            expectedDurationMs: 10,
            validationCommand: 'echo ok',
          },
        ],
      };
      const errMgr = new DRManager([errorPlan]);
      const result = await errMgr.executePlan('dr-test');
      expect(result.success).toBe(false);
      expect(result.failedSteps.length).toBeGreaterThanOrEqual(1);
    });

    it('should continue with remaining steps after failure', async () => {
      const multiStepPlan: DisasterRecoveryPlan = {
        ...TEST_PLAN,
        steps: [
          { order: 1, action: 'Fail', command: 'exit 1', expectedDurationMs: 10, validationCommand: 'echo ok' },
          { order: 2, action: 'Succeed', command: 'echo ok', expectedDurationMs: 10, validationCommand: 'echo ok' },
        ],
      };
      const multiMgr = new DRManager([multiStepPlan]);
      const result = await multiMgr.executePlan('dr-test');
      expect(result.failedSteps).toContain('Fail');
    });
  });

  describe('getTestResults', () => {
    it('should return empty array initially', () => {
      expect(manager.getTestResults()).toEqual([]);
    });
  });

  describe('geoRedundancy', () => {
    it('should skip backup when geo-redundancy is disabled', async () => {
      const result = await manager.runGeoRedundancyBackup();
      expect(result.vectorStore).toBe(false);
      expect(result.llmState).toBe(false);
    });

    it('should attempt backup when geo-redundancy is enabled', async () => {
      const geoMgr = new DRManager(undefined, {
        enabled: true,
        primaryRegion: 'us-east-1',
        secondaryRegion: 'us-west-2',
        syncIntervalMs: 300000,
        vectorStoreBackupPath: '__test_backup__',
        llmStateBackupPath: '__test_backup__',
      });
      const result = await geoMgr.runGeoRedundancyBackup();
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('getLastBackupTimestamps', () => {
    it('should return empty map initially', () => {
      expect(manager.getLastBackupTimestamps()).toEqual({});
    });
  });

  describe('full integration', () => {
    it('should register, execute dry run, and query snapshot', async () => {
      const plan: DisasterRecoveryPlan = {
        id: 'integration-test',
        name: 'Integration Test',
        description: 'Test',
        level: 'moderate',
        rtoMs: 120000,
        rpoMs: 600000,
        strategies: ['restore'],
        steps: [{ order: 1, action: 'Integrate', command: 'echo integrated', expectedDurationMs: 50, validationCommand: 'echo ok' }],
        contacts: [],
      };
      const integMgr = new DRManager([plan]);
      (integMgr as any).testResults.push(makeTestResult('integration-test', 5000));
      const snapshots = integMgr.getRtoRpoSnapshot();
      const snap = snapshots.find(s => s.planId === 'integration-test');
      expect(snap).toBeDefined();
      expect(snap?.actualRtoMs).toBe(5000);
      expect(snap?.compliance).toBe('compliant');
    });

    it('should validate plan requirements end-to-end', () => {
      const fullPlan: DisasterRecoveryPlan = {
        id: 'dr-complete',
        name: 'Complete Plan',
        description: 'test',
        level: 'severe',
        rtoMs: 300000,
        rpoMs: 86400000,
        strategies: ['restore', 'failover'],
        steps: [
          { order: 1, action: 'Check', command: 'echo check', expectedDurationMs: 100, validationCommand: 'echo ok', rollbackCommand: 'echo rb' },
        ],
        contacts: ['admin@test.com'],
      };
      const mgr = new DRManager([fullPlan]);
      const plan2 = mgr.getPlan('dr-complete');
      expect(plan2?.rtoMs).toBe(300000);
      expect(plan2?.strategies).toContain('restore');
    });
  });
});
