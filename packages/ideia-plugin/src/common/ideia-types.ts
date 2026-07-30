export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

export interface Checkpoint {
  id: string;
  type: 'approval' | 'review' | 'confirmation';
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  changes?: FileChange[];
  createdAt: string;
}

export interface FileChange {
  path: string;
  originalContent: string;
  modifiedContent: string;
  status: 'added' | 'modified' | 'deleted';
}

export interface TaskSpec {
  id: string;
  title: string;
  description: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'blocked';
  agentId: string;
  checkpoints: Checkpoint[];
  createdAt: string;
  completedAt?: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'running' | 'error';
  currentTask?: string;
  metrics?: AgentMetrics;
}

export interface AgentMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageLatencyMs: number;
  tokensUsed: number;
}

export interface ProjectInfo {
  id: string;
  name: string;
  rootPath: string;
  language: string;
  framework: string;
  createdAt: string;
  status: 'generating' | 'ready' | 'error';
}

export interface SSEEvent {
  id: string;
  type: 'message' | 'tool_call' | 'checkpoint' | 'error' | 'done' | 'progress' | 'heartbeat';
  data: unknown;
  timestamp: string;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function createSSEEvent(
  type: SSEEvent['type'],
  data: unknown,
  id?: string,
): SSEEvent {
  return { id: id ?? generateId(), type, data, timestamp: new Date().toISOString() };
}

export interface DashboardMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  agentsActive: number;
  tokensUsed: number;
  averageScore: number;
  violationsActive: number;
  coveragePercent: number;
  servicesCount: number;
  capabilitiesCount: number;
  studiesCount: number;
  studiesCompleted: number;
  studyScore: number;
  tutorialsCompleted: number;
  tutorialsTotal: number;
  memoryUsageMB?: number;
}

export interface IdeaRequest {
  prompt: string;
  context?: {
    workspaceRoot?: string;
    language?: string;
    framework?: string;
    existingFiles?: string[];
  };
  options?: {
    autonomyLevel?: 'blocked' | 'guided' | 'autonomous';
    agentId?: string;
    model?: string;
  };
}

export interface ProjectResult {
  project: ProjectInfo;
  tasks: TaskSpec[];
  summary: string;
}
