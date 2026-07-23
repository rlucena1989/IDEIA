export type CheckpointType = 'plan' | 'execution' | 'verification' | 'repair' | 'milestone' | 'snapshot';
export type CheckpointStatus = 'active' | 'archived' | 'corrupted';

export interface Checkpoint {
  id: string;
  taskId: string;
  type: CheckpointType;
  version: number;
  snapshot: Record<string, unknown>;
  diff?: Record<string, unknown>;
  parentId?: string;
  status: CheckpointStatus;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface CheckpointSummary {
  id: string;
  type: CheckpointType;
  version: number;
  createdAt: string;
  description: string;
}

export interface ResumeState {
  lastCheckpoint: Checkpoint | null;
  resumedFrom: string;
  pendingSteps: string[];
  completedSteps: string[];
  context: Record<string, unknown>;
}
