import type { TaskSpec } from './types';

export function routeCommands(task: TaskSpec): string[] {
  const commands: string[] = [];

  switch (task.taskType) {
    case 'tests':
      commands.push('ai-devkit test-autonomy gap-prioritize --all');
      commands.push('npx jest --coverage');
      break;
    case 'strategy':
      commands.push('ai-devkit docs audit');
      commands.push('ai-devkit docs resolve strategy');
      break;
    case 'refactor':
      commands.push('npx tsc --noEmit');
      break;
    case 'audit':
      commands.push('ai-devkit docs audit');
      break;
    case 'documentation':
      commands.push('ai-devkit docs status');
      break;
    case 'maintenance':
      commands.push('ai-devkit test-autonomy status');
      break;
    default:
      commands.push('ai-devkit docs resolve execution');
      break;
  }

  return commands;
}

export function isCommandAllowed(command: string, task: TaskSpec): boolean {
  if (task.taskType === 'strategy' || task.taskType === 'audit') {
    return !command.includes('jest') && !command.includes('task run');
  }
  return true;
}
