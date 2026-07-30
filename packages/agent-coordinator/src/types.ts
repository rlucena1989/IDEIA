export interface AgentSkill {
  name: string;
  level: number;
  category: string;
}

export interface AgentCapability {
  agentId: string;
  role: string;
  skills: AgentSkill[];
  maxLoad: number;
  currentLoad: number;
  history: AgentHistoryEntry[];
}

export interface AgentHistoryEntry {
  taskId: string;
  taskType: string;
  startedAt: string;
  completedAt: string;
  success: boolean;
  duration: number;
}

export interface TaskProfile {
  taskId: string;
  type: string;
  requiredSkills: string[];
  estimatedComplexity: number;
  priority: number;
  metadata?: Record<string, unknown>;
}

export interface MatchingResult {
  agentId: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface CoordinationResult {
  taskId: string;
  assignedAgent: string;
  fallbackAgent?: string;
  status: 'assigned' | 'fallback' | 'failed';
  error?: string;
}
