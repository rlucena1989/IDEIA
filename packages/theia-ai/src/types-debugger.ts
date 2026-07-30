export interface DebugSessionConfig {
  captureThoughts: boolean;
  captureState: boolean;
  captureToolCalls: boolean;
  captureLLM: boolean;
  maxTraceRecords: number;
  breakOnError: boolean;
  maskSensitiveData: boolean;
}

export interface SessionMetrics {
  totalSteps: number;
  totalTokens: number;
  totalDuration: number;
  maxStepDuration: number;
  avgStepDuration: number;
  toolCallCount: number;
  llmCallCount: number;
}

export type SessionStatus = 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface DebugSession {
  id: string;
  agentId: string;
  agentType: string;
  startTime: number;
  endTime?: number;
  status: SessionStatus;
  config: DebugSessionConfig;
  metrics: SessionMetrics;
  metadata: Record<string, string>;
}

export type StepType = 'plan' | 'execute' | 'think' | 'decide' | 'tool_call' | 'llm_request' | 'sub_agent' | 'wait' | 'error';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'backtracked';

export interface TraceRecord {
  id: string;
  sessionId: string;
  stepId: string;
  stepNumber: number;
  type: string;
  action: string;
  timestamp: number;
  duration: number;
  status: StepStatus;
  thought?: string;
  state?: Record<string, unknown>;
  toolCalls: ToolCallRecord[];
  llmCalls: LLMConversationRecord[];
  perfMetrics?: PerfMetrics;
}

export interface BreakpointCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'matches';
  value: unknown;
}

export interface Breakpoint {
  id: string;
  sessionId: string;
  condition: BreakpointCondition;
  enabled: boolean;
  hitCount: number;
  maxHits?: number;
}

export interface BreakpointResult {
  matched: boolean;
  breakpoint?: Breakpoint;
  step?: TraceRecord;
  state?: Record<string, unknown>;
}

export interface ToolCallRecord {
  tool: string;
  input: unknown;
  output?: unknown;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
}

export interface LLMConversationRecord {
  messages: unknown[];
  response: unknown;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  provider: string;
  latency: number;
}

export interface PerfMetrics {
  stepDuration: number;
  totalDuration: number;
  tokenUsage: number;
  memoryUsage: number;
  cpuUsage: number;
  toolCallCount: number;
}

export interface ExecutionState {
  stepId: string;
  agentId: string;
  status: SessionStatus;
  variables: Record<string, unknown>;
  context: Record<string, unknown>;
  history: TraceRecord[];
}

export type DebugEventType = 'stepStarted' | 'stepCompleted' | 'thought' | 'stateChanged' | 'toolCall' | 'llmRequest' | 'breakpointHit' | 'sessionState' | 'error';

export interface DebugEvent {
  type: DebugEventType;
  sessionId: string;
  stepId?: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface StepStartedPayload {
  stepId: string;
  stepNumber: number;
  type: string;
  action: string;
  timestamp: number;
}

export interface StepCompletedPayload {
  stepId: string;
  stepNumber: number;
  status: StepStatus;
  duration: number;
  output?: unknown;
}

export interface ThoughtPayload {
  stepId: string;
  content: string;
  tokens?: number;
}

export interface StateChangedPayload {
  stepId: string;
  diffs: Array<{ path: string; type: 'added' | 'removed' | 'changed'; oldValue?: unknown; newValue?: unknown }>;
  snapshot: Record<string, unknown>;
}

export interface ToolCallPayload {
  tool: string;
  input: unknown;
  output?: unknown;
  duration: number;
  success: boolean;
}

export interface LLMRequestPayload {
  messages: unknown[];
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  latency: number;
}

export interface BreakpointHitPayload {
  breakpointId: string;
  condition: BreakpointCondition;
  step: TraceRecord;
  state: Record<string, unknown>;
}

export interface SessionStatePayload {
  sessionId: string;
  status: SessionStatus;
  progress: number;
  metrics: SessionMetrics;
}

export interface ErrorPayload {
  stepId?: string;
  message: string;
  code: string;
  stack?: string;
}

export interface SessionSearchQuery {
  stepType?: string;
  status?: StepStatus;
  text?: string;
  toolName?: string;
  fromTime?: number;
  toTime?: number;
  offset?: number;
  limit?: number;
}
