export type DegradationMode = 'normal'|'degraded'|'limited'|'emergency'|'offline';
export interface ResiliencePolicy { maxRetries: number; baseDelayMs: number; timeoutMs: number; circuitThreshold: number; circuitResetMs: number; bulkheadMaxConcurrent: number; }
export interface BulkheadConfig { name: string; maxConcurrent: number; timeoutMs: number; ttlMs?: number; }
export interface DegradationAction { mode: DegradationMode; disableFeatures: string[]; reduceConcurrency: number; readOnly: boolean; notify: boolean; }
export interface ResilienceReport { module: string; mode: DegradationMode; totalCalls: number; failedCalls: number; circuitState: string; bulkheadUtilization: number; }
