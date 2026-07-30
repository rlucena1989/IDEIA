// ==========================================================================
// types.ts — Tipos do Framework de Design de Experimentos
// ==========================================================================

export type Strategy = 'simple' | 'blocked' | 'stratified' | 'adaptive';
export type SubjectStatus = 'pending' | 'control' | 'treatment' | 'dropped';

export interface Subject {
  id: string;
  features: Record<string, string | number | boolean>;
  block?: string;
  strata?: Record<string, string>;
  status: SubjectStatus;
  outcome?: number;
  metadata?: Record<string, unknown>;
}

export interface Assignment {
  control: Subject[];
  treatment: Subject[];
  balance: Record<string, { control: number; treatment: number }>;
  seed: number;
  strategy: Strategy;
  timestamp: number;
}

export interface ExperimentConfig {
  strategy: Strategy;
  alpha: number;
  power: number;
  effectSize: number;
  twoTailed: boolean;
  blockSize?: number;
  strataKeys?: string[];
  adaptiveUpdateInterval?: number;
  seed?: number;
  maxSubjects?: number;
}

export interface SampleSizeResult {
  nPerGroup: number;
  totalN: number;
  alpha: number;
  power: number;
  effectSize: number;
  twoTailed: boolean;
  method: 'analytic' | 'simulation';
}

export interface PowerResult {
  achievedPower: number;
  nPerGroup: number;
  effectSize: number;
  alpha: number;
  simulations: number;
}

export interface BalanceDiagnostic {
  passed: boolean;
  chiSquare: number;
  chiSquarePValue: number;
  maxStdDiff: number;
  variables: Array<{
    name: string;
    stdDiff: number;
    controlMean: number;
    treatmentMean: number;
    pValue: number;
  }>;
}

export interface TrialHistory {
  trials: Array<{
    subjectId: string;
    assignment: 'control' | 'treatment';
    timestamp: number;
    outcome?: number;
    weight: number;
  }>;
}

export interface ExperimentPlan {
  config: ExperimentConfig;
  assignment: Assignment;
  sampleSize: SampleSizeResult;
  power: PowerResult;
  balance: BalanceDiagnostic;
  trialHistory: TrialHistory;
}

export interface DesignerConfig {
  defaultAlpha: number;
  defaultPower: number;
  defaultEffectSize: number;
  defaultTwoTailed: boolean;
}
