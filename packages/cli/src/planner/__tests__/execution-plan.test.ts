import { describe, it, expect } from '@jest/globals';
import {
  createExecutionPlan,
  deriveSteps,
  deriveCommands,
  deriveCheckpoints,
} from '../execution-plan';
import type { TaskSpec, ExecutionStep } from '../types';

function makeTask(overrides: Partial<TaskSpec> = {}): TaskSpec {
  return {
    id: 'task-1',
    title: 'Test task',
    description: 'A test task',
    taskType: 'tests',
    sourceDocument: 'src/foo.ts',
    context: ['ctx'],
    inputs: ['in.ts'],
    expectedOutputs: ['out.ts'],
    constraints: [],
    riskLevel: 'medium',
    requiresApproval: false,
    ...overrides,
  };
}

describe('execution-plan', () => {
  describe('createExecutionPlan', () => {
    it('should be defined', () => {
      expect(createExecutionPlan).toBeDefined();
    });

    it('should return expected plan structure for valid task', () => {
      const task = makeTask();
      const plan = createExecutionPlan(task);

      expect(plan).toHaveProperty('taskId', 'task-1');
      expect(plan).toHaveProperty('steps');
      expect(plan).toHaveProperty('commands');
      expect(plan).toHaveProperty('checkpoints');
      expect(plan).toHaveProperty('successCriteria');
      expect(plan).toHaveProperty('blocked');
      expect(plan.blocked).toBe(false);
    });

    it('should produce 3 steps for valid task', () => {
      const task = makeTask();
      const plan = createExecutionPlan(task);

      expect(plan.steps).toHaveLength(3);
      expect(plan.steps[0].title).toBe('Validate context');
      expect(plan.steps[1].title).toBe('Generate plan');
      expect(plan.steps[2].title).toBe('Execute task');
    });

    it('should extract commands from steps', () => {
      const task = makeTask();
      const plan = createExecutionPlan(task);

      expect(plan.commands).toContain('ai-devkit docs resolve');
      expect(plan.commands).toContain('ai-devkit plan create');
      expect(plan.commands).toContain('ai-devkit task run');
    });

    it('should include checkpoints for valid task', () => {
      const task = makeTask();
      const plan = createExecutionPlan(task);

      expect(plan.checkpoints).toEqual(['context', 'plan', 'execution', 'validation']);
    });

    it('should include success criteria for valid task', () => {
      const task = makeTask();
      const plan = createExecutionPlan(task);

      expect(plan.successCriteria).toContain('Plan created');
      expect(plan.successCriteria).toContain('Commands routed');
      expect(plan.successCriteria).toContain('Execution validated');
    });

    it('should block task with empty context', () => {
      const task = makeTask({ context: [] });
      const plan = createExecutionPlan(task);

      expect(plan.blocked).toBe(true);
      expect(plan.reason).toBe('Task lacks required context or outputs');
      expect(plan.steps).toHaveLength(0);
      expect(plan.commands).toHaveLength(0);
    });

    it('should block task with empty expectedOutputs', () => {
      const task = makeTask({ expectedOutputs: [] });
      const plan = createExecutionPlan(task);

      expect(plan.blocked).toBe(true);
      expect(plan.reason).toBe('Task lacks required context or outputs');
      expect(plan.steps).toHaveLength(0);
    });

    it('should link steps with correct dependencies', () => {
      const task = makeTask();
      const plan = createExecutionPlan(task);

      expect(plan.steps[0].dependencies).toEqual([]);
      expect(plan.steps[1].dependencies).toEqual(['step-1']);
      expect(plan.steps[2].dependencies).toEqual(['step-2']);
    });

    it('should have success criteria indicating blocked when blocked', () => {
      const task = makeTask({ context: [] });
      const plan = createExecutionPlan(task);

      expect(plan.successCriteria).toEqual(['Task blocked due to missing context']);
      expect(plan.reason).toBe('Task lacks required context or outputs');
    });
  });

  describe('deriveSteps', () => {
    it('should be defined', () => {
      expect(deriveSteps).toBeDefined();
    });

    it('should produce 3 steps for valid task', () => {
      const task = makeTask();
      const steps = deriveSteps(task);

      expect(steps).toHaveLength(3);
      expect(steps[0].id).toBe('step-1');
      expect(steps[1].id).toBe('step-2');
      expect(steps[2].id).toBe('step-3');
    });

    it('should include source document in first step description', () => {
      const task = makeTask({ sourceDocument: 'src/auth.ts' });
      const steps = deriveSteps(task);

      expect(steps[0].description).toContain('src/auth.ts');
    });

    it('should include task title in step descriptions', () => {
      const task = makeTask({ title: 'Add login' });
      const steps = deriveSteps(task);

      expect(steps[1].description).toContain('Add login');
      expect(steps[2].description).toContain('Add login');
    });

    it('should return empty array when context is empty', () => {
      const task = makeTask({ context: [] });
      const steps = deriveSteps(task);

      expect(steps).toHaveLength(0);
    });

    it('should return empty array when expectedOutputs is empty', () => {
      const task = makeTask({ expectedOutputs: [] });
      const steps = deriveSteps(task);

      expect(steps).toHaveLength(0);
    });

    it('should set correct dependencies between steps', () => {
      const task = makeTask();
      const steps = deriveSteps(task);

      expect(steps[0].dependencies).toEqual([]);
      expect(steps[1].dependencies).toEqual(['step-1']);
      expect(steps[2].dependencies).toEqual(['step-2']);
    });

    it('should have commands on all steps', () => {
      const task = makeTask();
      const steps = deriveSteps(task);

      for (const step of steps) {
        expect(step.command).toBeDefined();
        expect(typeof step.command).toBe('string');
      }
    });
  });

  describe('deriveCommands', () => {
    it('should be defined', () => {
      expect(deriveCommands).toBeDefined();
    });

    it('should extract commands from steps', () => {
      const steps: ExecutionStep[] = [
        { id: 's1', title: 'S1', description: 'D1', command: 'cmd1', dependencies: [] },
        { id: 's2', title: 'S2', description: 'D2', command: 'cmd2', dependencies: ['s1'] },
      ];
      const commands = deriveCommands(steps);

      expect(commands).toEqual(['cmd1', 'cmd2']);
    });

    it('should filter out steps without commands', () => {
      const steps: ExecutionStep[] = [
        { id: 's1', title: 'S1', description: 'D1', command: 'cmd1', dependencies: [] },
        { id: 's2', title: 'S2', description: 'D2', dependencies: ['s1'] },
        { id: 's3', title: 'S3', description: 'D3', command: 'cmd3', dependencies: ['s2'] },
      ];
      const commands = deriveCommands(steps);

      expect(commands).toEqual(['cmd1', 'cmd3']);
    });

    it('should return empty array for empty steps', () => {
      expect(deriveCommands([])).toEqual([]);
    });
  });

  describe('deriveCheckpoints', () => {
    it('should be defined', () => {
      expect(deriveCheckpoints).toBeDefined();
    });

    it('should derive checkpoint names from step ids', () => {
      const steps: ExecutionStep[] = [
        { id: 'step-validate', title: 'V', description: 'D', dependencies: [] },
        { id: 'step-build', title: 'B', description: 'D', dependencies: ['step-validate'] },
        { id: 'step-deploy', title: 'D', description: 'D', dependencies: ['step-build'] },
      ];
      const checkpoints = deriveCheckpoints(steps);

      expect(checkpoints).toEqual(['validate', 'build', 'deploy']);
    });

    it('should return empty array for empty steps', () => {
      expect(deriveCheckpoints([])).toEqual([]);
    });

    it('should handle single step', () => {
      const steps: ExecutionStep[] = [
        { id: 'step-init', title: 'I', description: 'D', dependencies: [] },
      ];
      expect(deriveCheckpoints(steps)).toEqual(['init']);
    });
  });
});
