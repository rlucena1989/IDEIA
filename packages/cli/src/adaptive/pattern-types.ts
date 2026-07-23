export interface OperationalEvent {
  eventId: string;
  type: 'state' | 'consistency' | 'hardening' | 'generation' | 'evolution';
  command: string;
  outcome: 'ok' | 'warning' | 'blocked' | 'failed';
  scoreBefore?: number;
  scoreAfter?: number;
  createdAt: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface OperationalPattern {
  patternId: string;
  name: string;
  description: string;
  frequency: number;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  triggers: string[];
  recommendedAction: 'generate' | 'repair' | 'sync' | 'review' | 'block' | 'defer';
}
