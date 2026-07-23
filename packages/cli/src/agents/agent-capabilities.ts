import { OperationalAgent } from './agent-types';

export function canPerform(agent: OperationalAgent, taskType: string): boolean {
  return agent.capabilities.includes(taskType) && agent.status !== 'blocked' && agent.status !== 'offline';
}
