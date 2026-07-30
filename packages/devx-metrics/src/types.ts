export type Period = '24h' | '7d' | '30d' | 'sprint';
export type TrendDirection = 'improving' | 'stable' | 'declining';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export type SurveyDimension = 'satisfaction' | 'autonomy' | 'fluidez' | 'confianca' | 'sobrecarga';
export type BlockSeverity = 'passed' | 'warning' | 'critical';

export interface DORAMetrics {
  deployFrequency: number;
  leadTime: number;
  mttr: number;
  changeFailureRate: number;
  period: Period;
  timestamp: Date;
}

export interface DORAHistory {
  date: string;
  deployFrequency: number;
  leadTime: number;
  mttr: number;
  changeFailureRate: number;
}

export interface SPACEScore {
  satisfaction: number;
  performance: number;
  activity: number;
  communication: number;
  efficiency: number;
  timestamp: Date;
}

export interface SurveyResponse {
  id: string;
  userId: string;
  dimension: SurveyDimension;
  score: number;
  type: 'likert' | 'sus' | 'nps';
  comment?: string;
  isPositive: boolean;
  timestamp: Date;
}

export interface SurveyTemplate {
  id: string;
  name: string;
  dimensions: SurveyDimension[];
  questions: Array<{ id: string; text: string; dimension: SurveyDimension; type: 'likert' | 'sus' | 'nps' }>;
  frequency: 'weekly' | 'monthly' | 'quarterly';
}

export interface AggregatedReport {
  period: Period;
  deployFrequency: number;
  leadTime: number;
  mttr: number;
  changeFailureRate: number;
  cycleTime: number;
  prTurnaround: number;
  blockRate: number;
  reworkRate: number;
  sampleSize: number;
}

export interface CategoryScore {
  name: string;
  weight: number;
  score: number;
  grade: Grade;
  value: number;
  target: number;
  trend: TrendDirection;
}

export interface ScorecardResult {
  overall: { score: number; grade: Grade; trend: TrendDirection; trendDelta: number };
  categories: CategoryScore[];
  recommendations: string[];
  timestamp: Date;
  period: Period;
}

export interface TrendReport {
  metric: string;
  direction: TrendDirection;
  slope: number;
  predictedNext: number;
  recommendations: string[];
}

export interface MetricEvent {
  type: 'deploy' | 'pr_merge' | 'incident' | 'task_complete' | 'ci_result' | 'blocker';
  timestamp: Date;
  duration: number;
  status: 'success' | 'failure' | 'blocked';
  metadata: Record<string, unknown>;
}

export interface AlertThreshold {
  metric: string;
  warning: number;
  critical: number;
  operator: 'lt' | 'gt' | 'lte' | 'gte';
  cooldownMinutes: number;
}

export interface DevExAlert {
  id: string;
  metric: string;
  severity: 'warning' | 'critical';
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface CorrelationResult {
  correlations: Array<{ dimension: string; meanScore: number; correlation: number; interpretation: string }>;
  nps: number;
  sus: number;
  topPainPoints: string[];
}

export interface ProductivityMetric {
  date: string;
  prsCreated: number;
  prsMerged: number;
  issuesClosed: number;
  commitsPushed: number;
  codeLinesChanged: number;
  activeDevs: number;
}

export interface DashboardConfig {
  refreshInterval: number;
  visibleMetrics: string[];
  alertThresholds: Record<string, number>;
}
