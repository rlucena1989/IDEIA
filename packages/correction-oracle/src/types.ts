export type CheckSeverity = 'error' | 'warning' | 'info';
export type CheckCategory = 'syntax' | 'type' | 'logic' | 'security' | 'performance' | 'style' | 'test';

export interface CheckResult {
  id: string;
  severity: CheckSeverity;
  category: CheckCategory;
  message: string;
  filePath: string;
  line?: number;
  suggestion?: string;
  confidence: number;
  autoFixable: boolean;
  fix?: string;
}

export interface OracleReport {
  totalChecks: number;
  errors: number;
  warnings: number;
  autoFixable: number;
  results: CheckResult[];
  score: number;
}

export interface OracleRule {
  id: string;
  name: string;
  category: CheckCategory;
  check: (content: string, filePath: string) => CheckResult[];
}
