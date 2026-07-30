export interface HealthData {
  overall: number;
  trend: 'improving' | 'worsening' | 'stable';
  categories: Record<string, number>;
}

export interface MetricsSummary {
  gapCount: { open: number; resolved: number };
  testCoverage: number;
  llmResponseTimeMs: number;
  autoCorrectionCount: number;
}

export interface EvolutionDataPoint {
  timestamp: string;
  health: number;
  coverage: number;
  gapCount: number;
}

export interface TechRecommendation {
  technology: string;
  score: number;
  effort: string;
  rationale: string;
}

export interface AutoAdrSummary {
  id: string;
  title: string;
  status: string;
  date: string;
}

export interface ActivityEntry {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ProjectHealth {
  overall: number;
  codeQuality: number;
  dependencyHealth: number;
  testHealth: number;
  docsHealth: number;
}

export interface DependencyInfo {
  name: string;
  current: string;
  latest: string;
  outdated: boolean;
  critical: boolean;
}

export interface QualityReport {
  lintScore: number;
  typeScore: number;
  complexityScore: number;
  duplicationScore: number;
  maintainabilityScore: number;
}

export interface OptimizationSuggestion {
  id: string;
  category: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'minutes' | 'hours' | 'days';
}

export interface AutonomyLevelCard {
  current: string;
  level: number;
  maxLevel: number;
  progress: number;
  nextLevel: string | null;
}

export interface MetricCard {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  unit?: string;
}

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'pie';
  title: string;
  series: ChartSeries[];
}

export interface DashboardWidget {
  id: string;
  type: 'health' | 'metrics' | 'chart' | 'activity' | 'tech-radar' | 'adr' | 'gap' | 'autonomy' | 'optimization';
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  data: unknown;
  category?: string;
  trend?: 'improving' | 'worsening' | 'stable';
  sparklineData?: number[];
}
