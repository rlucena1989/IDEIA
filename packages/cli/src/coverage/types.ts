export interface CoverageFileSummary {
  file: string;
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  uncoveredLines: number[];
  module?: string;
}

export interface CoverageReport {
  overall: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  files: CoverageFileSummary[];
}

export type GapSeverity = 'critical' | 'important' | 'optional' | 'cosmetic';

export interface CoverageGap {
  id: string;
  file: string;
  module: string;
  severity: GapSeverity;
  reason: string;
  impact: string;
  recommendation: string;
}

export interface AutonomyStatus {
  lastRunAt?: string;
  overallCoverage: number;
  gapsFound: number;
  gapsResolved: number;
  currentFocus?: string;
  nextAction?: string;
  blocked: boolean;
  reason?: string;
}
