import * as crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('agent-types');

export interface OperationalAgent {
  agentId: string;
  name: string;
  role: 'planner' | 'generator' | 'validator' | 'auditor' | 'synchronizer' | 'recoverer' | 'governor';
  status: 'idle' | 'busy' | 'blocked' | 'offline';
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentTask {
  taskId: string;
  agentId: string;
  type: string;
  contextId: string;
  priority: number;
  input: unknown;
  expectedOutput: string;
  dueAt?: string;
}

export interface AgentTaskResult {
  taskId: string;
  agentId: string;
  ok: boolean;
  output: unknown;
  notes: string[];
  completedAt: string;
}

export function createAgent(params: {
  name: string;
  role: OperationalAgent['role'];
  capabilities?: string[];
  status?: OperationalAgent['status'];
}): OperationalAgent {
  return {
    agentId: crypto.randomUUID(),
    name: params.name,
    role: params.role,
    status: params.status ?? 'idle',
    capabilities: params.capabilities ?? [params.role],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createTask(params: {
  agentId: string;
  type: string;
  contextId?: string;
  priority?: number;
  input?: unknown;
  expectedOutput?: string;
}): AgentTask {
  return {
    taskId: crypto.randomUUID(),
    agentId: params.agentId,
    type: params.type,
    contextId: params.contextId ?? 'default',
    priority: params.priority ?? 5,
    input: params.input ?? {},
    expectedOutput: params.expectedOutput ?? 'ok',
  };
}
