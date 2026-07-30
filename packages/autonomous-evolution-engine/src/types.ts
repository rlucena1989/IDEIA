export type ScannerType =
  | 'health'
  | 'version'
  | 'test'
  | 'lint'
  | 'perf'
  | 'security'
  | 'contract'
  | 'tech'
  | 'scope'
  | 'memory';

export interface ScanFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  file?: string;
  line?: number;
  code?: string;
}

export interface ScanRecommendation {
  action: string;
  priority: number;
  effort: 'minutes' | 'hours' | 'days' | 'sprint';
  category: ScannerType;
}

export interface ScanResult {
  scanner: ScannerType;
  timestamp: number;
  score: number;
  findings: ScanFinding[];
  recommendations: ScanRecommendation[];
  duration: number;
}

export interface ScannerConfig {
  type: ScannerType;
  frequencyMs: number;
  enabled: boolean;
}

export type TrendDirection = 'improving' | 'worsening' | 'stable';

export interface Trend {
  scanner: ScannerType;
  direction: TrendDirection;
  delta: number;
  history: number[];
  window: number;
}

export interface AnalyzedResult {
  timestamp: number;
  trends: Trend[];
  recommendations: PrioritizedRecommendation[];
  overallHealth: number;
}

export interface PrioritizedRecommendation {
  action: string;
  confidence: number;
  priority: number;
  effort: 'minutes' | 'hours' | 'days' | 'sprint';
  category: ScannerType;
  rationale: string;
}

export interface ExecutionStep {
  id: string;
  description: string;
  action: string;
  target: string;
  backupPath?: string;
  estimatedMs: number;
  risk: 'low' | 'medium' | 'high';
}

export interface EvolutionPlan {
  id: string;
  steps: ExecutionStep[];
  totalEffortMs: number;
  riskScore: number;
  createdAt: number;
}

export type AutonomyLevel = 'N0' | 'N1' | 'N2' | 'N3' | 'N4' | 'N5';

export function autonomyLevelToLabel(level: AutonomyLevel): string {
  const labels: Record<AutonomyLevel, string> = {
    N0: 'Passive',
    N1: 'Assisted',
    N2: 'Semi-Autonomous',
    N3: 'Autonomous',
    N4: 'Proactive',
    N5: 'Self-Evolving',
  };
  return labels[level];
}

export function autonomyLevelToNumber(level: AutonomyLevel): number {
  const order: AutonomyLevel[] = ['N0', 'N1', 'N2', 'N3', 'N4', 'N5'];
  return order.indexOf(level);
}

export interface MetricsBottleneck {
  metric: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  currentValue: number;
  thresholdValue: number;
  recommendation: string;
  category: 'performance' | 'storage' | 'memory' | 'cpu';
}

export interface EvolutionReport {
  cycleId: string;
  autonomyLevel: AutonomyLevel;
  scanResults: ScanResult[];
  analyzedResult: AnalyzedResult;
  plan?: EvolutionPlan;
  stepsExecuted: number;
  stepsFailed: number;
  adrGenerated: boolean;
  duration: number;
  success: boolean;
  errors: string[];
  levelProgress?: AutonomyLevelProgress;
}

export interface AutonomyLevelProgress {
  currentLevel: AutonomyLevel;
  nextLevel: AutonomyLevel | null;
  score: number;
  criteria: Array<{ name: string; met: boolean; weight: number }>;
}
