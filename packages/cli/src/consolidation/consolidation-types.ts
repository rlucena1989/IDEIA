export interface SystemConsolidation {
  consolidationId: string;
  createdAt: string;
  healthStatus: 'healthy' | 'degraded' | 'critical' | 'blocked';
  score: number;
  summary: string;
  signals: {
    telemetry: number;
    alerts: number;
    failures: number;
    policyViolations: number;
    activeAgents: number;
  };
  recommendations: string[];
}

export interface FinalVerdict {
  verdictId: string;
  decidedAt: string;
  status: 'healthy' | 'degraded' | 'critical' | 'blocked' | 'ready-for-autonomy' | 'requires-human-review';
  reason: string;
  allowAutonomy: boolean;
}
