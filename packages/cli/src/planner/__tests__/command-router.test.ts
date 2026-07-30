import { describe, it, expect } from '@jest/globals';
import { routeCommands, isCommandAllowed } from '../command-router';
import type { TaskSpec } from '../types';

function makeTask(overrides: Partial<TaskSpec> = {}): TaskSpec {
  return {
    id: 'task-1',
    title: 'Test',
    description: 'Desc',
    taskType: 'execution',
    sourceDocument: 'doc.md',
    context: ['ctx'],
    inputs: [],
    expectedOutputs: ['out'],
    constraints: [],
    riskLevel: 'low',
    requiresApproval: false,
    ...overrides,
  };
}

describe('command-router', () => {
  describe('routeCommands', () => {
    it('should be defined', () => {
      expect(routeCommands).toBeDefined();
    });

    it('should route tests type to test commands', () => {
      const task = makeTask({ taskType: 'tests' });
      const commands = routeCommands(task);

      expect(commands).toContain('ai-devkit test-autonomy gap-prioritize --all');
      expect(commands).toContain('npx jest --coverage');
    });

    it('should route strategy type to docs commands', () => {
      const task = makeTask({ taskType: 'strategy' });
      const commands = routeCommands(task);

      expect(commands).toContain('ai-devkit docs audit');
      expect(commands).toContain('ai-devkit docs resolve strategy');
    });

    it('should route refactor type to typecheck command', () => {
      const task = makeTask({ taskType: 'refactor' });
      const commands = routeCommands(task);

      expect(commands).toContain('npx tsc --noEmit');
    });

    it('should route audit type to docs audit', () => {
      const task = makeTask({ taskType: 'audit' });
      const commands = routeCommands(task);

      expect(commands).toContain('ai-devkit docs audit');
      expect(commands).not.toContain('npx jest');
    });

    it('should route documentation type to docs status', () => {
      const task = makeTask({ taskType: 'documentation' });
      const commands = routeCommands(task);

      expect(commands).toContain('ai-devkit docs status');
    });

    it('should route maintenance type to test-autonomy status', () => {
      const task = makeTask({ taskType: 'maintenance' });
      const commands = routeCommands(task);

      expect(commands).toContain('ai-devkit test-autonomy status');
    });

    it('should route unknown task types to default execution command', () => {
      const task = makeTask({ taskType: 'deploy' });
      const commands = routeCommands(task);

      expect(commands).toContain('ai-devkit docs resolve execution');
    });

    it('should route design type to default', () => {
      const task = makeTask({ taskType: 'design' });
      const commands = routeCommands(task);

      expect(commands).toContain('ai-devkit docs resolve execution');
    });

    it('should route performance type to default', () => {
      const task = makeTask({ taskType: 'performance' });
      const commands = routeCommands(task);

      expect(commands).toContain('ai-devkit docs resolve execution');
    });
  });

  describe('isCommandAllowed', () => {
    it('should be defined', () => {
      expect(isCommandAllowed).toBeDefined();
    });

    it('should allow any command for execution tasks', () => {
      const task = makeTask({ taskType: 'execution' });

      expect(isCommandAllowed('npx jest', task)).toBe(true);
      expect(isCommandAllowed('ai-devkit task run', task)).toBe(true);
      expect(isCommandAllowed('npx tsc', task)).toBe(true);
    });

    it('should block jest commands for strategy tasks', () => {
      const task = makeTask({ taskType: 'strategy' });

      expect(isCommandAllowed('npx jest --coverage', task)).toBe(false);
      expect(isCommandAllowed('ai-devkit docs audit', task)).toBe(true);
    });

    it('should block jest and task run for audit tasks', () => {
      const task = makeTask({ taskType: 'audit' });

      expect(isCommandAllowed('npx jest', task)).toBe(false);
      expect(isCommandAllowed('ai-devkit task run', task)).toBe(false);
      expect(isCommandAllowed('ai-devkit docs audit', task)).toBe(true);
    });

    it('should allow all commands for tests tasks', () => {
      const task = makeTask({ taskType: 'tests' });

      expect(isCommandAllowed('npx jest', task)).toBe(true);
      expect(isCommandAllowed('ai-devkit task run', task)).toBe(true);
    });

    it('should allow all commands for refactor tasks', () => {
      const task = makeTask({ taskType: 'refactor' });

      expect(isCommandAllowed('npx tsc --noEmit', task)).toBe(true);
      expect(isCommandAllowed('npx jest', task)).toBe(true);
    });
  });
});
