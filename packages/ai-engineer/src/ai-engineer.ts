import { createLogger } from '@ideia/logger';
import type { LLMProvider } from '@ideia/llm-provider';
import { TaskDecomposer, type TaskDecompositionResult } from './task-decomposer';
import type { AiEngineerConfig, AiEngineerResult, AiEngineerStatus, AiEngineerSubTask, AiEngineerTask } from './types';

const log = createLogger('ai-engineer:core');

export class AiEngineer {
  private llmProvider: LLMProvider;
  private decomposer: TaskDecomposer;
  private config: AiEngineerConfig;
  private _status: AiEngineerStatus = 'decomposing';
  private coordinator: unknown;
  private _tasks: AiEngineerTask[] = [];
  private _taskIdCounter = 0;

  constructor(llmProvider: LLMProvider, coordinator?: unknown, config?: Partial<AiEngineerConfig>) {
    this.llmProvider = llmProvider;
    this.coordinator = coordinator;
    this.decomposer = new TaskDecomposer(llmProvider);
    this.config = { requireSequential: true, ...config };
  }

  get status(): AiEngineerStatus { return this._status; }

  getCoordinator(): unknown { return this.coordinator; }

  getTasks(): AiEngineerTask[] { return [...this._tasks]; }

  getTask(id: string): AiEngineerTask | undefined { return this._tasks.find(t => t.id === id); }

  async executeTask(task: string, _taskId?: string): Promise<AiEngineerResult> {
    const taskId = _taskId ?? `task-${++this._taskIdCounter}`;
    const start = Date.now();
    this._status = 'decomposing';

    const decomposition = await this.decomposer.decompose(task);
    const subTasks: AiEngineerSubTask[] = decomposition.subTasks.map((st, i) => ({
      id: `sub-${i + 1}`,
      description: st.description,
      agentRole: st.agentRole,
      status: 'pending' as const,
    }));

    this._status = 'executing';
    let summary = '';
    for (const st of subTasks) {
      st.status = 'in_progress';
      try {
        const response = await this.llmProvider.chat({ model: '', messages: [{ role: 'user', content: st.description }] });
        st.result = response;
        st.status = 'completed';
        summary += `Completed ${st.description}\n`;
      } catch (err) {
        st.status = 'failed';
        st.error = String(err);
        summary += `Failed ${st.description}: ${String(err)}\n`;
      }
    }

    this._status = 'completed';
    const result: AiEngineerResult = {
      taskId,
      status: 'completed',
      subTasks,
      coordinationState: undefined,
      summary,
      durationMs: Date.now() - start,
    };
    return result;
  }

  async executePipeline(tasks: string[]): Promise<AiEngineerResult[]> {
    return Promise.all(tasks.map(t => this.executeTask(t)));
  }
}

export function createAiEngineer(llmProvider: LLMProvider, coordinator?: unknown, config?: Partial<AiEngineerConfig>): AiEngineer {
  return new AiEngineer(llmProvider, coordinator, config);
}
