import { AgentTask, AgentTaskResult, OperationalAgent } from './agent-types';
import { createLogger } from '@ideia/logger';
import { canPerform } from './agent-capabilities';
const logger = createLogger('agent-coordinator');

export function coordinateTasks(
  agents: OperationalAgent[],
  tasks: AgentTask[]
): { assigned: AgentTask[]; rejected: AgentTask[]; results: AgentTaskResult[] } {
  const assigned: AgentTask[] = [];
  const rejected: AgentTask[] = [];
  const results: AgentTaskResult[] = [];

  for (const task of tasks) {
    const agent = agents.find(a => a.agentId === task.agentId);
    if (!agent || !canPerform(agent, task.type)) {
      rejected.push(task);
      results.push({
        taskId: task.taskId,
        agentId: task.agentId,
        ok: false,
        output: null,
        notes: ['Agent cannot perform task.'],
        completedAt: new Date().toISOString(),
      });
      continue;
    }

    assigned.push(task);
    results.push({
      taskId: task.taskId,
      agentId: task.agentId,
      ok: true,
      output: { delegated: true },
      notes: ['Task delegated successfully.'],
      completedAt: new Date().toISOString(),
    });
  }

  return { assigned, rejected, results };
}
