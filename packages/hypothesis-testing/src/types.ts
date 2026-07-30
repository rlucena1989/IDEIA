// ==========================================================================
// types.ts — Interfaces e tipos para o Hypothesis Testing Framework
// ==========================================================================

export type TestDirection = 'two-sided' | 'greater' | 'less';
export type HypothesisStatus = 'untested' | 'testing' | 'confirmed' | 'rejected' | 'inconclusive';
export type StatisticalTestType = 'independent-t' | 'paired-t' | 'anova' | 'mann-whitney' | 'chi-square' | 'bayesian-ab' | 'cohens-d';

export interface HypothesisDefinition {
  id: string;
  name: string;
  description: string;
  nullHypothesis: string;
  alternative: string;
  direction: TestDirection;
  predictedEffectSize: number;
  alpha: number;
  beta: number;
  metrics: string[];
  independentVariable: { name: string; levels: string[] };
  dependentVariable: { name: string; unit: string; aggregation: string };
  controlVariables: Array<{ name: string; value: unknown }>;
  sampleSize: number;
  testType: StatisticalTestType;
  tags?: string[];
  owner?: string;
  createdAt?: string;
}

export interface ExperimentData {
  control: number[];
  treatment: number[];
  metadata?: Record<string, unknown>;
}

export interface HypothesisTestResult {
  hypothesisId: string;
  status: HypothesisStatus;
  pValue: number | null;
  effectSize: number | null;
  conclusion: string;
  experimentsRun: number;
  lastTested: string | null;
  testType: StatisticalTestType;
  sampleSize: number;
  confidenceInterval?: [number, number];
  statisticalPower?: number;
  bayesFactor?: number;
  errorMessage?: string;
}

export interface ExperimentConfig {
  id: string;
  hypothesisId: string;
  controlConfig: Record<string, unknown>;
  treatmentConfig: Record<string, unknown>;
  sampleSize: number;
  repetitions: number;
  tasks: string[];
  timeoutMs?: number;
}

export interface ExperimentResult {
  experimentId: string;
  hypothesisId: string;
  controlData: number[];
  treatmentData: number[];
  startTime: string;
  endTime: string;
  duration: number;
  error?: string;
}

export interface DataPoint {
  timestamp: string;
  hypothesisId: string;
  experimentId: string;
  metric: string;
  value: number;
  group: 'control' | 'treatment';
  taskId: string;
  metadata: Record<string, unknown>;
}

export interface HypothesisCIConfig {
  registry: HypothesisDefinition[];
  tasks: string[];
  repetitions: number;
  outputDir: string;
  reportFormats: ('markdown' | 'json' | 'html')[];
  notifyOnRegression: boolean;
  baselinePath?: string;
  maxConcurrentExperiments: number;
}

export interface HypothesisSummary {
  total: number;
  confirmed: number;
  rejected: number;
  untested: number;
  inconclusive: number;
  score: number;
  generatedAt: string;
}

export type ProgressCallback = (experimentId: string, status: string, progress: number) => void;

export interface ReportOptions {
  includeHistory: boolean;
  includeRawData: boolean;
  outputFormat: 'markdown' | 'json' | 'html';
  dashboardTheme?: 'dark' | 'light';
}