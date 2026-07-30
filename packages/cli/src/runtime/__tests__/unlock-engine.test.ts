import {
  getReadyTasks,
  evaluateAfterCheckpoint,
  getBlockedTasks,
  generateUnlockPlan,
  getParallelGroups,
  estimateParallelTime,
  updateTaskStatuses,
} from '../unlock-engine';
import type { TaskNode, OrchestrationCheckpoint, PhaseState } from '../orchestration-types';

const makeTask = (overrides: Partial<TaskNode> & { id: string }): TaskNode => ({
  name: `task-${overrides.id}`,
  description: '',
  phase: 'diagnosis',
  status: 'pending',
  dependsOn: [],
  blockedBy: [],
  riskLevel: 'low',
  estimatedEffort: 'minutes',
  canParallelize: true,
  isDeterministic: false,
  requiresLLM: false,
  ...overrides,
});

const makeCheckpoint = (overrides: Partial<OrchestrationCheckpoint> & { id: string }): OrchestrationCheckpoint => ({
  phase: 'diagnosis',
  status: 'completed',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  contextHash: 'abc',
  nextActions: [],
  dependencyIds: [],
  unlockIds: [],
  ...overrides,
});

describe('unlock-engine', () => {
  describe('getReadyTasks', () => {
    it('returns pending tasks with all deps completed', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', status: 'completed', dependsOn: [] }),
        makeTask({ id: 'b', status: 'pending', dependsOn: ['a'] }),
        makeTask({ id: 'c', status: 'blocked', dependsOn: ['a'] }),
      ];
      const ready = getReadyTasks(tasks);
      expect(ready).toHaveLength(2);
      expect(ready.map(t => t.id)).toEqual(['b', 'c']);
    });

    it('excludes tasks with unmet dependencies', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', status: 'pending' }),
        makeTask({ id: 'b', status: 'pending', dependsOn: ['a'] }),
      ];
      const ready = getReadyTasks(tasks);
      expect(ready).toHaveLength(1);
      expect(ready[0].id).toBe('a');
    });

    it('excludes completed/running tasks', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', status: 'completed' }),
        makeTask({ id: 'b', status: 'running' }),
        makeTask({ id: 'c', status: 'validated' }),
      ];
      const ready = getReadyTasks(tasks);
      expect(ready).toHaveLength(0);
    });

    it('considers validated as completed', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', status: 'validated' }),
        makeTask({ id: 'b', status: 'pending', dependsOn: ['a'] }),
      ];
      expect(getReadyTasks(tasks)).toHaveLength(1);
    });

    it('returns empty array when no tasks', () => {
      expect(getReadyTasks([])).toEqual([]);
    });
  });

  describe('evaluateAfterCheckpoint', () => {
    it('unlocks blocked tasks with all deps completed', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', status: 'completed' }),
        makeTask({ id: 'b', status: 'blocked', dependsOn: ['a'] }),
        makeTask({ id: 'c', status: 'pending', dependsOn: ['a'] }),
      ];
      const result = evaluateAfterCheckpoint(
        makeCheckpoint({ id: 'cp1' }),
        tasks,
        ['a'],
      );
      expect(result.unlockedTaskIds).toEqual(['b', 'c']);
      expect(result.readyToExecute).toHaveLength(2);
      expect(result.stillBlocked).toEqual([]);
    });

    it('identifies still-blocked tasks', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', status: 'completed' }),
        makeTask({ id: 'b', status: 'blocked', dependsOn: ['a', 'missing'] }),
      ];
      const result = evaluateAfterCheckpoint(
        makeCheckpoint({ id: 'cp1' }),
        tasks,
        ['a'],
      );
      expect(result.stillBlocked).toEqual(['b']);
      expect(result.unlockedTaskIds).toEqual([]);
    });

    it('computes progress delta correctly', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', status: 'completed' }),
        makeTask({ id: 'b', status: 'pending' }),
        makeTask({ id: 'c', status: 'pending' }),
        makeTask({ id: 'd', status: 'pending' }),
      ];
      const result = evaluateAfterCheckpoint(
        makeCheckpoint({ id: 'cp1' }),
        tasks,
        ['a'],
      );
      expect(result.progressDelta).toBe(25);
    });

    it('returns zero progress when tasks empty', () => {
      const result = evaluateAfterCheckpoint(makeCheckpoint({ id: 'cp1' }), [], []);
      expect(result.progressDelta).toBe(0);
    });
  });

  describe('getBlockedTasks', () => {
    it('identifies tasks blocked by missing dependencies', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', status: 'completed' }),
        makeTask({ id: 'b', status: 'pending', dependsOn: ['a', 'missing'] }),
        makeTask({ id: 'c', status: 'pending', dependsOn: ['a'] }),
      ];
      const blocked = getBlockedTasks(tasks);
      expect(blocked).toHaveLength(1);
      expect(blocked[0].id).toBe('b');
    });

    it('flags tasks whose deps have failed', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', status: 'failed' }),
        makeTask({ id: 'b', status: 'pending', dependsOn: ['a'] }),
      ];
      expect(getBlockedTasks(tasks)).toHaveLength(1);
    });
  });

  describe('generateUnlockPlan', () => {
    it('unlocks tasks when checkpoint dep IDs are satisfied', () => {
      const checkpoints: OrchestrationCheckpoint[] = [
        makeCheckpoint({ id: 'cp1', status: 'completed', unlockIds: ['a'] }),
      ];
      const phase: PhaseState = {
        id: 'structuring',
        name: 'structuring',
        status: 'running',
        progress: 0,
        tasks: [
          makeTask({ id: 't2', status: 'pending', dependsOn: ['a'] }),
          makeTask({ id: 't3', status: 'blocked', dependsOn: ['a'] }),
        ],
        completedTasks: 0,
        totalTasks: 2,
        blockedCount: 1,
      };
      const plan = generateUnlockPlan(checkpoints, phase);
      expect(plan.canUnlock).toBe(true);
      expect(plan.nextTasks).toHaveLength(2);
    });

    it('reports blocking tasks when deps are not satisfied', () => {
      const checkpoints: OrchestrationCheckpoint[] = [
        makeCheckpoint({ id: 'cp1', status: 'completed', unlockIds: [] }),
      ];
      const phase: PhaseState = {
        id: 'diagnosis',
        name: 'diagnosis',
        status: 'running',
        progress: 50,
        tasks: [
          makeTask({ id: 't1', status: 'pending', dependsOn: ['missing-dep'] }),
        ],
        completedTasks: 0,
        totalTasks: 1,
        blockedCount: 1,
      };
      const plan = generateUnlockPlan(checkpoints, phase);
      expect(plan.canUnlock).toBe(false);
      expect(plan.blockingTasks).toContain('missing-dep');
    });

    it('returns canUnlock false when no tasks are pending/blocked', () => {
      const phase: PhaseState = {
        id: 'diagnosis',
        name: 'diagnosis',
        status: 'completed',
        progress: 100,
        tasks: [],
        completedTasks: 0,
        totalTasks: 0,
        blockedCount: 0,
      };
      const plan = generateUnlockPlan([], phase);
      expect(plan.canUnlock).toBe(false);
      expect(plan.nextTasks).toEqual([]);
    });
  });

  describe('getParallelGroups', () => {
    it('groups tasks by dependency depth', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', status: 'pending' }),
        makeTask({ id: 'b', status: 'pending', dependsOn: ['a'] }),
        makeTask({ id: 'c', status: 'pending', dependsOn: ['a'] }),
        makeTask({ id: 'd', status: 'pending', dependsOn: ['b', 'c'] }),
      ];
      const groups = getParallelGroups(tasks);
      expect(groups.length).toBeGreaterThanOrEqual(1);
      expect(groups[0].map(t => t.id)).toContain('a');
    });

    it('returns empty array when no ready tasks', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', status: 'completed' }),
      ];
      expect(getParallelGroups(tasks)).toEqual([]);
    });

    it('handles empty task list', () => {
      expect(getParallelGroups([])).toEqual([]);
    });
  });

  describe('estimateParallelTime', () => {
    it('calculates total time from parallel groups', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', status: 'pending', estimatedEffort: 'minutes' }),
      ];
      const result = estimateParallelTime(tasks);
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.parallelGroups).toBeGreaterThanOrEqual(1);
    });
  });

  describe('updateTaskStatuses', () => {
    it('updates status for unlocked task ids', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', status: 'blocked' }),
        makeTask({ id: 'b', status: 'blocked' }),
      ];
      const updated = updateTaskStatuses(tasks, ['a'], 'ready');
      expect(updated.find(t => t.id === 'a')?.status).toBe('ready');
      expect(updated.find(t => t.id === 'b')?.status).toBe('blocked');
    });

    it('does not mutate original array', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', status: 'pending' }),
      ];
      const updated = updateTaskStatuses(tasks, ['a'], 'ready');
      expect(tasks[0].status).toBe('pending');
      expect(updated[0].status).toBe('ready');
    });
  });
});
