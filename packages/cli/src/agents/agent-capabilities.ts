import { OperationalAgent } from './agent-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('agent-capabilities');

export function canPerform(agent: OperationalAgent, taskType: string): boolean {
  return agent.capabilities.includes(taskType) && agent.status !== 'blocked' && agent.status !== 'offline';
}
