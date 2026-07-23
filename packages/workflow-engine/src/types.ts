export type WorkflowStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'blocked';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type SprintStatus = 'planning' | 'active' | 'review' | 'completed';

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  assignee?: string;
  dependsOn: string[];
  estimatedHours?: number;
  priority?: number;
  deadline?: string;
  tags: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  capacity: number;
  tasks: string[];
  burndown: { date: string; remaining: number }[];
}

export interface WorkflowSummary {
  total: number;
  byStatus: Record<string, number>;
  completionRate: number;
}
