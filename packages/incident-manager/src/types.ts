export enum IncidentSeverity {
  critical = 'critical',
  high = 'high',
  medium = 'medium',
  low = 'low',
}

export enum IncidentStatus {
  detected = 'detected',
  analyzing = 'analyzing',
  contained = 'contained',
  resolved = 'resolved',
  post_mortem = 'post_mortem',
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  detectedAt: Date;
  resolvedAt?: Date;
  sla: Date;
  assignee?: string;
  tags: string[];
  notes: TimelineEntry[];
}

export interface TimelineEntry {
  timestamp: Date;
  type: 'status_change' | 'note' | 'assignment' | 'resolution';
  message: string;
  author?: string;
}

export interface PostMortem {
  incidentId: string;
  rootCause: string;
  impact: string;
  actionItems: ActionItem[];
  lessons: string;
  completedAt?: Date;
}

export interface ActionItem {
  id: string;
  description: string;
  owner: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
}
