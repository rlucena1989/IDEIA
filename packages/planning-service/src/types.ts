export type PlanStatus = 'draft' | 'active' | 'completed' | 'failed' | 'cancelled';

export interface PlanStep {
  id: string;
  description: string;
  status: PlanStatus;
  order: number;
  startedAt?: string;
  completedAt?: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  status: PlanStatus;
  steps: PlanStep[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failReason?: string;
}

export interface PlanHistoryEntry {
  planId: string;
  action: 'created' | 'step_completed' | 'completed' | 'failed' | 'cancelled';
  timestamp: string;
  details: string;
}

export interface PlanValidation {
  valid: boolean;
  errors: string[];
  rules: string[];
}

export interface PlanEvent {
  planId: string;
  action: 'created' | 'step_completed' | 'completed' | 'failed' | 'cancelled';
  timestamp: string;
  details: string;
}
