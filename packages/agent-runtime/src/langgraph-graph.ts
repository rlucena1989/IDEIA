import { BaseMessage } from '@langchain/core/messages';
import { createLogger } from '@ideia/logger';
import { LLMProvider, ProviderRouter } from '@ideia/llm-provider';

export type LangGraphAgentRole = 'analyst' | 'architect' | 'programmer' | 'reviewer' | 'tester' | 'devops' | 'supervisor' | 'parallel_reviewer_tester';

export interface LangGraphStateAnnotation {
  input: string;
  context: Record<string, unknown>;
  currentRole: LangGraphAgentRole;
  outputs: Partial<Record<LangGraphAgentRole, string>>;
  decisions: string[];
  artifacts: Array<{ role: LangGraphAgentRole; type: string; content: string }>;
  errors: string[];
  completed: boolean;
  messages: BaseMessage[];
}

export type LangGraphNodeFunction = (state: LangGraphStateAnnotation) => Promise<Partial<LangGraphStateAnnotation>>;

export interface LangGraphNodeTiming {
  role: LangGraphAgentRole;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  attempts: number;
  durationMs: number;
  error?: string;
}

export interface LangGraphExecutionSummary {
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  skippedNodes: number;
  totalDurationMs: number;
  timing: LangGraphNodeTiming[];
}

export interface LangGraphConfig {
  maxIterations?: number;
  nodeTimeout?: number;
  maxRetries?: number;
  enableCheckpointing?: boolean;
  enableParallelExecution?: boolean;
  threadId?: string;
}

const DEFAULT_CONFIG: LangGraphConfig = {
  maxIterations: 10,
  nodeTimeout: 30000,
  maxRetries: 3,
  enableCheckpointing: true,
  enableParallelExecution: true,
};

const defaultState = (input: string): LangGraphStateAnnotation => ({
  input,
  context: {},
  currentRole: 'analyst',
  outputs: {},
  decisions: [],
  artifacts: [],
  errors: [],
  completed: false,
  messages: [],
});

function mergeState(a: LangGraphStateAnnotation, b: Partial<LangGraphStateAnnotation>): LangGraphStateAnnotation {
  return {
    input: b.input ?? a.input,
    context: { ...a.context, ...b.context },
    currentRole: b.currentRole ?? a.currentRole,
    outputs: { ...a.outputs, ...b.outputs },
    decisions: [...a.decisions, ...(b.decisions ?? [])],
    artifacts: [...a.artifacts, ...(b.artifacts ?? [])],
    errors: [...a.errors, ...(b.errors ?? [])],
    completed: b.completed ?? a.completed,
    messages: [...a.messages, ...(b.messages ?? [])],
  };
}

export class LangGraphAgent {
  protected nodes: Map<string, LangGraphNodeFunction> = new Map();
  protected edges: Map<string, string> = new Map();
  protected conditionalEdges: Map<string, (state: LangGraphStateAnnotation) => string> = new Map();
  protected config: LangGraphConfig;
  protected timings: Map<LangGraphAgentRole, LangGraphNodeTiming> = new Map();
  protected entryPoint: LangGraphAgentRole = 'analyst';
  protected onStatusChangeCallback?: (role: LangGraphAgentRole, status: LangGraphNodeTiming['status'], timing: LangGraphNodeTiming) => void;
  protected providerRouter: ProviderRouter;

  constructor(config: LangGraphConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.providerRouter = new ProviderRouter();
  }

  setConfig(config: Partial<LangGraphConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LangGraphConfig {
    return { ...this.config };
  }

  registerProvider(provider: LLMProvider): void {
    this.providerRouter.register(provider);
  }

  setProviderPriority(names: string[]): void {
    this.providerRouter.setPriority(names);
  }

  getActiveProvider(): LLMProvider | undefined {
    try {
      return this.providerRouter.getActive();
    } catch {
      return undefined;
    }
  }

  listProviders(): string[] {
    return this.providerRouter.listProviders();
  }

  onStatusChange(callback: (role: LangGraphAgentRole, status: LangGraphNodeTiming['status'], timing: LangGraphNodeTiming) => void): void {
    this.onStatusChangeCallback = callback;
  }

  addNode(role: LangGraphAgentRole, nodeFn: LangGraphNodeFunction): void {
    this.nodes.set(role, nodeFn);
  }

  addEdge(from: string, to: string): void {
    this.edges.set(from, to);
  }

  addConditionalEdge(
    from: string,
    condition: (state: LangGraphStateAnnotation) => string
  ): void {
    this.conditionalEdges.set(from, condition);
  }

  setEntryPoint(role: LangGraphAgentRole): void {
    this.entryPoint = role;
  }

  protected async executeNodeWithRetry(
    role: LangGraphAgentRole,
    state: LangGraphStateAnnotation
  ): Promise<{ state: LangGraphStateAnnotation; timing: LangGraphNodeTiming }> {
    const nodeFn = this.nodes.get(role);
    if (!nodeFn) {
      const errMsg = `No node registered for role: ${role}`;
      return {
        state: mergeState(state, { errors: [...state.errors, errMsg] }),
        timing: { role, status: 'failed', attempts: 0, durationMs: 0, error: errMsg },
      };
    }

    const timing: LangGraphNodeTiming = {
      role,
      status: 'pending',
      attempts: 0,
      durationMs: 0,
    };

    this.timings.set(role, timing);
    this.onStatusChangeCallback?.(role, 'pending', timing);

    const start = Date.now();
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= (this.config.maxRetries ?? 3); attempt++) {
      timing.attempts = attempt;
      timing.status = 'running';
      this.onStatusChangeCallback?.(role, 'running', timing);

      try {
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
        const result = await Promise.race([
          nodeFn(state),
          new Promise<Partial<LangGraphStateAnnotation>>((_, reject) => {
            timeoutHandle = setTimeout(() => reject(new Error(`Node ${role} timed out after ${this.config.nodeTimeout}ms`)), this.config.nodeTimeout);
          }),
        ]);
        clearTimeout(timeoutHandle);

        timing.durationMs = Date.now() - start;
        timing.status = 'completed';
        this.onStatusChangeCallback?.(role, 'completed', timing);

        const newState = mergeState(state, result);
        return { state: newState, timing };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        timing.error = lastError;

        if (attempt < (this.config.maxRetries ?? 3)) {
          timing.status = 'pending';
          this.onStatusChangeCallback?.(role, 'pending', timing);
        }
      }
    }

    timing.durationMs = Date.now() - start;
    timing.status = 'failed';
    this.onStatusChangeCallback?.(role, 'failed', timing);

    const failedState = mergeState(state, {
      errors: [...state.errors, `[attempt ${this.config.maxRetries}/${this.config.maxRetries}] ${role}: ${lastError}`],
    });

    return { state: failedState, timing };
  }

  async compile(): Promise<this> {
    return this;
  }

  async invoke(input: string, _config?: { threadId?: string }): Promise<{
    finalState: LangGraphStateAnnotation;
    summary: LangGraphExecutionSummary;
  }> {
    let state = defaultState(input);
    state.currentRole = this.entryPoint;

    const overallStart = Date.now();
    this.timings.clear();
    const timings: LangGraphNodeTiming[] = [];
    const visited = new Set<string>();
    let iterations = 0;

    while (!state.completed && iterations < (this.config.maxIterations ?? 10)) {
      const role = state.currentRole;

      if (visited.has(role) && role !== this.entryPoint) {
        state = mergeState(state, {
          errors: [...state.errors, `Cycle detected at role: ${role}`],
          completed: true,
        });
        break;
      }
      visited.add(role);

      const nodeResult = await this.executeNodeWithRetry(role, state);
      state = nodeResult.state;
      timings.push(nodeResult.timing);

      const conditionalNext = this.conditionalEdges.get(role);
      if (conditionalNext) {
        const next = conditionalNext(state);
        if (next === '__end__' || next === 'end') {
          state = mergeState(state, { completed: true });
          break;
        }
        state = mergeState(state, { currentRole: next as LangGraphAgentRole });
      } else {
        const directNext = this.edges.get(role);
        if (directNext) {
          if (directNext === '__end__' || directNext === 'end') {
            state = mergeState(state, { completed: true });
            break;
          }
          state = mergeState(state, { currentRole: directNext as LangGraphAgentRole });
        } else {
          state = mergeState(state, { completed: true });
          break;
        }
      }

      iterations++;
    }

    const totalDurationMs = Date.now() - overallStart;
    const completedNodes = timings.filter(t => t.status === 'completed').length;
    const failedNodes = timings.filter(t => t.status === 'failed').length;
    const skippedNodes = timings.filter(t => t.status === 'skipped').length;

    const summary: LangGraphExecutionSummary = {
      totalNodes: timings.length,
      completedNodes,
      failedNodes,
      skippedNodes,
      totalDurationMs,
      timing: timings,
    };

    return { finalState: state, summary };
  }

  getTimings(): LangGraphNodeTiming[] {
    return Array.from(this.timings.values());
  }

  reset(): void {
    this.timings.clear();
  }
}

export function createLangGraphAgent(config?: LangGraphConfig): LangGraphAgent {
  return new LangGraphAgent(config);
}
