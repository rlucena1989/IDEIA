import { Disposable, Event } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';

export enum CircuitState { CLOSED = 'closed', OPEN = 'open', HALF_OPEN = 'half_open' }

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  halfOpenTimeout: number;
  halfOpenMaxRequests: number;
}

export interface CircuitBreaker {
  readonly name: string;
  readonly state: CircuitState;
  readonly failureCount: number;
  readonly successCount: number;
  call<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T>;
  reset(): void;
  onStateChanged: Event<CircuitState>;
  getMetrics(): CircuitBreakerMetrics;
}

export interface CircuitBreakerMetrics {
  name: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalCalls: number;
  openCount: number;
  lastFailure?: Date;
  lastSuccess?: Date;
}

export interface CircuitBreakerRegistry {
  getOrCreate(config: CircuitBreakerConfig): CircuitBreaker;
  get(name: string): CircuitBreaker | undefined;
  getAll(): CircuitBreaker[];
}

export interface RetryManager {
  execute<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  jitter?: boolean;
  retryableErrors?: Array<new (...args: unknown[]) => Error>;
}

export interface HealthCheck {
  readonly name: string;
  check(): Promise<HealthCheckResult>;
}

export interface HealthCheckResult {
  healthy: boolean;
  name: string;
  latencyMs: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface HealthCheckRegistry {
  register(check: HealthCheck): Disposable;
  runAll(): Promise<HealthCheckResult[]>;
  getStatus(): HealthSummary;
  onStatusChanged: Event<HealthSummary>;
}

export interface HealthSummary {
  overall: 'healthy' | 'degraded' | 'critical';
  checks: HealthCheckResult[];
  lastUpdated: Date;
}

export interface SelfHealingPolicy {
  id: string;
  name: string;
  condition: string;
  actions: HealingAction[];
  cooldown: number;
  maxAttempts: number;
}

export interface HealingAction {
  type: 'restart' | 'reconnect' | 'clear_cache' | 'rollback' | 'scale_up' | 'notify';
  params: Record<string, unknown>;
}

export interface SelfHealingEngine {
  registerPolicy(policy: SelfHealingPolicy): Disposable;
  triggerCheck(): Promise<HealingActionResult[]>;
  getActions(): HealingActionResult[];
}

export interface HealingActionResult {
  policyId: string;
  action: HealingAction;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ErrorBudget {
  service: string;
  totalBudget: number;
  consumed: number;
  remaining: number;
  resetPeriod: string;
  lastReset: Date;
}

export interface ErrorBudgetCalculator {
  getBudget(service: string): ErrorBudget;
  consume(service: string, amount: number): void;
  isExhausted(service: string): boolean;
  resetAll(): void;
}

export interface GracefulShutdown {
  register(service: string, shutdownFn: () => Promise<void>): Disposable;
  shutdownAll(timeout?: number): Promise<void>;
  getStatus(): ShutdownStatus;
}

export interface ShutdownStatus {
  inProgress: boolean;
  completedServices: string[];
  pendingServices: string[];
  failedServices: string[];
}


export interface EscalationPolicy {
  id: string;
  name: string;
  levels: EscalationLevel[];
  cooldown: number;
}

export interface EscalationLevel {
  level: number;
  threshold: number;
  action: string;
  notifyees: string[];
}
