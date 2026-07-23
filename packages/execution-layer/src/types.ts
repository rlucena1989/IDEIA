export type RetryStrategy = 'exponential' | 'linear' | 'fixed';
export type CircuitState = 'closed' | 'open' | 'half_open';
export interface RetryConfig { maxRetries: number; baseDelayMs: number; strategy: RetryStrategy; timeout?: number; }
export interface CircuitBreakerConfig { threshold: number; resetTimeoutMs: number; name: string; }
export interface ExecutionResult<T = unknown> { success: boolean; data?: T; error?: string; attempts: number; durationMs: number; }
