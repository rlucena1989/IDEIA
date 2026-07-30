export type ViolationSeverity = 'info'|'warning'|'error'|'critical';
export interface Violation { id: string; timestamp: string; module: string; type: string; severity: ViolationSeverity; message: string; details?: string; stacktrace?: string; operation?: string; scope?: string; }
export interface ViolationStats { total: number; byModule: Record<string,number>; byType: Record<string,number>; bySeverity: Record<string,number>; open: number; resolved: number; }

export interface ScopeViolation {
  id: string;
  timestamp: string;
  fromScope: string;
  toScope: string;
  targetPath: string;
  operation: string;
  severity: ViolationSeverity;
  message: string;
  blocked: boolean;
}

export interface WebhookConfig {
  url: string;
  enabled: boolean;
  secret?: string;
  retryCount?: number;
  timeoutMs?: number;
}

export interface ScopeViolationEntry {
  violationId: string;
  fromScope: string;
  toScope: string;
  targetPath: string;
  operation: string;
  severity: ViolationSeverity;
  message: string;
  timestamp: string;
}
