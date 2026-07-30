export type AutonomyLevel = 'N0' | 'N1' | 'N2' | 'N3' | 'N4';

export interface OrchestratorConfig {
  initialLevel: AutonomyLevel;
  maxLevel: AutonomyLevel;
  safetyThresholds: SafetyThresholds;
}

export interface SafetyThresholds {
  maxErrorRate: number;
  minThroughput: number;
  maxLatency: number;
}

export interface AutonomyChangeEvent {
  from: AutonomyLevel;
  to: AutonomyLevel;
  reason: string;
  timestamp: string;
  triggeredBy: 'manual' | 'auto' | 'safety';
}

export interface AutonomyHistory {
  events: AutonomyChangeEvent[];
  currentLevel: AutonomyLevel;
}

export interface SystemMetrics {
  errorRate: number;
  throughput: number;
  latency: number;
}
