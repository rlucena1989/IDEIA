export type ViolationSeverity = 'info'|'warning'|'error'|'critical';
export interface Violation { id: string; timestamp: string; module: string; type: string; severity: ViolationSeverity; message: string; details?: string; stacktrace?: string; operation?: string; }
export interface ViolationStats { total: number; byModule: Record<string,number>; byType: Record<string,number>; bySeverity: Record<string,number>; open: number; resolved: number; }
