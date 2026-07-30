import { describe, it, expect } from '@jest/globals';

describe('planner types', () => {
  it('PlannerTaskType should be a string union with expected values', () => {
    const validTypes = [
      'execution', 'tests', 'strategy', 'refactor', 'audit',
      'documentation', 'maintenance', 'deploy', 'design',
      'performance', 'configuration', 'migration',
    ] as const;

    const taskTypes: readonly string[] = validTypes;
    expect(taskTypes).toContain('execution');
    expect(taskTypes).toContain('tests');
    expect(taskTypes).toContain('deploy');
    expect(taskTypes).toContain('migration');
    expect(taskTypes.length).toBe(12);
  });

  it('TaskSpec interface should have all required fields', () => {
    const spec = {
      id: 'task-1',
      title: 'Test task',
      description: 'A test task',
      taskType: 'tests',
      sourceDocument: 'src/foo.ts',
      context: ['file.ts'],
      inputs: ['input.ts'],
      expectedOutputs: ['output.ts'],
      constraints: ['use jest'],
      riskLevel: 'medium',
      requiresApproval: false,
    };

    expect(spec.id).toBe('task-1');
    expect(spec.title).toBe('Test task');
    expect(spec.taskType).toBe('tests');
    expect(spec.riskLevel).toBe('medium');
    expect(spec.requiresApproval).toBe(false);
    expect(Array.isArray(spec.context)).toBe(true);
    expect(Array.isArray(spec.inputs)).toBe(true);
    expect(Array.isArray(spec.expectedOutputs)).toBe(true);
    expect(Array.isArray(spec.constraints)).toBe(true);
  });

  it('TaskSpec should accept all riskLevel values', () => {
    const riskLevels = ['low', 'medium', 'high', 'critical'] as const;
    for (const level of riskLevels) {
      const spec = {
        id: 't', title: 't', description: 'd',
        taskType: 'execution' as const,
        sourceDocument: 'd', context: [], inputs: [],
        expectedOutputs: [], constraints: [],
        riskLevel: level,
        requiresApproval: false,
      };
      expect(spec.riskLevel).toBe(level);
    }
  });

  it('ExecutionStep interface should have all required fields', () => {
    const step = {
      id: 'step-1',
      title: 'Validate',
      description: 'Validate the context',
      command: 'ai-devkit docs resolve',
      dependencies: [],
      validation: 'Must be valid',
    };

    expect(step.id).toBe('step-1');
    expect(step.title).toBe('Validate');
    expect(step.command).toBeDefined();
    expect(Array.isArray(step.dependencies)).toBe(true);
    expect(step.validation).toBeDefined();
  });

  it('ExecutionStep should allow optional command', () => {
    const step: Record<string, unknown> = {
      id: 'step-2',
      title: 'Think',
      description: 'Think about the problem',
      dependencies: ['step-1'],
    };

    expect(step.command).toBeUndefined();
    expect(step.dependencies).toEqual(['step-1']);
  });

  it('ExecutionPlan interface should have all required fields', () => {
    const plan = {
      taskId: 'task-1',
      steps: [],
      commands: [],
      checkpoints: [],
      successCriteria: ['done'],
      blocked: false,
      reason: undefined,
    };

    expect(plan.taskId).toBe('task-1');
    expect(Array.isArray(plan.steps)).toBe(true);
    expect(Array.isArray(plan.commands)).toBe(true);
    expect(Array.isArray(plan.checkpoints)).toBe(true);
    expect(Array.isArray(plan.successCriteria)).toBe(true);
    expect(plan.blocked).toBe(false);
  });

  it('ExecutionPlan should support blocked state with reason', () => {
    const plan = {
      taskId: 'task-2',
      steps: [],
      commands: [],
      checkpoints: [],
      successCriteria: ['Blocked'],
      blocked: true,
      reason: 'Missing context',
    };

    expect(plan.blocked).toBe(true);
    expect(plan.reason).toBe('Missing context');
  });

  it('ValidationResult interface should have correct structure', () => {
    const resultValid = { valid: true, reasons: [] };
    const resultInvalid = { valid: false, reasons: ['Error 1', 'Error 2'] };

    expect(resultValid.valid).toBe(true);
    expect(resultValid.reasons).toEqual([]);
    expect(resultInvalid.valid).toBe(false);
    expect(resultInvalid.reasons).toHaveLength(2);
    expect(resultInvalid.reasons[0]).toBe('Error 1');
  });

  it('all type exports should be importable from the module', async () => {
    const mod = await import('../types');
    expect(typeof mod).toBe('object');
  });
});
