import type { ExecutionPlan, ExecutionStep, TaskSpec } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('execution-plan');

export function createExecutionPlan(task: TaskSpec): ExecutionPlan {
  const blocked = task.context.length === 0 || task.expectedOutputs.length === 0;

  const steps: ExecutionStep[] = [
    {
      id: 'step-1',
      title: 'Validate context',
      description: 'Confirm document source and task context',
      command: 'ai-devkit docs resolve',
      dependencies: [],
      validation: 'Context must be non-empty',
    },
    {
      id: 'step-2',
      title: 'Generate plan',
      description: 'Derive execution steps from task spec',
      command: 'ai-devkit plan create',
      dependencies: ['step-1'],
      validation: 'Execution plan must contain checkpoints',
    },
    {
      id: 'step-3',
      title: 'Execute task',
      description: 'Run the selected commands',
      command: 'ai-devkit task run',
      dependencies: ['step-2'],
      validation: 'Task must remain within scope',
    },
  ];

  return {
    taskId: task.id,
    steps: blocked ? [] : steps,
    commands: blocked ? [] : steps.map(s => s.command).filter((c): c is string => c != null),
    checkpoints: blocked ? [] : ['context', 'plan', 'execution', 'validation'],
    successCriteria: blocked
      ? ['Task blocked due to missing context']
      : ['Plan created', 'Commands routed', 'Execution validated'],
    blocked,
    reason: blocked ? 'Task lacks required context or outputs' : undefined,
  };
}

export function deriveSteps(task: TaskSpec): ExecutionStep[] {
  if (task.context.length === 0 || task.expectedOutputs.length === 0) {
    return [];
  }

  return [
    {
      id: 'step-1',
      title: 'Validate context',
      description: `Confirm document source: ${task.sourceDocument}`,
      command: 'ai-devkit docs resolve',
      dependencies: [],
      validation: 'Context must be non-empty',
    },
    {
      id: 'step-2',
      title: 'Generate plan',
      description: `Derive execution steps for: ${task.title}`,
      command: 'ai-devkit plan create',
      dependencies: ['step-1'],
      validation: 'Execution plan must contain checkpoints',
    },
    {
      id: 'step-3',
      title: 'Execute task',
      description: `Run the selected commands for: ${task.title}`,
      command: 'ai-devkit task run',
      dependencies: ['step-2'],
      validation: 'Task must remain within scope',
    },
  ];
}

export function deriveCommands(steps: ExecutionStep[]): string[] {
  return steps.map(s => s.command).filter((c): c is string => c != null);
}

export function deriveCheckpoints(steps: ExecutionStep[]): string[] {
  if (steps.length === 0) return [];
  return steps.map(s => s.id.replace('step-', ''));
}
