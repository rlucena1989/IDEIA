/**
 * agent-runtime.ts — Sub-Agent Support + Execução Paralela (Item 4)
 *
 * Extends agent-runtime with sub-agent delegation and parallel execution.
 * Tasks can spawn sub-agents and await their results.
 */

export interface SubAgentTask {
  id: string;
  name: string;
  handler: () => Promise<unknown>;
  dependencies: string[];
}

export class AgentRuntime {
  private concurrency: number;

  constructor(concurrency = 3) {
    this.concurrency = concurrency;
  }

  async executeSubAgents(tasks: SubAgentTask[]): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>();
    const completed = new Set<string>();
    const remaining = [...tasks];

    while (remaining.length > 0) {
      const ready = remaining.filter(t =>
        t.dependencies.every(d => completed.has(d))
      );
      if (ready.length === 0) {
        throw new Error('Circular dependency detected');
      }

      const batch = ready.slice(0, this.concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(async task => {
          const result = await task.handler();
          return { id: task.id, result };
        })
      );

      for (const item of batchResults) {
        if (item.status === 'fulfilled') {
          results.set(item.value.id, item.value.result);
          completed.add(item.value.id);
        } else {
          throw item.reason;
        }
      }

      for (const task of batch) {
        const idx = remaining.indexOf(task);
        if (idx >= 0) remaining.splice(idx, 1);
      }
    }

    return results;
  }

  async delegate(handler: () => Promise<unknown>): Promise<unknown> {
    return handler();
  }
}
