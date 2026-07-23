export type WCAGLevel = 'A' | 'AA' | 'AAA';
export type A11ySeverity = 'critical' | 'serious' | 'moderate' | 'minor';
export type A11yCategory = 'perceivable' | 'operable' | 'understandable' | 'robust';

export interface A11yRule {
  id: string;
  name: string;
  description: string;
  wcagLevel: WCAGLevel;
  wcagCriterion: string;
  category: A11yCategory;
  severity: A11ySeverity;
}

export interface A11yViolation {
  ruleId: string;
  ruleName: string;
  filePath: string;
  line: number;
  message: string;
  severity: A11ySeverity;
  wcagLevel: WCAGLevel;
  suggestion?: string;
}

export interface A11yReport {
  totalViolations: number;
  bySeverity: Record<string, number>;
  byWCAGLevel: Record<string, number>;
  byCategory: Record<string, number>;
  violations: A11yViolation[];
  score: number;
}

export interface ScanOptions {
  include?: string[];
  exclude?: string[];
  wcagLevel?: WCAGLevel;
}
