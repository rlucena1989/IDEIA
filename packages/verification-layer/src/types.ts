export type CheckType = 'syntax' | 'typecheck' | 'lint' | 'test' | 'build' | 'security' | 'contract';
export type CheckSeverity = 'critical' | 'error' | 'warning' | 'info';
export interface VerificationCheck { type: CheckType; name: string; command?: string; timeout?: number; }
export interface CheckOutcome { check: string; type: CheckType; passed: boolean; duration: number; output?: string; error?: string; }
export interface VerificationSuite { name: string; checks: VerificationCheck[]; parallel: boolean; }
export interface SuiteResult { suite: string; total: number; passed: number; failed: number; duration: number; outcomes: CheckOutcome[]; score: number; }
export interface RealEnvironment { name: string; type: 'local'|'ci'|'staging'|'production'; variables: Record<string,string>; checks: string[]; }
