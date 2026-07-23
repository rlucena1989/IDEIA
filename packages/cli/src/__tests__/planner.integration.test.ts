import { inferTaskType, createTaskSpec, validateTaskSpec } from '../planner/task-spec';
import { createExecutionPlan, deriveSteps, deriveCommands, deriveCheckpoints } from '../planner/execution-plan';
import { routeCommands, isCommandAllowed } from '../planner/command-router';
import {
  validateTaskContext,
  validateTaskScope,
  validateDependencies,
  validateExecutionMode,
} from '../planner/task-validator';

describe('inferTaskType', () => {
  it('infers execution as default', () => {
    expect(inferTaskType('implement feature')).toBe('execution');
  });

  it('infers tests', () => {
    expect(inferTaskType('write tests for module')).toBe('tests');
  });

  it('infers tests via coverage', () => {
    expect(inferTaskType('improve coverage')).toBe('tests');
  });

  it('infers refactor', () => {
    expect(inferTaskType('refactor the router')).toBe('refactor');
  });

  it('infers audit', () => {
    expect(inferTaskType('audit dependencies')).toBe('audit');
  });

  it('infers documentation', () => {
    expect(inferTaskType('document the API')).toBe('documentation');
  });

  it('infers strategy', () => {
    expect(inferTaskType('define strategy for Q3')).toBe('strategy');
  });

  it('infers strategy via roadmap', () => {
    expect(inferTaskType('update roadmap')).toBe('strategy');
  });

  it('infers maintenance', () => {
    expect(inferTaskType('maintenance of CI pipeline')).toBe('maintenance');
  });
});

describe('createTaskSpec', () => {
  it('creates a valid TaskSpec', () => {
    const spec = createTaskSpec({
      id: 'test-1',
      title: 'Test task',
      description: 'write tests for module',
      sourceDocument: '.ai/tasks/current-task.md',
    });

    expect(spec.id).toBe('test-1');
    expect(spec.title).toBe('Test task');
    expect(spec.taskType).toBe('tests');
    expect(spec.sourceDocument).toBe('.ai/tasks/current-task.md');
    expect(spec.context).toEqual([]);
    expect(spec.inputs).toEqual([]);
    expect(spec.expectedOutputs).toEqual([]);
    expect(spec.constraints).toEqual([]);
    expect(spec.riskLevel).toBe('medium');
    expect(spec.requiresApproval).toBe(false);
  });

  it('accepts optional fields', () => {
    const spec = createTaskSpec({
      id: 'test-2',
      title: 'Strategy task',
      description: 'define strategy',
      sourceDocument: '.ai/tasks/master-plan.md',
      context: ['Q3 planning'],
      inputs: ['budget report'],
      expectedOutputs: ['strategy doc'],
      constraints: ['must be approved'],
      riskLevel: 'high',
      requiresApproval: true,
    });

    expect(spec.taskType).toBe('strategy');
    expect(spec.context).toEqual(['Q3 planning']);
    expect(spec.inputs).toEqual(['budget report']);
    expect(spec.expectedOutputs).toEqual(['strategy doc']);
    expect(spec.constraints).toEqual(['must be approved']);
    expect(spec.riskLevel).toBe('high');
    expect(spec.requiresApproval).toBe(true);
  });

  it('infers taskType from title and description', () => {
    const spec = createTaskSpec({
      id: 'test-3',
      title: 'Refactor',
      description: 'improve code structure',
      sourceDocument: 'current-task.md',
    });

    expect(spec.taskType).toBe('refactor');
  });
});

describe('validateTaskSpec', () => {
  it('returns valid for complete spec', () => {
    const spec = createTaskSpec({
      id: 'v-1',
      title: 'Valid',
      description: 'do something',
      sourceDocument: 'doc.md',
      context: ['some context'],
      expectedOutputs: ['result'],
    });

    const result = validateTaskSpec(spec);
    expect(result.valid).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('returns invalid for missing id', () => {
    const spec = createTaskSpec({
      id: '',
      title: 'Test',
      description: 'do something',
      sourceDocument: 'doc.md',
    });

    const result = validateTaskSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('Missing task id');
  });

  it('returns invalid for missing title', () => {
    const spec = createTaskSpec({
      id: 'v-2',
      title: '',
      description: 'do something',
      sourceDocument: 'doc.md',
    });

    const result = validateTaskSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('Missing title');
  });

  it('returns invalid for missing description', () => {
    const spec = createTaskSpec({
      id: 'v-3',
      title: 'Test',
      description: '',
      sourceDocument: 'doc.md',
    });

    const result = validateTaskSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('Missing description');
  });

  it('returns invalid for missing source document', () => {
    const spec = createTaskSpec({
      id: 'v-4',
      title: 'Test',
      description: 'do something',
      sourceDocument: '',
    });

    const result = validateTaskSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('Missing source document');
  });

  it('returns invalid for empty context', () => {
    const spec = createTaskSpec({
      id: 'v-5',
      title: 'Test',
      description: 'do something',
      sourceDocument: 'doc.md',
    });

    const result = validateTaskSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('Empty context');
  });

  it('returns invalid for empty expected outputs', () => {
    const spec = createTaskSpec({
      id: 'v-6',
      title: 'Test',
      description: 'do something',
      sourceDocument: 'doc.md',
      context: ['ctx'],
    });

    const result = validateTaskSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('Empty expected outputs');
  });
});

describe('createExecutionPlan', () => {
  it('creates plan with steps for valid task', () => {
    const spec = createTaskSpec({
      id: 'plan-1',
      title: 'Test plan',
      description: 'write tests',
      sourceDocument: 'doc.md',
      context: ['context 1'],
      expectedOutputs: ['output 1'],
    });

    const plan = createExecutionPlan(spec);
    expect(plan.blocked).toBe(false);
    expect(plan.steps.length).toBe(3);
    expect(plan.commands.length).toBe(3);
    expect(plan.checkpoints).toEqual(['context', 'plan', 'execution', 'validation']);
  });

  it('blocks plan for task without context', () => {
    const spec = createTaskSpec({
      id: 'plan-2',
      title: 'No context',
      description: 'do something',
      sourceDocument: 'doc.md',
      expectedOutputs: ['output'],
    });

    const plan = createExecutionPlan(spec);
    expect(plan.blocked).toBe(true);
    expect(plan.steps).toEqual([]);
    expect(plan.commands).toEqual([]);
    expect(plan.reason).toBe('Task lacks required context or outputs');
  });

  it('blocks plan for task without expected outputs', () => {
    const spec = createTaskSpec({
      id: 'plan-3',
      title: 'No outputs',
      description: 'do something',
      sourceDocument: 'doc.md',
      context: ['ctx'],
    });

    const plan = createExecutionPlan(spec);
    expect(plan.blocked).toBe(true);
    expect(plan.steps).toEqual([]);
  });

  it('sets success criteria for blocked plan', () => {
    const spec = createTaskSpec({
      id: 'plan-4',
      title: 'Blocked',
      description: 'do something',
      sourceDocument: 'doc.md',
    });

    const plan = createExecutionPlan(spec);
    expect(plan.successCriteria).toEqual(['Task blocked due to missing context']);
  });

  it('sets success criteria for valid plan', () => {
    const spec = createTaskSpec({
      id: 'plan-5',
      title: 'Valid',
      description: 'do something',
      sourceDocument: 'doc.md',
      context: ['ctx'],
      expectedOutputs: ['out'],
    });

    const plan = createExecutionPlan(spec);
    expect(plan.successCriteria).toEqual(['Plan created', 'Commands routed', 'Execution validated']);
  });
});

describe('deriveSteps', () => {
  it('returns steps for valid task', () => {
    const spec = createTaskSpec({
      id: 'ds-1',
      title: 'Test',
      description: 'do something',
      sourceDocument: 'doc.md',
      context: ['ctx'],
      expectedOutputs: ['out'],
    });

    const steps = deriveSteps(spec);
    expect(steps.length).toBe(3);
  });

  it('returns empty for task without context', () => {
    const spec = createTaskSpec({
      id: 'ds-2',
      title: 'Test',
      description: 'do something',
      sourceDocument: 'doc.md',
    });

    expect(deriveSteps(spec)).toEqual([]);
  });
});

describe('deriveCommands', () => {
  it('extracts commands from steps', () => {
    const spec = createTaskSpec({
      id: 'dc-1',
      title: 'Test',
      description: 'do something',
      sourceDocument: 'doc.md',
      context: ['ctx'],
      expectedOutputs: ['out'],
    });

    const steps = deriveSteps(spec);
    const commands = deriveCommands(steps);
    expect(commands.length).toBe(3);
    expect(commands[0]).toBe('ai-devkit docs resolve');
  });

  it('returns empty array for empty steps', () => {
    expect(deriveCommands([])).toEqual([]);
  });
});

describe('deriveCheckpoints', () => {
  it('derives checkpoints from step ids', () => {
    const spec = createTaskSpec({
      id: 'dcp-1',
      title: 'Test',
      description: 'do something',
      sourceDocument: 'doc.md',
      context: ['ctx'],
      expectedOutputs: ['out'],
    });

    const steps = deriveSteps(spec);
    const checkpoints = deriveCheckpoints(steps);
    expect(checkpoints).toEqual(['1', '2', '3']);
  });

  it('returns empty array for empty steps', () => {
    expect(deriveCheckpoints([])).toEqual([]);
  });
});

describe('routeCommands', () => {
  it('routes execution type', () => {
    const spec = createTaskSpec({
      id: 'rc-1', title: 'Execute', description: 'implement feature', sourceDocument: 'doc.md',
    });
    const cmds = routeCommands(spec);
    expect(cmds).toEqual(['ai-devkit docs resolve execution']);
  });

  it('routes tests type', () => {
    const spec = createTaskSpec({
      id: 'rc-2', title: 'Tests', description: 'write tests', sourceDocument: 'doc.md',
    });
    const cmds = routeCommands(spec);
    expect(cmds).toContain('npx jest --coverage');
  });

  it('routes strategy type', () => {
    const spec = createTaskSpec({
      id: 'rc-3', title: 'Strategy', description: 'define strategy', sourceDocument: 'doc.md',
    });
    const cmds = routeCommands(spec);
    expect(cmds).toContain('ai-devkit docs resolve strategy');
  });

  it('routes audit type', () => {
    const spec = createTaskSpec({
      id: 'rc-4', title: 'Audit', description: 'audit code', sourceDocument: 'doc.md',
    });
    const cmds = routeCommands(spec);
    expect(cmds).toEqual(['ai-devkit docs audit']);
  });

  it('routes refactor type', () => {
    const spec = createTaskSpec({
      id: 'rc-5', title: 'Refactor', description: 'refactor module', sourceDocument: 'doc.md',
    });
    const cmds = routeCommands(spec);
    expect(cmds).toContain('npx tsc --noEmit');
  });

  it('routes documentation type', () => {
    const spec = createTaskSpec({
      id: 'rc-6', title: 'Docs', description: 'document API', sourceDocument: 'doc.md',
    });
    const cmds = routeCommands(spec);
    expect(cmds).toEqual(['ai-devkit docs status']);
  });

  it('routes maintenance type', () => {
    const spec = createTaskSpec({
      id: 'rc-7', title: 'Maint', description: 'maintenance tasks', sourceDocument: 'doc.md',
    });
    const cmds = routeCommands(spec);
    expect(cmds).toEqual(['ai-devkit test-autonomy status']);
  });
});

describe('isCommandAllowed', () => {
  it('allows all commands for execution type', () => {
    const spec = createTaskSpec({
      id: 'ica-1', title: 'Execute', description: 'implement', sourceDocument: 'doc.md',
    });
    expect(isCommandAllowed('npx jest', spec)).toBe(true);
    expect(isCommandAllowed('ai-devkit task run', spec)).toBe(true);
  });

  it('blocks jest for strategy type', () => {
    const spec = createTaskSpec({
      id: 'ica-2', title: 'Strategy', description: 'strategy', sourceDocument: 'doc.md',
    });
    expect(isCommandAllowed('npx jest --coverage', spec)).toBe(false);
  });

  it('blocks task run for audit type', () => {
    const spec = createTaskSpec({
      id: 'ica-3', title: 'Audit', description: 'audit', sourceDocument: 'doc.md',
    });
    expect(isCommandAllowed('ai-devkit task run', spec)).toBe(false);
  });
});

describe('validateTaskContext', () => {
  it('passes for complete task', () => {
    const spec = createTaskSpec({
      id: 'vc-1', title: 'Test', description: 'do', sourceDocument: 'doc.md',
      context: ['ctx'], expectedOutputs: ['out'],
    });
    expect(validateTaskContext(spec).valid).toBe(true);
  });

  it('fails for missing source document', () => {
    const spec = createTaskSpec({
      id: 'vc-2', title: 'Test', description: 'do', sourceDocument: '',
      context: ['ctx'], expectedOutputs: ['out'],
    });
    const result = validateTaskContext(spec);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('Missing source document');
  });

  it('fails for missing context', () => {
    const spec = createTaskSpec({
      id: 'vc-3', title: 'Test', description: 'do', sourceDocument: 'doc.md',
      expectedOutputs: ['out'],
    });
    const result = validateTaskContext(spec);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('Missing context');
  });

  it('fails for missing expected outputs', () => {
    const spec = createTaskSpec({
      id: 'vc-4', title: 'Test', description: 'do', sourceDocument: 'doc.md',
      context: ['ctx'],
    });
    const result = validateTaskContext(spec);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('Missing expected outputs');
  });
});

describe('validateTaskScope', () => {
  it('passes for low risk without constraints', () => {
    const spec = createTaskSpec({
      id: 'vs-1', title: 'Test', description: 'do', sourceDocument: 'doc.md',
      riskLevel: 'low',
    });
    expect(validateTaskScope(spec).valid).toBe(true);
  });

  it('fails for critical risk without constraints', () => {
    const spec = createTaskSpec({
      id: 'vs-2', title: 'Test', description: 'do', sourceDocument: 'doc.md',
      riskLevel: 'critical',
    });
    const result = validateTaskScope(spec);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('Critical task requires explicit constraints');
  });
});

describe('validateDependencies', () => {
  it('passes for task with outputs and context', () => {
    const spec = createTaskSpec({
      id: 'vd-1', title: 'Test', description: 'do', sourceDocument: 'doc.md',
      context: ['ctx'], expectedOutputs: ['out'],
    });
    expect(validateDependencies(spec).valid).toBe(true);
  });

  it('fails for missing outputs', () => {
    const spec = createTaskSpec({
      id: 'vd-2', title: 'Test', description: 'do', sourceDocument: 'doc.md',
      context: ['ctx'],
    });
    expect(validateDependencies(spec).valid).toBe(false);
  });

  it('fails for missing context', () => {
    const spec = createTaskSpec({
      id: 'vd-3', title: 'Test', description: 'do', sourceDocument: 'doc.md',
      expectedOutputs: ['out'],
    });
    const result = validateDependencies(spec);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('No context provided — cannot validate dependencies');
  });
});

describe('validateExecutionMode', () => {
  it('passes for standard task', () => {
    const spec = createTaskSpec({
      id: 'vem-1', title: 'Test', description: 'do', sourceDocument: 'doc.md',
    });
    expect(validateExecutionMode(spec).valid).toBe(true);
  });

  it('fails for approval without source', () => {
    const spec = createTaskSpec({
      id: 'vem-2', title: 'Test', description: 'do', sourceDocument: '',
      requiresApproval: true,
    });
    const result = validateExecutionMode(spec);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('Task requires approval but has no source document for context');
  });

  it('fails for critical risk without outputs', () => {
    const spec = createTaskSpec({
      id: 'vem-3', title: 'Test', description: 'do', sourceDocument: 'doc.md',
      riskLevel: 'critical',
    });
    const result = validateExecutionMode(spec);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('Critical task must define expected outputs before execution');
  });
});
