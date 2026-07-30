import type { CoordinationState } from '@ideia/agent-runtime';
import { createLogger } from '@ideia/logger';
const logger = createLogger('types');

export interface AiEngineerSubTask {
  id: string;
  description: string;
  agentRole: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

export type AiEngineerStatus = 'decomposing' | 'assigning' | 'executing' | 'completed' | 'failed';

export interface AiEngineerTask {
  id: string;
  description: string;
  subTasks: AiEngineerSubTask[];
  status: AiEngineerStatus;
  createdAt: string;
  updatedAt: string;
  result?: string;
  error?: string;
}

export interface AiEngineerResult {
  taskId: string;
  status: AiEngineerStatus;
  subTasks: AiEngineerSubTask[];
  coordinationState?: CoordinationState;
  summary: string;
  durationMs: number;
}

export interface AiEngineerConfig {
  maxSubTasks?: number;
  subTaskTimeout?: number;
  requireSequential?: boolean;
}
