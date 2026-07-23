export type AutonomyLevel = 'passive' | 'assisted' | 'autonomous';

export type EmergencyAction = 'stop' | 'pause' | 'rollback' | 'resume';

export interface TowerStatus {
  autonomyLevel: AutonomyLevel;
  healthPercent: number;
  lastAction: string | null;
  lastActionTimestamp: string | null;
  pendingDecisions: number;
  mode: string;
  activeTriggers: number;
}

export interface TimelineEntry {
  id: string;
  type: 'emergency' | 'autonomy-change' | 'decision' | 'profile-change' | 'system';
  description: string;
  timestamp: string;
  actor: string;
}

export interface DecisionLogEntry {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  actor: string;
  approved: boolean;
  details?: string;
}

export interface CliOutput {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}
