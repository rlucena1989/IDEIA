export interface AutonomousCycle {
  cycleId: string;
  startedAt: string;
  endedAt?: string;
  status: 'running' | 'completed' | 'degraded' | 'blocked';
  notes: string[];
}

export interface DriftSignal {
  driftId: string;
  dimension: 'consistency' | 'hardening' | 'sync' | 'quality' | 'governance' | 'performance' | 'autonomy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: string;
}

export interface TrendSignal {
  trendId: string;
  dimension: string;
  direction: 'improving' | 'stable' | 'degrading';
  confidence: number;
  observedAt: string;
}
