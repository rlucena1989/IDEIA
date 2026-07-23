# ESTUDO S55 -- Resilience & Self-Healing Architecture

> **Competitive analysis + implementation strategy: taking IDEIA from 50/100 to 80/100 resilience score**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial -- resilience baseline, fault tolerance, circuit breaker, self-healing, chaos engineering, DR, implementation roadmap |

---

## Sumario

1. [Resilience Baseline](#1-resilience-baseline)
2. [Fault Tolerance Architecture](#2-fault-tolerance-architecture)
3. [Circuit Breaker Enhancement](#3-circuit-breaker-enhancement)
4. [Retry & Backoff](#4-retry--backoff)
5. [Health Check System](#5-health-check-system)
6. [Self-Healing](#6-self-healing)
7. [Graceful Degradation](#7-graceful-degradation)
8. [Chaos Engineering](#8-chaos-engineering)
9. [Disaster Recovery](#9-disaster-recovery)
10. [Error Budget](#10-error-budget)
11. [Graceful Shutdown](#11-graceful-shutdown)
12. [Data Resilience](#12-data-resilience)
13. [Resilience Testing](#13-resilience-testing)
14. [Code Examples](#14-code-examples)
15. [Implementation Roadmap](#15-implementation-roadmap)
16. [Conexoes](#16-conexoes)

---

## 1. Resilience Baseline

### 1.1 Current IDEIA State (Score: 50/100)

IDEIA currently implements a basic resilience layer in `packages/cli/src/resilience/` with 8 modules:

| Module | What It Does | Maturity | Gap |
|--------|-------------|----------|-----|
| `circuit-breaker.ts` | Counter-based open/close per named breaker | Basic | No half-open, no metrics, no per-service isolation, no auto-recovery |
| `failure-types.ts` | Typed failure definition with severity, type, source | Adequate | No failure taxonomy hierarchy, no failure causation tracking |
| `failure-detector.ts` | Filters events by severity to produce OperationalFailure | Basic | No heuristic detection, no anomaly integration, no predictive detection |
| `fallback-policy.ts` | Maps failure type to action (retry, skip, degrade, block) | Partial | No configurable policies per service, no cascading fallback chains |
| `recovery-plan.ts` | Builds steps per failure type (checksum, resync, rebuild) | Partial | No cost estimation, no dependency ordering, no parallel step execution |
| `recovery-engine.ts` | Executes plan by filtering required steps | Stub | No actual execution -- just marks steps as applied without running anything |
| `repair-coordinator.ts` | Orchestrates fallback+plan+recovery+breaker update | Functional | No idempotency, no recovery logging, no escalation integration |
| `resilience-report.ts` | Builds aggregated report with status (healthy/degraded/critical) | Adequate | No trend analysis, no SLO tracking, no alert threshold config |

Current gaps preventing higher score:
- No health check system (liveness, readiness, startup per service)
- No self-healing (automatic recovery actions)
- No chaos engineering framework
- No DR strategy (backup, restore, failover)
- No error budget tracking
- No graceful shutdown sequence
- Circuit breaker has no half-open state, no metrics export, no manual override
- Retry logic is embedded in individual modules -- no centralized retry manager
- No bulkhead isolation between services
- No resilience testing pipeline

### 1.2 AWS Well-Architected Framework Gap Analysis

The AWS Well-Architected Framework defines 5 pillars for resilient systems. IDEIA current coverage:

| Pillar | IDEIA Score | Gaps | Priority |
|--------|-------------|------|----------|
| **Reliability** | 45/100 | No DR plan, no automated failover, no backup strategy, no RPO/RTO targets | Critical |
| **Performance Efficiency** | 60/100 | Basic circuit breaker exists, no bulkhead, no load shedding, no adaptive concurrency | High |
| **Security** | 70/100 | Existing policy engine, sandbox, audit trail cover resilience-adjacent concerns | Medium |
| **Cost Optimization** | 30/100 | No retry budget, no degraded mode cost analysis, no failure cost tracking | Low |
| **Operational Excellence** | 40/100 | No runbooks, no health dashboard, no incident management, no post-mortem automation | Critical |

### 1.3 Key Resilience Metrics (Target vs Current)

| Metric | Current | Target (80/100) | Method |
|--------|---------|-----------------|--------|
| Availability | No measurement | 99.9% (8.76h/yr downtime) | Health check aggregator |
| Recovery Time Objective | No measurement | < 5min for auto-heal, < 30min for DR | Self-healing + DR plan |
| Recovery Point Objective | No measurement | < 1min for in-memory, < 15min for persistent | WAL + continuous backup |
| Mean Time To Detect | No measurement | < 30s | Health checks + anomaly detection |
| Mean Time To Recover | No measurement | < 2min (auto), < 15min (manual) | Self-healing engine + runbooks |
| Error Budget Burn Rate | No measurement | < 10%/week | Error budget calculator |
| Circuit Breaker Coverage | 1 breaker (LLM) | 5 breakers (NATS, FS, LLM, Search, Git) | Per-service circuit breakers |
| Resilience Test Coverage | 0% | 80% of failure scenarios | Chaos engineering suite |

---

## 2. Fault Tolerance Architecture

### 2.1 Fault Domains

IDEIA services classified by fault domain, with blast radius and isolation strategy:

| Domain | Services | Fault Mode | Blast Radius | Isolation Strategy |
|--------|----------|------------|--------------|-------------------|
| **Process** | agent-runtime, workflow-engine, CLI | Crash, OOM, deadlock, hang | Single process | Process supervision (PM2/systemd), auto-restart, health check |
| **Machine** | FS, DAP, LSP bridges | Disk full, CPU spike, OOM | Single machine | Resource limits (cgroups), disk quota, CPU/mem monitoring |
| **Network** | NATS, LLM providers, MCP servers | Latency, partition, DNS failure | Service group | Circuit breaker, timeout, retry, fallback |
| **Provider** | Ollama, OpenAI, DeepSeek, Git | Rate limit, outage, degraded | External | Multi-provider fallback, cache, degraded mode |
| **Storage** | SQLite, DuckDB, MinIO, FS | Corruption, full disk, I/O error | Data plane | WAL, integrity checks, backup, replication |

### 2.2 Fault Isolation Patterns

#### Bulkhead Pattern

Each service group gets its own resource pool. Failure in one pool does not cascade:

```typescript
// @theia/resilience/bulkhead.ts (namespace example)
interface BulkheadConfig {
  name: string;
  maxConcurrentCalls: number;
  maxQueueSize: number;
  queueTimeout: number; // ms
}

const BULKHEAD_POOLS: Record<string, BulkheadConfig> = {
  'llm-inference':     { name: 'llm',     maxConcurrentCalls: 4,  maxQueueSize: 20,  queueTimeout: 30_000 },
  'filesystem':        { name: 'fs',      maxConcurrentCalls: 8,  maxQueueSize: 50,  queueTimeout: 10_000 },
  'nats-io':           { name: 'nats',    maxConcurrentCalls: 16, maxQueueSize: 100, queueTimeout: 5_000 },
  'search-index':      { name: 'search',  maxConcurrentCalls: 4,  maxQueueSize: 10,  queueTimeout: 15_000 },
  'git-operations':    { name: 'git',     maxConcurrentCalls: 2,  maxQueueSize: 5,   queueTimeout: 30_000 },
};
```

#### Graceful Degradation

When a service fails, degrade functionality for that domain only:

- LLM provider fails: fallback to cached responses, then degraded mode (no AI suggestions)
- NATS fails: fallback to in-memory event bus (existing), block agent coordination
- FS fails: read-only mode, block file operations, allow editor and search
- Search fails: block semantic search, allow exact-match search
- Git fails: block git operations, allow local work

#### Fail-Fast vs Fail-Safe

| Pattern | Applied To | Rationale |
|---------|------------|-----------|
| Fail-fast | Validation, policy checks, circuit breaker tripped | Prevent wasted work, surface errors immediately |
| Fail-safe | Agent execution, file operations, data writes | Never lose user data, retry on transient errors |
| Fail-idempotent | Event publishing, workflow steps, git operations | Safe to retry without side effects |

### 2.3 Partial Availability Matrix

```typescript
// @ideia/resilience/partial-availability.ts
type ServiceStatus = 'healthy' | 'degraded' | 'unavailable';

interface PartialAvailabilityState {
  llm: ServiceStatus;
  nats: ServiceStatus;
  filesystem: ServiceStatus;
  search: ServiceStatus;
  git: ServiceStatus;
}

const DEGRADED_FEATURE_MAP: Record<string, string[]> = {
  'llm': ['ai.suggestions', 'ai.chat', 'ai.codegen'],
  'nats': ['agent.coordination', 'event.bus', 'workflow.distribution'],
  'filesystem': ['file.read', 'file.write', 'workspace.sync'],
  'search': ['search.semantic', 'search.code'],
  'git': ['git.commit', 'git.push', 'git.branch'],
};
```

When LLM is degraded, AI features are disabled but editor, filesystem, search, and git continue working.

---

## 3. Circuit Breaker Enhancement

### 3.1 Current Implementation

The existing circuit breaker in `packages/cli/src/resilience/circuit-breaker.ts` is a simple counter-based design:

```typescript
interface CircuitBreakerState {
  name: string;
  failureCount: number;
  threshold: number;
  open: boolean;
  lastUpdatedAt: string;
}
```

Limitations:
- Only CLOSED and OPEN states (no HALF_OPEN)
- No configurable per-service thresholds
- No metrics export
- No automatic half-open probe
- No manual override capability
- No time-based recovery (opens forever until manually reset)
- No integration with retry logic or health checks

### 3.2 Target Architecture

```typescript
// @ideia/resilience/circuit-breaker-v2.ts
enum CircuitState {
  CLOSED = 'closed',           // Normal operation
  OPEN = 'open',               // Failing -- reject requests
  HALF_OPEN = 'half_open',     // Testing recovery
  FORCED_CLOSED = 'forced_closed',   // Manual override
  FORCED_OPEN = 'forced_open',       // Manual override
}

interface CircuitBreakerV2Config {
  name: string;
  failureThreshold: number;         // Failures before OPEN
  successThreshold: number;         // Successes before HALF_OPEN -> CLOSED
  halfOpenMaxRequests: number;      // Max probe requests in HALF_OPEN
  timeout: number;                  // ms before CLOSED -> HALF_OPEN transition
  windowSize: number;               // ms sliding window for failure counting
  minimumRequests: number;          // Minimum requests before evaluating
  metricsExporter?: string;         // Metrics destination
  onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;
}

interface CircuitBreakerMetrics {
  name: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalCount: number;
  failureRate: number;             // failures / total (last window)
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  stateChangedAt: string;
  openCount: number;               // Lifetime open transitions
  halfOpenAttempts: number;
}
```

### 3.3 Per-Service Circuit Breaker Configuration

```typescript
// @ideia/resilience/circuit-breaker-registry.ts
import { z } from 'zod';

export const CircuitBreakerServiceSchema = z.object({
  name: z.string(),
  failureThreshold: z.number().min(1).max(100).default(5),
  successThreshold: z.number().min(1).max(100).default(3),
  halfOpenMaxRequests: z.number().min(1).max(20).default(3),
  timeout: z.number().min(100).max(300_000).default(30_000),
  windowSize: z.number().min(1000).max(600_000).default(60_000),
  minimumRequests: z.number().min(1).max(1000).default(10),
});

const DEFAULT_BREAKER_CONFIGS: Record<string, z.infer<typeof CircuitBreakerServiceSchema>> = {
  'llm-provider':    { name: 'llm-provider',    failureThreshold: 3,  timeout: 60_000,  windowSize: 120_000 },
  'nats-jetstream':  { name: 'nats-jetstream',  failureThreshold: 5,  timeout: 15_000,  windowSize: 60_000  },
  'filesystem':      { name: 'filesystem',      failureThreshold: 8,  timeout: 10_000,  windowSize: 30_000  },
  'search-engine':   { name: 'search-engine',   failureThreshold: 5,  timeout: 30_000,  windowSize: 60_000  },
  'git-service':     { name: 'git-service',     failureThreshold: 4,  timeout: 30_000,  windowSize: 60_000  },
};
```

### 3.4 Half-Open Probe Strategy

When a circuit breaker transitions to HALF_OPEN after `timeout` ms:

1. Route limited requests (controlled by `halfOpenMaxRequests`) to the service
2. If `successThreshold` consecutive requests succeed: transition to CLOSED
3. If any request fails: transition back to OPEN, reset timer
4. Expose half-open probe results as metrics

### 3.5 Metrics Export

```typescript
interface CircuitBreakerMetricPoint {
  timestamp: string;
  service: string;
  state: CircuitState;
  failureCount: number;
  requestCount: number;
}

// Exported to:
// - Prometheus: ideia_circuit_breaker_state{service="llm",state="open"} 1
// - OpenTelemetry: circuit.breaker.state, circuit.breaker.failure.count
// - IDEIA dashboard: real-time circuit breaker panel
```

---

## 4. Retry & Backoff

### 4.1 RetryManager Architecture

Centralized retry manager replacing ad-hoc retry logic across modules:

```typescript
// @ideia/resilience/retry-manager.ts
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;             // ms
  maxDelay: number;              // ms
  jitter: 'none' | 'full' | 'equal';  // jitter strategy
  backoffMultiplier: number;     // exponential base (default 2)
  retryableErrors: RegExp[];     // Error patterns that trigger retry
  nonRetryableErrors: RegExp[];  // Error patterns that never retry
  circuitBreaker?: string;       // Linked circuit breaker name
  idempotencyKey?: string;       // Idempotency key for safe retry
  timeout: number;               // Per-attempt timeout
}
```

### 4.2 Retry Decision Matrix

| Error Type | Example | Retryable | Strategy |
|------------|---------|-----------|----------|
| Transient network | ECONNRESET, ETIMEDOUT | Yes | Full jitter, max 3 attempts |
| Rate limited | 429 Too Many Requests | Yes | Base on Retry-After header, max 2 |
| Service unavailable | 503 Service Unavailable | Yes | Exponential backoff, max 5 |
| Auth failure | 401, 403 | No | Fail immediately |
| Validation error | 400 Bad Request | No | Fail immediately |
| Server error | 500 Internal Server Error | Yes | Half jitter, max 3 |
| Circuit open | CircuitBreakerOpenError | No | Fail fast, log for health check |
| Timeout | TimeoutError | Yes | Full jitter, max 2, backoff > timeout |

### 4.3 Exponential Backoff with Jitter

```typescript
function calculateBackoff(attempt: number, config: RetryConfig): number {
  const exponential = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
  const capped = Math.min(exponential, config.maxDelay);

  switch (config.jitter) {
    case 'full':
      // Random between 0 and capped -- prevents thundering herd
      return Math.random() * capped;
    case 'equal':
      // Random between capped/2 and capped
      return capped / 2 + Math.random() * (capped / 2);
    case 'none':
    default:
      return capped;
  }
}
```

### 4.4 Retry Budget

```typescript
// @ideia/resilience/retry-budget.ts
interface RetryBudgetConfig {
  service: string;
  maxRetryRatio: number;        // Max retries / total requests (default 0.2)
  windowSizeMs: number;         // Sliding window (default 60s)
  minRequests: number;          // Minimum requests before enforcing
}

class RetryBudget {
  private requests: number[] = [];    // Timestamps of total requests
  private retries: number[] = [];     // Timestamps of retries
  private config: RetryBudgetConfig;

  canRetry(): boolean {
    this.evictOldEntries();
    if (this.requests.length < this.config.minRequests) return true;

    const retryRatio = this.retries.length / this.requests.length;
    return retryRatio < this.config.maxRetryRatio;
  }
}
```

### 4.5 Idempotency Keys

Every operation that can be retried must carry an idempotency key:

```typescript
interface IdempotentOperation {
  idempotencyKey: string;     // UUID per operation
  operation: string;          // Operation type identifier
  params: Record<string, unknown>;
  result?: unknown;           // Cached result for dedup
  expiresAt?: string;         // TTL for stored results
}
```

---

## 5. Health Check System

### 5.1 Health Check Types

```typescript
// @ideia/resilience/health-check.ts
enum HealthCheckType {
  LIVENESS = 'liveness',       // Is the process alive?
  READINESS = 'readiness',     // Can the service handle requests?
  STARTUP = 'startup',         // Has the service finished initializing?
  DEPENDENCY = 'dependency',   // Are dependent services healthy?
  DEEP = 'deep',               // Full functional check
}

interface HealthCheckResult {
  service: string;
  type: HealthCheckType;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  duration: number;             // ms
  message?: string;
  dependencies?: HealthCheckResult[];
  metrics?: Record<string, number>;
}
```

### 5.2 Per-Service Health Checks

```typescript
const HEALTH_CHECKS: Record<string, HealthCheckConfig> = {
  'nats-jetstream': {
    type: HealthCheckType.LIVENESS,
    endpoint: 'nats:ping',
    interval: 10_000,
    timeout: 5_000,
    dependencies: [],
  },
  'llm-provider': {
    type: HealthCheckType.READINESS,
    endpoint: 'ollama:api/tags',
    interval: 30_000,
    timeout: 10_000,
    dependencies: ['nats-jetstream'],
  },
  'filesystem': {
    type: HealthCheckType.READINESS,
    endpoint: 'fs:stat:/tmp/ideia-health',
    interval: 15_000,
    timeout: 3_000,
    dependencies: [],
  },
  'event-bus': {
    type: HealthCheckType.DEEP,
    endpoint: 'nats:pub-sub-test',
    interval: 30_000,
    timeout: 5_000,
    dependencies: ['nats-jetstream'],
  },
};
```

### 5.3 Health Check Aggregator

```typescript
// @ideia/resilience/health-aggregator.ts
interface HealthAggregatorConfig {
  checks: Record<string, HealthCheckConfig>;
  aggregatorInterval: number;        // Aggregation interval (default 15s)
  cacheTTL: number;                  // Health result cache (default 5s)
  degradationThreshold: number;      // % degraded before overall = degraded
  unhealthyThreshold: number;        // % unhealthy before overall = unhealthy
}

interface AggregateHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, HealthCheckResult>;
  degradedCount: number;
  unhealthyCount: number;
  healthyCount: number;
  lastUpdated: string;
  dependencyGraph: Record<string, string[]>; // service -> depends on
}
```

Dependency-aware health propagation: if NATS is unhealthy, all services depending on NATS are also marked degraded even if their individual check passes.

### 5.4 Health Dashboard

Health check data exported to:
- `/healthz` endpoint (liveness, no auth)
- `/readyz` endpoint (readiness, no auth)
- `/health/aggregate` (full report, auth required)
- Prometheus metrics: `ideia_health_status{service="...",type="..."}` (1/0)
- Theia health widget: real-time service health panel

---

## 6. Self-Healing

### 6.1 SelfHealingEngine

```typescript
// @ideia/resilience/self-healing-engine.ts
enum HealingAction {
  RESTART_SERVICE = 'restart_service',
  CLEAR_CACHE = 'clear_cache',
  RECONNECT_PROVIDER = 'reconnect_provider',
  ROLLBACK_STATE = 'rollback_state',
  SCALE_UP = 'scale_up',
  FAILOVER_REPLICA = 'failover_replica',
  RECYCLE_CONNECTION = 'recycle_connection',
  TRIGGER_GC = 'trigger_gc',
  FLUSH_BUFFERS = 'flush_buffers',
  RELOAD_CONFIG = 'reload_config',
}

interface HealingPolicy {
  service: string;
  failures: string[];               // Failure patterns triggering this policy
  action: HealingAction;
  cooldown: number;                 // ms between automatic triggers
  maxAttempts: number;              // Max auto-heal attempts before escalation
  requiresApproval: boolean;        // Requires human approval?
  onEscalation: 'page' | 'log' | 'ticket' | 'degraded';
}
```

### 6.2 Healing Policies by Service

```typescript
const HEALING_POLICIES: HealingPolicy[] = [
  // LLM Provider
  {
    service: 'llm-provider',
    failures: ['connection_refused', 'timeout', 'rate_limited'],
    action: HealingAction.RECONNECT_PROVIDER,
    cooldown: 60_000,
    maxAttempts: 3,
    requiresApproval: false,
    onEscalation: 'page',
  },
  {
    service: 'llm-provider',
    failures: ['circuit_open', 'provider_unavailable'],
    action: HealingAction.FAILOVER_REPLICA,  // Switch to backup provider
    cooldown: 0,
    maxAttempts: 1,
    requiresApproval: false,
    onEscalation: 'degraded',
  },
  // NATS JetStream
  {
    service: 'nats-jetstream',
    failures: ['connection_lost', 'stream_unavailable'],
    action: HealingAction.RECONNECT_PROVIDER,
    cooldown: 15_000,
    maxAttempts: 5,
    requiresApproval: false,
    onEscalation: 'page',
  },
  {
    service: 'nats-jetstream',
    failures: ['resource_exhausted'],
    action: HealingAction.RECYCLE_CONNECTION,
    cooldown: 30_000,
    maxAttempts: 2,
    requiresApproval: true,
    onEscalation: 'ticket',
  },
  // Filesystem
  {
    service: 'filesystem',
    failures: ['disk_full', 'permission_denied', 'lock_failed'],
    action: HealingAction.FLUSH_BUFFERS,
    cooldown: 5_000,
    maxAttempts: 2,
    requiresApproval: false,
    onEscalation: 'degraded',
  },
  {
    service: 'filesystem',
    failures: ['corruption', 'checksum_mismatch'],
    action: HealingAction.ROLLBACK_STATE,
    cooldown: 0,
    maxAttempts: 1,
    requiresApproval: true,
    onEscalation: 'page',
  },
  // Agent Runtime
  {
    service: 'agent-runtime',
    failures: ['crash', 'memory_leak', 'deadlock'],
    action: HealingAction.RESTART_SERVICE,
    cooldown: 30_000,
    maxAttempts: 3,
    requiresApproval: false,
    onEscalation: 'ticket',
  },
  // Event Bus
  {
    service: 'event-bus',
    failures: ['queue_backlog', 'message_loss'],
    action: HealingAction.CLEAR_CACHE,
    cooldown: 60_000,
    maxAttempts: 2,
    requiresApproval: true,
    onEscalation: 'page',
  },
];
```

### 6.3 Healing Workflow

```
1. Health check or circuit breaker detects failure
2. Failure matched against healing policies by service + error pattern
3. Check cooldown period (don't spam-heal)
4. Execute healing action
5. Verify recovery via health check (up to 3 verification attempts)
6. On success: log, reset circuit breaker, resume normal operation
7. On failure: increment attempt counter, if maxAttempts reached -> escalate
8. Escalation: alert human (PagerDuty/ticket), degrade service, document
```

### 6.4 Healing Audit Trail

Every healing action is recorded in the audit trail:

```typescript
interface HealingAuditEntry {
  timestamp: string;
  service: string;
  failureId: string;
  action: HealingAction;
  result: 'success' | 'failed' | 'escalated';
  attempt: number;
  duration: number;                // ms
  verificationStatus: 'passed' | 'failed';
  escalatedTo?: string;            // Human handle or ticket ID
}
```

---

## 7. Graceful Degradation

### 7.1 Feature-Level Degradation

```typescript
// @ideia/resilience/degradation-manager.ts
enum DegradationLevel {
  NORMAL = 'normal',           // All features available
  DEGRADED = 'degraded',       // Non-critical features disabled
  MINIMAL = 'minimal',         // Only core features
  READ_ONLY = 'read_only',     // No write operations
  OFFLINE = 'offline',         // No network-dependent features
}

interface FeatureToggles {
  'ai.chat': DegradationLevel;
  'ai.suggestions': DegradationLevel;
  'ai.codegen': DegradationLevel;
  'file.read': DegradationLevel;
  'file.write': DegradationLevel;
  'search.semantic': DegradationLevel;
  'search.exact': DegradationLevel;
  'git.commit': DegradationLevel;
  'git.push': DegradationLevel;
  'editor.intelligence': DegradationLevel;
  'agent.execution': DegradationLevel;
  'workspace.sync': DegradationLevel;
}
```

### 7.2 LLM Fallback Chain

```typescript
const LLM_FALLBACK_CHAIN: Array<{
  provider: string;
  condition: 'always' | 'timeout_sensitive' | 'quality_sensitive';
  maxLatency: number;            // ms
}> = [
  { provider: 'ollama',    condition: 'always',            maxLatency: 5_000  },
  { provider: 'openai',    condition: 'timeout_sensitive', maxLatency: 10_000 },
  { provider: 'deepseek',  condition: 'timeout_sensitive', maxLatency: 10_000 },
  { provider: 'cache',     condition: 'always',            maxLatency: 100    },
  { provider: null,        condition: 'always',            maxLatency: 0      }, // Error message
];
```

When primary LLM fails:
1. Try Ollama (local, low latency) -- if timeout > 5s, skip
2. Try OpenAI (cloud, higher quality) -- if timeout > 10s, skip
3. Try DeepSeek (fallback cloud) -- if timeout > 10s, skip
4. Return cached response if available (stale but better than nothing)
5. Return user-facing error with explanation

### 7.3 Read-Only Mode

When write operations fail (filesystem, git, event bus):

```typescript
enum SystemMode {
  FULL = 'full',
  READ_ONLY = 'read_only',
  OFFLINE = 'offline',
}

class SystemModeManager {
  private mode: SystemMode = SystemMode.FULL;

  setMode(mode: SystemMode): void {
    this.mode = mode;
    // Emit event for all services
    this.eventBus.publish('system.mode.changed', { mode });
    // Update health check status
    // Notify UI for mode indicator
    // Block write operations in gate/interceptor
  }

  // Block writes in read-only mode via interceptor
  checkWriteAllowed(operation: string): void {
    if (this.mode === SystemMode.READ_ONLY) {
      throw new ReadOnlyModeError(`Write operation blocked: ${operation}`);
    }
  }
}
```

### 7.4 Offline Mode

When network is unavailable:
- Disable all provider-dependent features (LLM, cloud search, git push, NATS)
- Enable offline alternatives: local FS operations, local search index, cached responses
- Queue outgoing events for replay when online
- UI shows "offline" indicator with pending sync count

---

## 8. Chaos Engineering

### 8.1 ChaosExperimentRunner

```typescript
// @ideia/resilience/chaos-experiment.ts
enum ExperimentType {
  PROCESS_KILL = 'process_kill',
  NETWORK_LATENCY = 'network_latency',
  DISK_FULL = 'disk_full',
  CPU_SPIKE = 'cpu_spike',
  MEMORY_PRESSURE = 'memory_pressure',
  PROVIDER_TIMEOUT = 'provider_timeout',
  PROVIDER_ERROR = 'provider_error',    // Simulate 500s
  DNS_FAILURE = 'dns_failure',
  CLOCK_SKEW = 'clock_skew',
  EVENT_DROP = 'event_drop',            // Drop NATS messages
}

interface ChaosExperiment {
  name: string;
  type: ExperimentType;
  target: string;                     // Service name
  duration: number;                   // ms
  intensity: number;                  // 0.0 - 1.0
  blastRadius: string[];              // Scope of effect
  hypothesis: string;                 // What should happen?
  expectedOutcome: 'resilient' | 'degraded' | 'fail_gracefully';
  abortOnDegradation: boolean;        // Auto-abort if degradation detected
}
```

### 8.2 Experiment Types and Implementation

```typescript
const CHAOS_EXPERIMENTS: ChaosExperiment[] = [
  // Process tests
  {
    name: 'kill-llm-provider',
    type: ExperimentType.PROCESS_KILL,
    target: 'llm-provider',
    duration: 10_000,
    intensity: 1.0,
    blastRadius: ['llm-provider'],
    hypothesis: 'LLM circuit breaker opens within 30s, fallback to cached responses',
    expectedOutcome: 'degraded',
    abortOnDegradation: false,
  },
  // Network tests
  {
    name: 'nats-latency-500ms',
    type: ExperimentType.NETWORK_LATENCY,
    target: 'nats-jetstream',
    duration: 60_000,
    intensity: 0.5,                  // 500ms added latency
    blastRadius: ['event-bus', 'agent-runtime'],
    hypothesis: 'Event bus latency spikes, agents continue with timeout+retry',
    expectedOutcome: 'degraded',
    abortOnDegradation: true,
  },
  {
    name: 'nats-latency-2000ms',
    type: ExperimentType.NETWORK_LATENCY,
    target: 'nats-jetstream',
    duration: 30_000,
    intensity: 0.9,                  // 2000ms added latency
    blastRadius: ['event-bus'],
    hypothesis: 'Event bus circuit breaker opens, agents use in-memory fallback',
    expectedOutcome: 'degraded',
    abortOnDegradation: true,
  },
  // Storage tests
  {
    name: 'disk-full-simulate',
    type: ExperimentType.DISK_FULL,
    target: 'filesystem',
    duration: 15_000,
    intensity: 0.95,
    blastRadius: ['filesystem', 'workspace'],
    hypothesis: 'FS enters read-only mode, workspace operations blocked',
    expectedOutcome: 'fail_gracefully',
    abortOnDegradation: false,
  },
  // Provider tests
  {
    name: 'ollama-timeout',
    type: ExperimentType.PROVIDER_TIMEOUT,
    target: 'llm-provider',
    duration: 45_000,
    intensity: 1.0,                  // All requests timeout
    blastRadius: ['llm-provider'],
    hypothesis: 'Ollama circuit breaker opens, agents fall back to OpenAI/DeepSeek',
    expectedOutcome: 'resilient',
    abortOnDegradation: false,
  },
  {
    name: 'ollama-500-errors',
    type: ExperimentType.PROVIDER_ERROR,
    target: 'llm-provider',
    duration: 30_000,
    intensity: 0.8,
    blastRadius: ['llm-provider'],
    hypothesis: 'Retry with backoff, circuit breaker opens after 3 failures, fallback to next provider',
    expectedOutcome: 'resilient',
    abortOnDegradation: false,
  },
  // Event bus tests
  {
    name: 'nats-message-drop-10pct',
    type: ExperimentType.EVENT_DROP,
    target: 'event-bus',
    duration: 60_000,
    intensity: 0.1,
    blastRadius: ['event-bus'],
    hypothesis: 'Agents retry dropped events, no data loss due to DLQ',
    expectedOutcome: 'resilient',
    abortOnDegradation: false,
  },
  // Resource tests
  {
    name: 'cpu-spike-80pct',
    type: ExperimentType.CPU_SPIKE,
    target: 'agent-runtime',
    duration: 30_000,
    intensity: 0.8,
    blastRadius: ['agent-runtime'],
    hypothesis: 'Agent execution slows but continues, health check CPU flag triggers',
    expectedOutcome: 'degraded',
    abortOnDegradation: true,
  },
  {
    name: 'memory-pressure-90pct',
    type: ExperimentType.MEMORY_PRESSURE,
    target: 'cli',
    duration: 20_000,
    intensity: 0.9,
    blastRadius: ['cli', 'agent-runtime'],
    hypothesis: 'Memory threshold alert, GC triggered, graceful degradation to minimal mode',
    expectedOutcome: 'fail_gracefully',
    abortOnDegradation: true,
  },
];
```

### 8.3 Blast Radius Control

```typescript
interface BlastRadiusConfig {
  enabled: boolean;              // Global kill switch
  maxDuration: number;           // Max experiment duration (ms)
  allowedTargets: string[];      // Whitelist of targetable services
  blockedTargets: string[];      // Never touch these (e.g., production DB)
  maxIntensity: number;          // Max 1.0
  requireApproval: boolean;      // Require human approval before execution
  autoRollback: boolean;         // Auto-rollback on unexpected degradation
}
```

### 8.4 Gameday Schedule

| Frequency | Experiments | Environment |
|-----------|-------------|-------------|
| Daily (automated) | Quick smoke tests: process kill, timeout, event drop (10% intensity) | Staging |
| Weekly | Full suite: latency, disk, CPU, provider error (50% intensity) | Staging |
| Monthly | Production-like: all experiments at 80% intensity, blast radius limited | Staging |
| Quarterly | Gameday: full production blast with on-call rotation participation | Production (scheduled) |

---

## 9. Disaster Recovery

### 9.1 Backup Strategy

```typescript
// @ideia/resilience/backup-strategy.ts
interface BackupConfig {
  type: 'full' | 'incremental' | 'continuous_archive';
  target: 'workspace' | 'config' | 'state' | 'audit' | 'knowledge';
  schedule: string;                 // Cron expression
  retention: number;                // Days
  storage: 'local' | 'cloud' | 'replica';
  encrypt: boolean;
  verifyAfterBackup: boolean;
}

const BACKUP_POLICIES: BackupConfig[] = [
  // User workspace (source code)
  { type: 'incremental',      target: 'workspace', schedule: '0 */6 * * *', retention: 30,  storage: 'cloud',  encrypt: true, verifyAfterBackup: true },
  { type: 'full',             target: 'workspace', schedule: '0 2 * * 0',   retention: 90,  storage: 'cloud',  encrypt: true, verifyAfterBackup: true },
  // Configuration
  { type: 'full',             target: 'config',    schedule: '0 0 * * *',   retention: 30,  storage: 'cloud',  encrypt: true, verifyAfterBackup: true },
  // State (agent state, session data)
  { type: 'continuous_archive', target: 'state',   schedule: '* * * * *',  retention: 7,   storage: 'replica', encrypt: true, verifyAfterBackup: false },
  // Audit trail
  { type: 'full',             target: 'audit',     schedule: '0 0 * * *',   retention: 365, storage: 'cloud',  encrypt: true, verifyAfterBackup: true },
  // Knowledge base
  { type: 'incremental',      target: 'knowledge', schedule: '0 */12 * * *', retention: 30,  storage: 'cloud',  encrypt: true, verifyAfterBackup: true },
];
```

### 9.2 RPO/RTO Targets

| Data Type | RPO Target | RTO Target | Method |
|-----------|------------|------------|--------|
| User workspace | 6 hours | 15 minutes | Incremental backup + cloud sync |
| Configuration | 24 hours | 5 minutes | Config backup + GitOps |
| Agent state | 1 minute | 30 minutes | Continuous archive + WAL |
| Audit trail | 24 hours | 2 hours | Daily full backup |
| Knowledge base | 12 hours | 1 hour | Incremental backup |
| Session data | 5 minutes | 5 minutes | Redis replica + WAL |

### 9.3 DR Site Architecture

```typescript
// @ideia/resilience/dr-config.ts
interface DRConfig {
  mode: 'active-passive' | 'active-active';
  primaryRegion: string;
  secondaryRegion: string;
  failoverTrigger: 'manual' | 'automatic_health_based' | 'automatic_quorum';
  dataReplication: 'sync' | 'async' | 'semi_sync';
  cutoverStrategy: 'cold' | 'warm' | 'hot';
  rpoTarget: number;               // Minutes
  rtoTarget: number;               // Minutes
}
```

| Factor | Active-Passive (MVP) | Active-Active (v2.0) |
|--------|---------------------|---------------------|
| Infrastructure cost | 2x (secondary idle) | 2x (both active) |
| RTO | 15-30 min | < 1 min |
| RPO | 5-15 min | < 1 min |
| Complexity | Medium | High |
| Data consistency | Eventual | Strong (quorum) |

MVP strategy: active-passive with warm standby, async replication, manual failover triggered by health check aggregator.

### 9.4 Restore Testing

```typescript
interface RestoreTestPlan {
  name: string;
  backupType: BackupConfig['type'];
  target: BackupConfig['target'];
  frequency: 'daily' | 'weekly' | 'monthly';
  validationSteps: string[];        // What to check after restore
  expectedDuration: number;         // Max restore time (minutes)
}

const RESTORE_TESTS: RestoreTestPlan[] = [
  { name: 'restore-workspace-from-incremental',   backupType: 'incremental',  target: 'workspace', frequency: 'weekly',  validationSteps: ['file_count', 'checksum', 'git_log'],           expectedDuration: 10 },
  { name: 'restore-config-from-full',              backupType: 'full',         target: 'config',    frequency: 'monthly', validationSteps: ['service_start', 'config_loaded'],              expectedDuration: 5 },
  { name: 'restore-state-from-continuous-archive', backupType: 'continuous_archive', target: 'state', frequency: 'weekly', validationSteps: ['agent_resume', 'session_integrity'],           expectedDuration: 15 },
  { name: 'restore-audit-from-full',               backupType: 'full',         target: 'audit',     frequency: 'monthly', validationSteps: ['chain_verification', 'entry_count'],           expectedDuration: 30 },
  { name: 'full-dr-failover-exercise',             backupType: 'full',         target: 'workspace', frequency: 'quarterly', validationSteps: ['all_services', 'data_integrity', 'performance'], expectedDuration: 60 },
];
```

---

## 10. Error Budget

### 10.1 Error Budget Calculation

```typescript
// @ideia/resilience/error-budget.ts
interface SLO {
  name: string;
  target: number;               // e.g., 99.9 (percent)
  windowMs: number;             // Budget window (default 30 days)
}

interface ErrorBudgetState {
  slo: SLO;
  totalBudget: number;          // ms of allowed downtime
  consumedBudget: number;       // ms of downtime incurred
  remainingBudget: number;      // ms of downtime remaining
  burnRate: number;             // % of budget consumed per day
  status: 'green' | 'yellow' | 'red';
}

const IDEIA_SLOS: SLO[] = [
  { name: 'llm-inference-availability',  target: 99.5,  windowMs: 30 * 24 * 3600 * 1000 },
  { name: 'event-bus-availability',      target: 99.9,  windowMs: 30 * 24 * 3600 * 1000 },
  { name: 'editor-responsiveness',       target: 99.8,  windowMs: 30 * 24 * 3600 * 1000 },
  { name: 'filesystem-operations',       target: 99.9,  windowMs: 30 * 24 * 3600 * 1000 },
  { name: 'agent-execution-success',     target: 99.0,  windowMs: 30 * 24 * 3600 * 1000 },
];
```

Calculation: `totalBudget = windowMs * (1 - slo.target / 100)`

For 99.9% SLO over 30 days: `30 * 24 * 3600 * 1000 * 0.001 = 2,592,000 ms = 43.2 minutes`

### 10.2 Burn Rate Enforcement

```typescript
enum BurnRateAlert {
  GREEN = 'green',       // < 50% of budget consumed
  YELLOW = 'yellow',     // 50-80% consumed
  RED = 'red',           // > 80% consumed -- policy enforcement
}

function evaluateBurnRate(budget: ErrorBudgetState): BurnRateAlert {
  const consumption = budget.consumedBudget / budget.totalBudget;
  if (consumption > 0.8) return BurnRateAlert.RED;
  if (consumption > 0.5) return BurnRateAlert.YELLOW;
  return BurnRateAlert.GREEN;
}
```

### 10.3 Policy Enforcement Actions

| Burn Rate | Action |
|-----------|--------|
| Green | Normal operations, all deployments allowed |
| Yellow | Alert on-call, reduce feature flag changes, require approval for risky deployments |
| Red | Block all deployments, roll back recent changes, reduce feature set, page engineering team, auto-scale defensive resources |

---

## 11. Graceful Shutdown

### 11.1 Shutdown Sequence

```typescript
// @ideia/resilience/graceful-shutdown.ts
interface ShutdownSequence {
  stages: ShutdownStage[];
  totalTimeout: number;            // ms before force kill
  forceKillAfterTimeout: boolean;
  signalHandlers: NodeJS.Signals[];
}

const DEFAULT_SHUTDOWN: ShutdownSequence = {
  totalTimeout: 30_000,            // 30s total
  forceKillAfterTimeout: true,
  signalHandlers: ['SIGTERM', 'SIGINT'],
  stages: [
    { name: 'unregister-health',      action: 'unregister_from_health_check',      timeout: 1_000  },
    { name: 'stop-accepting',         action: 'stop_accepting_new_requests',        timeout: 1_000  },
    { name: 'drain-connections',      action: 'drain_active_connections',           timeout: 5_000  },
    { name: 'complete-inflight',      action: 'complete_in_flight_requests',        timeout: 10_000 },
    { name: 'flush-buffers',          action: 'flush_write_buffers',                timeout: 3_000  },
    { name: 'persist-state',          action: 'persist_in_memory_state',            timeout: 5_000  },
    { name: 'close-resources',        action: 'close_event_bus_connections',        timeout: 3_000  },
    { name: 'close-file-handles',     action: 'close_file_descriptors',             timeout: 2_000  },
    { name: 'finalize',               action: 'emit_shutdown_complete_event',       timeout: 1_000  },
  ],
};
```

### 11.2 Signal Handling

```typescript
function setupGracefulShutdown(services: Shutdownable[]): void {
  const shutdownSequence = DEFAULT_SHUTDOWN;

  for (const signal of shutdownSequence.signalHandlers) {
    process.on(signal, async () => {
      console.log(`Received ${signal}, starting graceful shutdown...`);

      const startTime = Date.now();

      for (const stage of shutdownSequence.stages) {
        const elapsed = Date.now() - startTime;
        if (elapsed > shutdownSequence.totalTimeout) break;

        const stageTimeout = Math.min(stage.timeout, shutdownSequence.totalTimeout - elapsed);
        try {
          await executeStageWithTimeout(stage, services, stageTimeout);
        } catch (err) {
          console.error(`Stage ${stage.name} failed: ${err}`);
        }
      }

      if (shutdownSequence.forceKillAfterTimeout) {
        const elapsed = Date.now() - startTime;
        if (elapsed >= shutdownSequence.totalTimeout) {
          console.error(`Graceful shutdown timeout (${shutdownSequence.totalTimeout}ms), force killing`);
          process.exit(1);
        }
      }

      process.exit(0);
    });
  }
}
```

### 11.3 Service Shutdown Interface

```typescript
interface Shutdownable {
  name: string;
  shutdown(stage: string, timeout: number): Promise<void>;
  isIdle(): boolean;
  inflightCount(): number;
}
```

Each service implements `Shutdownable`:
- NATS client: drain subscriptions, flush pending messages, close connection
- Agent runtime: complete current agent execution, persist state, release resources
- File watcher: flush pending events, close watcher handles
- Event bus: drain queues, persist in-memory events, close connections
- LLM provider: cancel pending requests, close HTTP connections

---

## 12. Data Resilience

### 12.1 Transaction Integrity

```typescript
// @ideia/resilience/data-integrity.ts
interface TransactionLogEntry {
  id: string;
  operation: string;
  state: 'pending' | 'committed' | 'rolled_back';
  data: Record<string, unknown>;
  checksum: string;                // SHA-256 of data
  timestamp: string;
  parentTransaction?: string;      // For nested transactions
}

class WriteAheadLog {
  private entries: TransactionLogEntry[] = [];
  private recoveryPoint: number = 0;

  append(entry: TransactionLogEntry): void {
    this.entries.push(entry);
    this.persistToDisk();
  }

  commit(id: string): void {
    const entry = this.entries.find(e => e.id === id);
    if (entry) {
      entry.state = 'committed';
      this.recoveryPoint = this.entries.indexOf(entry) + 1;
      this.persistToDisk();
    }
  }

  // On startup: replay committed entries from last recovery point
  replayFromRecoveryPoint(): TransactionLogEntry[] {
    return this.entries.slice(this.recoveryPoint).filter(e => e.state === 'committed');
  }
}
```

### 12.2 State Machine Replication

```typescript
// @ideia/resilience/state-replication.ts
interface StateSnapshot {
  version: number;
  state: Record<string, unknown>;
  checksum: string;
  timestamp: string;
}

interface StateChange {
  id: string;
  operation: string;
  params: unknown[];
  timestamp: string;
  source: string;                  // Replica ID
}
```

State replication strategy:
1. All state changes go through the event bus (NATS JetStream)
2. Primary replica applies change, publishes to stream
3. Secondary replicas replay from stream (event sourcing)
4. Periodic snapshots for faster recovery
5. Conflict resolution: CRDT for collaborative data, last-writer-wins for operational data

### 12.3 Conflict Resolution

```typescript
enum ConflictStrategy {
  CRDT = 'crdt',                  // Conflict-free replicated data type
  LAST_WRITER_WINS = 'lww',       // Timestamp-based resolution
  MERGE = 'merge',                // Manual merge
  ERROR = 'error',                // Raise conflict error
}

const CONFLICT_POLICIES: Record<string, ConflictStrategy> = {
  'workspace.files':       ConflictStrategy.CRDT,
  'agent.state':           ConflictStrategy.LAST_WRITER_WINS,
  'settings.preferences':  ConflictStrategy.LAST_WRITER_WINS,
  'audit.entries':         ConflictStrategy.ERROR,  // Append-only, no conflict
  'knowledge.graph':       ConflictStrategy.MERGE,
};
```

### 12.4 Data Validation on Read

Every read operation validates data integrity:

```typescript
function readWithValidation<T>(key: string, validator: (data: T) => boolean): T | null {
  const data = storage.read(key);
  if (!data) return null;

  if (validator(data)) {
    return data;
  }

  // Data corrupted -- log, attempt repair from backup, notify
  logDataCorruption(key, data);
  const repaired = attemptRepair(key);
  if (repaired) {
    storage.write(key, repaired);
    return repaired;
  }
  return null;
}
```

### 12.5 Data Repair Procedures

```typescript
interface DataRepairProcedure {
  dataType: string;
  detection: RegExp[];            // Corruption patterns to detect
  repairAction: 'restore_from_backup' | 'recalculate_checksum' | 'rebuild_index' | 'reset_to_defaults';
  requiresApproval: boolean;
}

const REPAIR_PROCEDURES: DataRepairProcedure[] = [
  { dataType: 'knowledge-graph',  detection: [/integrity.*fail/, /index.*corrupt/],   repairAction: 'rebuild_index',       requiresApproval: true },
  { dataType: 'state-snapshot',   detection: [/checksum.*mismatch/, /version.*gap/],  repairAction: 'restore_from_backup', requiresApproval: true },
  { dataType: 'config-file',      detection: [/parse.*error/, /schema.*invalid/],     repairAction: 'reset_to_defaults',   requiresApproval: true },
  { dataType: 'event-log',        detection: [/sequence.*break/, /missing.*entry/],   repairAction: 'rebuild_index',       requiresApproval: false },
];
```

---

## 13. Resilience Testing

### 13.1 Automated Resilience Test Suite

```typescript
// @ideia/resilience/resilience-test-runner.ts
interface ResilienceTestCase {
  name: string;
  category: 'fault_injection' | 'recovery_verification' | 'state_validation' | 'performance_under_failure';
  experiment?: ChaosExperiment;
  verification: {
    type: 'health_check' | 'functionality' | 'circuit_breaker' | 'data_integrity';
    assert: (result: unknown) => boolean;
  };
  cleanup?: () => Promise<void>;
}
```

### 13.2 Test Scenarios

```typescript
const RESILIENCE_TEST_SUITE: ResilienceTestCase[] = [
  // Fault injection tests
  {
    name: 'llm-provider-process-kill-recovers',
    category: 'fault_injection',
    experiment: CHAOS_EXPERIMENTS.find(e => e.name === 'kill-llm-provider'),
    verification: {
      type: 'circuit_breaker',
      assert: (result: any) => result.circuitOpened && result.fallbackActivated,
    },
  },
  {
    name: 'nats-latency-does-not-crash-agents',
    category: 'fault_injection',
    experiment: CHAOS_EXPERIMENTS.find(e => e.name === 'nats-latency-500ms'),
    verification: {
      type: 'functionality',
      assert: (result: any) => result.agentCompleted && result.delayed,
    },
  },
  {
    name: 'ollama-timeout-triggers-fallback',
    category: 'fault_injection',
    experiment: CHAOS_EXPERIMENTS.find(e => e.name === 'ollama-timeout'),
    verification: {
      type: 'circuit_breaker',
      assert: (result: any) => result.llmFallbackUsed && !result.userFacingError,
    },
  },
  // Recovery verification tests
  {
    name: 'healing-llm-reconnect-restores-service',
    category: 'recovery_verification',
    verification: {
      type: 'health_check',
      assert: (result: any) => result.llmHealth === 'healthy' && result.autoHealed,
    },
  },
  {
    name: 'disk-full-read-only-mode-data-safe',
    category: 'recovery_verification',
    verification: {
      type: 'data_integrity',
      assert: (result: any) => result.dataIntact && result.readOnlyActive,
    },
  },
  // State validation tests
  {
    name: 'crash-recovery-restores-session',
    category: 'state_validation',
    verification: {
      type: 'functionality',
      assert: (result: any) => result.sessionRestored && result.contextComplete,
    },
  },
  // Performance under failure
  {
    name: 'cpu-spike-agent-throughput-degraded-gracefully',
    category: 'performance_under_failure',
    verification: {
      type: 'health_check',
      assert: (result: any) => result.agentThroughput > 0.3,  // At least 30% throughput
    },
  },
];
```

### 13.3 CI Gate

```typescript
interface ResilienceGate {
  requiredPassRate: number;       // % of tests must pass (default 90%)
  requiredCategories: string[];   // All categories must have at least 1 passing test
  maxDuration: number;            // Max suite duration (default 5min for unit, 30min for chaos)
  chaosEnabled: boolean;          // Run chaos experiments in CI? (default false)
}

const CI_RESILIENCE_GATE: ResilienceGate = {
  requiredPassRate: 0.9,
  requiredCategories: ['fault_injection', 'recovery_verification', 'state_validation'],
  maxDuration: 300_000,
  chaosEnabled: false,             // Chaos tests run on staging only
};

const STAGING_RESILIENCE_GATE: ResilienceGate = {
  requiredPassRate: 0.85,
  requiredCategories: ['fault_injection', 'recovery_verification', 'state_validation', 'performance_under_failure'],
  maxDuration: 1_800_000,
  chaosEnabled: true,
};
```

---

## 14. Code Examples

### 14.1 HealthCheckAggregator

```typescript
// @ideia/resilience/health-aggregator.ts
import { z } from 'zod';

const HealthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy']);
const HealthCheckTypeSchema = z.enum(['liveness', 'readiness', 'startup', 'dependency', 'deep']);

type HealthStatus = z.infer<typeof HealthStatusSchema>;
type HealthCheckType = z.infer<typeof HealthCheckTypeSchema>;

interface HealthCheckConfig {
  service: string;
  type: HealthCheckType;
  check: () => Promise<HealthStatus>;
  interval: number;
  timeout: number;
  dependencies: string[];
}

interface HealthCheckEntry {
  service: string;
  type: HealthCheckType;
  status: HealthStatus;
  timestamp: string;
  duration: number;
  message?: string;
}

interface AggregateHealthReport {
  overall: HealthStatus;
  entries: HealthCheckEntry[];
  degradedCount: number;
  unhealthyCount: number;
  healthyCount: number;
  lastUpdated: string;
  dependencyChain: string[][];
}

export class HealthCheckAggregator {
  private configs: Map<string, HealthCheckConfig> = new Map();
  private cache: Map<string, HealthCheckEntry> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private cacheTTL: number;

  constructor(cacheTTL: number = 5000) {
    this.cacheTTL = cacheTTL;
  }

  register(config: HealthCheckConfig): void {
    this.configs.set(config.service, config);
    const interval = setInterval(() => this.runCheck(config.service), config.interval);
    this.intervals.set(config.service, interval);
  }

  private async runCheck(service: string): Promise<void> {
    const config = this.configs.get(service);
    if (!config) return;

    const startTime = Date.now();
    try {
      const status = await Promise.race([
        config.check(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), config.timeout)
        ),
      ]);
      this.cache.set(service, {
        service, type: config.type, status,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      });
    } catch (err) {
      this.cache.set(service, {
        service, type: config.type, status: 'unhealthy',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        message: err instanceof Error ? err.message : 'unknown error',
      });
    }
  }

  getAggregateReport(): AggregateHealthReport {
    const entries = Array.from(this.cache.values());
    const unhealthyCount = entries.filter(e => e.status === 'unhealthy').length;
    const degradedCount = entries.filter(e => e.status === 'degraded').length;
    const healthyCount = entries.filter(e => e.status === 'healthy').length;

    // Dependency chain: for each unhealthy service, show dependency path
    const dependencyChain: string[][] = [];
    for const entry of entries.filter(e => e.status !== 'healthy')) {
      const path = this.buildDependencyPath(entry.service, []);
      if (path.length > 0) dependencyChain.push(path);
    }

    let overall: HealthStatus = 'healthy';
    if (unhealthyCount > 0) overall = 'unhealthy';
    else if (degradedCount > 0) overall = 'degraded';

    return {
      overall, entries, degradedCount, unhealthyCount, healthyCount,
      lastUpdated: new Date().toISOString(),
      dependencyChain,
    };
  }

  private buildDependencyPath(service: string, visited: string[]): string[] {
    const config = this.configs.get(service);
    if (!config || visited.includes(service)) return [service];

    visited.push(service);
    for (const dep of config.dependencies) {
      const depEntry = this.cache.get(dep);
      if (depEntry && depEntry.status !== 'healthy') {
        return [...this.buildDependencyPath(dep, visited), service];
      }
    }
    return [service];
  }

  startAll(): void {
    for (const [service] of this.configs) {
      this.runCheck(service);
    }
  }

  stopAll(): void {
    for (const [service, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }

  async shutdown(): Promise<void> {
    this.stopAll();
    this.cache.clear();
    this.configs.clear();
  }
}
```

### 14.2 SelfHealingEngine with Policies

```typescript
// @ideia/resilience/self-healing-engine.ts
import { HealthCheckAggregator, HealthStatus } from './health-aggregator';
import { CircuitBreakerRegistry } from './circuit-breaker-registry';

type HealingAction =
  | 'restart_service' | 'clear_cache' | 'reconnect_provider'
  | 'rollback_state' | 'scale_up' | 'failover_replica'
  | 'recycle_connection' | 'trigger_gc' | 'flush_buffers' | 'reload_config';

interface HealingPolicy {
  service: string;
  failurePatterns: string[];
  action: HealingAction;
  cooldown: number;
  maxAttempts: number;
  requiresApproval: boolean;
  onEscalation: 'page' | 'log' | 'ticket' | 'degraded';
}

interface HealingAttempt {
  timestamp: string;
  service: string;
  failureId: string;
  action: HealingAction;
  attempt: number;
  result: 'success' | 'failed' | 'escalated';
  duration: number;
  verificationStatus: 'passed' | 'failed';
}

export class SelfHealingEngine {
  private policies: HealingPolicy[] = [];
  private attemptHistory: HealingAttempt[] = [];
  private cooldownMap: Map<string, number> = new Map();
  private attemptCounters: Map<string, number> = new Map();
  private healthAggregator: HealthCheckAggregator;
  private circuitBreakers: CircuitBreakerRegistry;

  constructor(
    healthAggregator: HealthCheckAggregator,
    circuitBreakers: CircuitBreakerRegistry,
  ) {
    this.healthAggregator = healthAggregator;
    this.circuitBreakers = circuitBreakers;
  }

  registerPolicy(policy: HealingPolicy): void {
    this.policies.push(policy);
  }

  async evaluateAndHeal(failureId: string, service: string, error: string): Promise<HealingAttempt> {
    const policy = this.policies.find(
      p => p.service === service && p.failurePatterns.some(fp => error.includes(fp))
    );
    if (!policy) {
      return this.recordAttempt({
        timestamp: new Date().toISOString(), service, failureId,
        action: 'reload_config' as HealingAction, attempt: 0,
        result: 'escalated', duration: 0, verificationStatus: 'failed',
      });
    }

    // Check cooldown
    const lastHeal = this.cooldownMap.get(service) ?? 0;
    if (Date.now() - lastHeal < policy.cooldown) {
      return this.recordAttempt({
        timestamp: new Date().toISOString(), service, failureId,
        action: policy.action, attempt: 0,
        result: 'failed', duration: 0, verificationStatus: 'failed',
      });
    }

    // Check attempt limit
    const attemptKey = `${service}:${failureId}`;
    const attemptCount = this.attemptCounters.get(attemptKey) ?? 0;

    if (attemptCount >= policy.maxAttempts) {
      this.escalate(policy, service, failureId);
      return this.recordAttempt({
        timestamp: new Date().toISOString(), service, failureId,
        action: policy.action, attempt: attemptCount,
        result: 'escalated', duration: 0, verificationStatus: 'failed',
      });
    }

    if (policy.requiresApproval) {
      const approved = await this.requestApproval(policy, service, failureId);
      if (!approved) {
        return this.recordAttempt({
          timestamp: new Date().toISOString(), service, failureId,
          action: policy.action, attempt: attemptCount,
          result: 'escalated', duration: 0, verificationStatus: 'failed',
        });
      }
    }

    // Execute healing action
    const startTime = Date.now();
    const actionResult = await this.executeAction(policy.action, service);
    const duration = Date.now() - startTime;

    // Verify recovery
    await this.delay(2000);
    const healthReport = this.healthAggregator.getAggregateReport();
    const serviceHealth = healthReport.entries.find(e => e.service === service);
    const recovered = serviceHealth?.status === 'healthy';

    if (recovered) {
      this.circuitBreakers.reset(service);
      this.cooldownMap.set(service, Date.now());
    } else {
      this.attemptCounters.set(attemptKey, attemptCount + 1);
      this.cooldownMap.set(service, Date.now());
    }

    return this.recordAttempt({
      timestamp: new Date().toISOString(), service, failureId,
      action: policy.action, attempt: attemptCount + 1,
      result: recovered ? 'success' : 'failed',
      duration, verificationStatus: recovered ? 'passed' : 'failed',
    });
  }

  private async executeAction(action: HealingAction, service: string): Promise<boolean> {
    try {
      switch (action) {
        case 'restart_service':
          // Signal service manager to restart
          return true;
        case 'clear_cache':
          // Clear in-memory and disk caches for service
          return true;
        case 'reconnect_provider':
          // Force reconnection to external provider
          return true;
        case 'failover_replica':
          // Switch to replica (e.g., backup LLM provider)
          return true;
        case 'recycle_connection':
          // Close and reopen connections
          return true;
        case 'trigger_gc':
          global.gc?.();
          return true;
        case 'flush_buffers':
          // Flush write buffers to disk
          return true;
        case 'reload_config':
          // Reload configuration from disk
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  private escalate(policy: HealingPolicy, service: string, failureId: string): void {
    const message = `[HEAL-ESCALATION] Service: ${service}, Failure: ${failureId}, Action exhausted: ${policy.action}`;
    switch (policy.onEscalation) {
      case 'page':
        console.error(`${message} -- PAGING ON-CALL`);
        break;
      case 'ticket':
        console.error(`${message} -- CREATING TICKET`);
        break;
      case 'degraded':
        console.warn(`${message} -- DEGRADING SERVICE`);
        break;
      case 'log':
        console.warn(`${message}`);
        break;
    }
  }

  private async requestApproval(policy: HealingPolicy, service: string, failureId: string): Promise<boolean> {
    console.warn(`[HEAL-APPROVAL] Action ${policy.action} on ${service} requires approval (failure: ${failureId})`);
    // In production, this sends to the approval service
    // For auto-mode, return false (escalate)
    return false;
  }

  private recordAttempt(attempt: HealingAttempt): HealingAttempt {
    this.attemptHistory.push(attempt);
    return attempt;
  }

  getHistory(): HealingAttempt[] {
    return this.attemptHistory;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 14.3 ChaosExperimentRunner

```typescript
// @ideia/resilience/chaos-experiment-runner.ts
import { z } from 'zod';

const ExperimentTypeSchema = z.enum([
  'process_kill', 'network_latency', 'disk_full', 'cpu_spike',
  'memory_pressure', 'provider_timeout', 'provider_error',
  'dns_failure', 'clock_skew', 'event_drop',
]);

const ExperimentStatusSchema = z.enum([
  'pending', 'running', 'completed', 'aborted', 'failed',
]);

type ExperimentType = z.infer<typeof ExperimentTypeSchema>;
type ExperimentStatus = z.infer<typeof ExperimentStatusSchema>;

interface ChaosExperimentConfig {
  name: string;
  type: ExperimentType;
  target: string;
  duration: number;
  intensity: number;
  blastRadius: string[];
  hypothesis: string;
  expectedOutcome: 'resilient' | 'degraded' | 'fail_gracefully';
  abortOnDegradation: boolean;
  verification: () => Promise<{ passed: boolean; details: Record<string, unknown> }>;
}

interface ChaosExperimentResult {
  config: ChaosExperimentConfig;
  status: ExperimentStatus;
  startTime: string;
  endTime?: string;
  verificationResult?: { passed: boolean; details: Record<string, unknown> };
  error?: string;
}

export class ChaosExperimentRunner {
  private activeExperiments: Map<string, AbortController> = new Map();

  async run(config: ChaosExperimentConfig): Promise<ChaosExperimentResult> {
    const result: ChaosExperimentResult = {
      config, status: 'running',
      startTime: new Date().toISOString(),
    };

    const abortController = new AbortController();
    this.activeExperiments.set(config.name, abortController);

    try {
      await this.injectFault(config, abortController.signal);

      // Wait for fault duration
      await this.delay(config.duration, abortController.signal);

      // Verify system behavior
      const verificationResult = await config.verification();

      result.status = 'completed';
      result.endTime = new Date().toISOString();
      result.verificationResult = verificationResult;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        result.status = 'aborted';
      } else {
        result.status = 'failed';
        result.error = (err as Error).message;
      }
      result.endTime = new Date().toISOString();
    } finally {
      await this.removeFault(config);
      this.activeExperiments.delete(config.name);
    }

    return result;
  }

  private async injectFault(config: ChaosExperimentConfig, signal: AbortSignal): Promise<void> {
    switch (config.type) {
      case 'network_latency':
        if (process.platform === 'linux') {
          const latencyMs = Math.round(config.intensity * 2000);
          await this.exec(`tc qdisc add dev eth0 root netem delay ${latencyMs}ms`);
        }
        break;

      case 'process_kill': {
        const processName = config.target.replace(/-/g, '_');
        await this.exec(`pkill -f ${processName} || true`);
        break;
      }

      case 'disk_full': {
        const fillSize = `${Math.round(config.intensity * 90)}%`;
        await this.exec(`dd if=/dev/zero of=/tmp/chaos-fill bs=1M count=1 seek=$((1024 * ${fillSize.replace('%', '')} / 100))`);
        break;
      }

      case 'cpu_spike': {
        const cores = Math.max(1, Math.round(config.intensity * require('os').cpus().length));
        for (let i = 0; i < cores; i++) {
          this.exec(`dd if=/dev/urandom bs=1M | gzip > /dev/null &`);
        }
        break;
      }

      case 'provider_timeout': {
        // Inject proxy that delays responses
        await this.exec(`iptables -A INPUT -p tcp --dport 11434 -m statistic --mode random --probability ${config.intensity} -j DROP`);
        break;
      }

      case 'event_drop': {
        // Drop NATS messages based on intensity
        const dropRate = config.intensity;
        console.warn(`[CHAOS] Event drop rate set to ${dropRate}`);
        break;
      }

      default:
        console.warn(`[CHAOS] Experiment type ${config.type} not yet implemented`);
    }
  }

  private async removeFault(config: ChaosExperimentConfig): Promise<void> {
    switch (config.type) {
      case 'network_latency':
        if (process.platform === 'linux') {
          await this.exec('tc qdisc del dev eth0 root netem || true');
        }
        break;

      case 'disk_full':
        await this.exec('rm -f /tmp/chaos-fill || true');
        break;

      case 'cpu_spike':
        await this.exec('pkill -f "dd if=/dev/urandom" || true');
        break;

      case 'provider_timeout':
        await this.exec('iptables -D INPUT -p tcp --dport 11434 -m statistic --mode random --probability 0.5 -j DROP 2>/dev/null || true');
        break;

      default:
        break;
    }
  }

  abort(experimentName: string): void {
    const controller = this.activeExperiments.get(experimentName);
    if (controller) {
      controller.abort();
    }
  }

  abortAll(): void {
    for (const [name, controller] of this.activeExperiments) {
      controller.abort();
    }
  }

  private async exec(command: string): Promise<void> {
    const { execSync } = await import('child_process');
    try {
      execSync(command, { stdio: 'pipe', timeout: 10_000 });
    } catch {
      // Silently fail -- experiment continues
    }
  }

  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('AbortError'));
        });
      }
    });
  }
}
```

### 14.4 RetryManager with Exponential Backoff

```typescript
// @ideia/resilience/retry-manager.ts
import { v4 as uuid } from 'uuid';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: 'none' | 'full' | 'equal';
  retryableErrors: RegExp[];
  nonRetryableErrors: RegExp[];
  circuitBreaker?: string;
  timeout: number;
}

interface RetryContext {
  attempt: number;
  startTime: number;
  idempotencyKey?: string;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 200,
  maxDelay: 10_000,
  backoffMultiplier: 2,
  jitter: 'full',
  retryableErrors: [/ECONNRESET/, /ETIMEDOUT/, /ECONNREFUSED/, /EAI_AGAIN/, /429/, /503/],
  nonRetryableErrors: [/401/, /403/, /400/, /422/, /EACCES/, /EPERM/],
  timeout: 15_000,
};

export class RetryManager {
  private configs: Map<string, RetryConfig> = new Map();
  private budget: RetryBudget;

  constructor(budget: RetryBudget) {
    this.budget = budget;
  }

  register(name: string, config: Partial<RetryConfig> = {}): void {
    this.configs.set(name, { ...DEFAULT_RETRY_CONFIG, ...config });
  }

  async executeWithRetry<T>(
    service: string,
    operation: () => Promise<T>,
    context?: Partial<RetryContext>,
  ): Promise<T> {
    const config = this.configs.get(service) ?? DEFAULT_RETRY_CONFIG;
    const ctx: RetryContext = {
      attempt: 0,
      startTime: Date.now(),
      idempotencyKey: context?.idempotencyKey ?? uuid(),
      ...context,
    };

    while (ctx.attempt < config.maxAttempts) {
      ctx.attempt++;

      try {
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('TimeoutError')), config.timeout)
          ),
        ]);
        return result;
      } catch (error) {
        const errMsg = (error as Error).message;

        // Check non-retryable errors
        const isNonRetryable = config.nonRetryableErrors.some(pat => pat.test(errMsg));
        if (isNonRetryable) {
          throw error;
        }

        // Check retryable errors
        const isRetryable = config.retryableErrors.some(pat => pat.test(errMsg));
        if (!isRetryable) {
          throw error;
        }

        // Check retry budget
        if (ctx.attempt < config.maxAttempts && !this.budget.canRetry(service)) {
          console.warn(`[RETRY] Budget exhausted for ${service}, failing fast`);
          throw error;
        }

        if (ctx.attempt < config.maxAttempts) {
          const delay = this.calculateDelay(ctx.attempt, config);
          this.budget.recordRetry(service);
          console.warn(`[RETRY] ${service} attempt ${ctx.attempt}/${config.maxAttempts} failed, retrying in ${delay}ms: ${errMsg}`);
          await this.sleep(delay);
        } else {
          console.error(`[RETRY] ${service} exhausted ${config.maxAttempts} attempts: ${errMsg}`);
          throw error;
        }
      }
    }

    throw new Error(`Unreachable: ${service} retry exhausted`);
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponential = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    const capped = Math.min(exponential, config.maxDelay);

    switch (config.jitter) {
      case 'full':
        return Math.random() * capped;
      case 'equal':
        return capped / 2 + Math.random() * (capped / 2);
      case 'none':
      default:
        return capped;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class RetryBudget {
  private requests: Map<string, number[]> = new Map();
  private retries: Map<string, number[]> = new Map();
  private maxRetryRatio = 0.2;
  private windowSizeMs = 60_000;
  private minRequests = 10;

  canRetry(service: string): boolean {
    const now = Date.now();
    const requests = (this.requests.get(service) ?? []).filter(t => now - t < this.windowSizeMs);
    const retries = (this.retries.get(service) ?? []).filter(t => now - t < this.windowSizeMs);

    if (requests.length < this.minRequests) return true;
    return retries.length / requests.length < this.maxRetryRatio;
  }

  recordRequest(service: string): void {
    const now = Date.now();
    const list = this.requests.get(service) ?? [];
    list.push(now);
    this.requests.set(service, list.slice(-1000));
  }

  recordRetry(service: string): void {
    const now = Date.now();
    const list = this.retries.get(service) ?? [];
    list.push(now);
    this.retries.set(service, list.slice(-1000));
  }
}
```

### 14.5 GracefulShutdown Handler

```typescript
// @ideia/resilience/graceful-shutdown.ts
interface ShutdownStage {
  name: string;
  handler: () => Promise<void>;
  timeout: number;
}

interface ShutdownableService {
  name: string;
  inflightCount(): number;
  drain(): Promise<void>;
  close(): Promise<void>;
}

export class GracefulShutdownHandler {
  private services: ShutdownableService[] = [];
  private stages: ShutdownStage[] = [];
  private totalTimeout: number;
  private shuttingDown = false;

  constructor(totalTimeout: number = 30_000) {
    this.totalTimeout = totalTimeout;
    this.setupDefaultStages();
  }

  registerService(service: ShutdownableService): void {
    this.services.push(service);
  }

  private setupDefaultStages(): void {
    this.stages = [
      { name: 'unregister-health', handler: async () => {
        console.log('[SHUTDOWN] Unregistering from health check');
      }, timeout: 1_000 },
      { name: 'stop-accepting', handler: async () => {
        console.log('[SHUTDOWN] Stopping new request acceptance');
        this.shuttingDown = true;
      }, timeout: 1_000 },
      { name: 'drain-connections', handler: async () => {
        console.log('[SHUTDOWN] Draining active connections');
        await Promise.all(this.services.map(s => s.drain()));
      }, timeout: 5_000 },
      { name: 'complete-inflight', handler: async () => {
        const inflight = this.services.reduce((sum, s) => sum + s.inflightCount(), 0);
        console.log(`[SHUTDOWN] Waiting for ${inflight} inflight requests`);
        // Poll until inflight = 0 or timeout
        const start = Date.now();
        while (Date.now() - start < 10_000) {
          const remaining = this.services.reduce((sum, s) => sum + s.inflightCount(), 0);
          if (remaining === 0) break;
          await this.sleep(500);
        }
      }, timeout: 10_000 },
      { name: 'flush-buffers', handler: async () => {
        console.log('[SHUTDOWN] Flushing write buffers');
        // Signal buffers to flush
      }, timeout: 3_000 },
      { name: 'persist-state', handler: async () => {
        console.log('[SHUTDOWN] Persisting in-memory state');
        // Persist agent state, session data, pending events
      }, timeout: 5_000 },
      { name: 'close-services', handler: async () => {
        console.log('[SHUTDOWN] Closing service connections');
        await Promise.all(this.services.map(s => s.close()));
      }, timeout: 3_000 },
      { name: 'finalize', handler: async () => {
        console.log('[SHUTDOWN] Shutdown complete');
      }, timeout: 1_000 },
    ];
  }

  setup(signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT']): void {
    for (const signal of signals) {
      process.on(signal, async () => {
        if (this.shuttingDown) {
          console.warn(`[SHUTDOWN] Force kill on second ${signal}`);
          process.exit(1);
        }
        await this.shutdown(signal);
      });
    }
  }

  async shutdown(signal: string): Promise<void> {
    console.log(`[SHUTDOWN] Received ${signal}, starting graceful shutdown`);

    const startTime = Date.now();

    for (const stage of this.stages) {
      const elapsed = Date.now() - startTime;

      if (elapsed >= this.totalTimeout) {
        console.error(`[SHUTDOWN] Total timeout (${this.totalTimeout}ms) exceeded, force killing`);
        process.exit(1);
      }

      const stageTimeout = Math.min(stage.timeout, this.totalTimeout - elapsed);

      try {
        await Promise.race([
          stage.handler(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Stage ${stage.name} timed out after ${stageTimeout}ms`)), stageTimeout)
          ),
        ]);
        console.log(`[SHUTDOWN] Stage '${stage.name}' completed`);
      } catch (err) {
        console.error(`[SHUTDOWN] Stage '${stage.name}' failed: ${err}`);
      }
    }

    console.log('[SHUTDOWN] Graceful shutdown complete');
    process.exit(0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 14.6 ErrorBudget Calculator

```typescript
// @ideia/resilience/error-budget.ts
interface SLOConfig {
  name: string;
  targetPercent: number;       // e.g., 99.9
  windowMs: number;            // Default: 30 days
}

interface ErrorBudgetState {
  slo: SLOConfig;
  totalBudgetMs: number;
  consumedMs: number;
  remainingMs: number;
  consumptionPercent: number;
  burnRatePerDay: number;       // % burn per day
  status: 'green' | 'yellow' | 'red';
}

export class ErrorBudgetCalculator {
  private slos: Map<string, SLOConfig> = new Map();
  private failureLog: Map<string, Array<{ timestamp: number; durationMs: number }>> = new Map();

  registerSLO(config: SLOConfig): void {
    this.slos.set(config.name, config);
    this.failureLog.set(config.name, []);
  }

  recordFailure(sloName: string, durationMs: number): void {
    const log = this.failureLog.get(sloName);
    if (!log) return;

    log.push({ timestamp: Date.now(), durationMs });
    const slo = this.slos.get(sloName)!;

    // Prune entries outside the window
    const cutoff = Date.now() - slo.windowMs;
    this.failureLog.set(sloName, log.filter(e => e.timestamp >= cutoff));
  }

  getBudgetState(sloName: string): ErrorBudgetState | null {
    const slo = this.slos.get(sloName);
    if (!slo) return null;

    const failures = this.failureLog.get(sloName) ?? [];
    const totalBudgetMs = slo.windowMs * (1 - slo.targetPercent / 100);
    const consumedMs = failures.reduce((sum, f) => sum + f.durationMs, 0);
    const remainingMs = Math.max(0, totalBudgetMs - consumedMs);
    const consumptionPercent = totalBudgetMs > 0 ? (consumedMs / totalBudgetMs) * 100 : 0;

    // Burn rate: % of budget consumed per day
    const windowDays = slo.windowMs / (24 * 3600 * 1000);
    const burnRatePerDay = windowDays > 0 ? consumptionPercent / windowDays : 0;

    let status: 'green' | 'yellow' | 'red' = 'green';
    if (consumptionPercent > 80) status = 'red';
    else if (consumptionPercent > 50) status = 'yellow';

    return {
      slo,
      totalBudgetMs: Math.round(totalBudgetMs),
      consumedMs,
      remainingMs,
      consumptionPercent: Math.round(consumptionPercent * 100) / 100,
      burnRatePerDay: Math.round(burnRatePerDay * 100) / 100,
      status,
    };
  }

  getAllBudgetStates(): ErrorBudgetState[] {
    return Array.from(this.slos.keys()).map(name => this.getBudgetState(name)!).filter(Boolean);
  }

  evaluatePolicy(): { allowed: boolean; reason?: string } {
    const redCount = this.getAllBudgetStates().filter(s => s.status === 'red').length;
    if (redCount > 0) {
      return { allowed: false, reason: `Error budget depleted for ${redCount} SLOs` };
    }
    return { allowed: true };
  }
}
```

---

## 15. Implementation Roadmap

### 15.1 Phase 1: Foundation (4 weeks, 196h)

Target: Establish core resilience infrastructure, health checks, enhanced circuit breaker, retry manager.

| Task | Description | Effort | Dependencies |
|------|-------------|--------|-------------|
| S55-T1 | Circuit breaker v2: HALF_OPEN, metrics, configurable thresholds | 16h | None |
| S55-T2 | Per-service circuit breakers (NATS, FS, LLM, Search, Git) | 8h | S55-T1 |
| S55-T3 | RetryManager with exponential backoff, jitter, error classification | 20h | None |
| S55-T4 | RetryBudget with sliding window | 6h | S55-T3 |
| S55-T5 | Idempotency key infrastructure | 8h | S55-T3 |
| S55-T6 | Health check service (liveness, readiness, startup) | 16h | None |
| S55-T7 | HealthCheckAggregator with dependency awareness | 12h | S55-T6 |
| S55-T8 | Health dashboard endpoint + Prometheus metrics | 8h | S55-T7 |
| S55-T9 | GracefulShutdown with stage sequence | 12h | None |
| S55-T10 | Shutdownable interface + service implementations | 12h | S55-T9 |
| S55-T11 | ErrorBudgetCalculator with SLO tracking | 12h | S55-T6 |
| S55-T12 | Error budget alerting (green/yellow/red) | 6h | S55-T11 |
| S55-T13 | Bulkhead pattern per service group | 12h | None |
| S55-T14 | Graceful degradation manager (read-only, offline modes) | 16h | None |
| S55-T15 | LLM fallback chain (Ollama -> OpenAI -> DeepSeek -> cache) | 12h | S55-T14 |
| S55-T16 | Unit and integration tests for Phase 1 | 20h | All P1 tasks |

**Phase 1 success criteria:**
- Circuit breaker per service with HALF_OPEN operating correctly
- Health check aggregator reporting within 5s of service failure
- Retry with backoff + jitter handling 90% of transient errors
- Graceful shutdown completing within 30s, no data loss
- Error budget calculator tracking all 5 SLOs

### 15.2 Phase 2: Self-Healing (3 weeks, 148h)

Target: Automatic recovery actions, healing policies, feature-level degradation, audit trail.

| Task | Description | Effort | Dependencies |
|------|-------------|--------|-------------|
| S55-T17 | SelfHealingEngine with policy evaluation | 20h | Phase 1 |
| S55-T18 | Healing actions implementation (restart, reconnect, clear cache, rollback) | 24h | S55-T17 |
| S55-T19 | Healing policies per service (LLM, NATS, FS, Agent, EventBus) | 12h | S55-T18 |
| S55-T20 | Cooldown and attempt counter management | 6h | S55-T17 |
| S55-T21 | Escalation integration (log, page, ticket, degrade) | 8h | S55-T20 |
| S55-T22 | Healing audit trail with SHA-256 chain | 8h | S55-T17 |
| S55-T23 | Approval integration for high-risk healing actions | 8h | S55-T21 |
| S55-T24 | Verification after healing (health check re-evaluation) | 6h | S55-T22 |
| S55-T25 | Feature-level degradation: toggle system per service | 12h | Phase 1 |
| S55-T26 | SystemModeManager (full, read_only, offline) | 10h | S55-T25 |
| S55-T27 | Read-only mode gate for write operations | 6h | S55-T26 |
| S55-T28 | Offline mode with event queuing and sync | 12h | S55-T27 |
| S55-T29 | Self-healing dashboard widget (Theia) | 12h | S55-T24 |
| S55-T30 | Integration tests for healing scenarios | 16h | All P2 tasks |

**Phase 2 success criteria:**
- Self-healing resolves 80% of detected failures without human intervention
- Healing actions verified within 10s of execution
- Feature degradation working correctly across all 5 domains
- Read-only mode blocks writes, offline mode queues events
- Healing audit trail verifiable via SHA-256 chain

### 15.3 Phase 3: Chaos Engineering (3 weeks, 140h)

Target: Chaos experiment framework, automated experiments, CI resilience gate.

| Task | Description | Effort | Dependencies |
|------|-------------|--------|-------------|
| S55-T31 | ChaosExperimentRunner with abort control | 16h | Phase 1 |
| S55-T32 | Fault injection implementations (process_kill, network_latency, disk_full) | 20h | S55-T31 |
| S55-T33 | Fault injection implementations (cpu_spike, memory_pressure, provider_timeout) | 12h | S55-T32 |
| S55-T34 | Fault injection implementations (provider_error, event_drop, dns_failure) | 12h | S55-T33 |
| S55-T35 | Blast radius control with whitelist/blacklist | 8h | S55-T31 |
| S55-T36 | Automated chaos experiments in staging | 12h | S55-T34 |
| S55-T37 | Hypothesis-driven verification after experiments | 10h | S55-T36 |
| S55-T38 | Resilience test suite: 15+ scenarios | 16h | S55-T36 |
| S55-T39 | CI resilience gate (fault injection + recovery verification) | 8h | S55-T38 |
| S55-T40 | Gameday scheduling and automation | 8h | S55-T39 |
| S55-T41 | Production chaos guard (max duration, approval, auto-rollback) | 6h | S55-T35 |
| S55-T42 | Resilience score calculation from test results | 6h | S55-T38 |
| S55-T43 | Documentation: runbooks, experiment catalog, gameday procedures | 12h | All P3 tasks |
| S55-T44 | Tests for chaos engineering framework | 16h | All P3 tasks |

**Phase 3 success criteria:**
- 15+ automated chaos experiments running in staging
- Process kill scenarios: circuit breaker opens, fallback activates within 30s
- Network latency scenarios: timeout + retry handling, no agent crash
- Provider timeout scenarios: fallback chain activates correctly
- CI resilience gate blocks PR if < 90% pass rate
- Blast radius containment verified (no cross-service contamination)

### 15.4 Phase 4: Production Hardening (3 weeks, 156h)

Target: DR, backup/restore, data resilience, production readiness.

| Task | Description | Effort | Dependencies |
|------|-------------|--------|-------------|
| S55-T45 | Backup strategy implementation (full, incremental, continuous) | 20h | Phase 1 |
| S55-T46 | Backup encryption and storage (local, cloud, replica) | 12h | S55-T45 |
| S55-T47 | Restore procedures and testing automation | 16h | S55-T46 |
| S55-T48 | DR configuration (active-passive, warm standby) | 16h | S55-T47 |
| S55-T49 | Data replication (async, WAL shipping) | 12h | S55-T48 |
| S55-T50 | Write-ahead log for transaction integrity | 12h | None |
| S55-T51 | State machine replication and snapshot management | 12h | S55-T50 |
| S55-T52 | Conflict resolution (CRDT for workspace, LWW for state) | 10h | S55-T51 |
| S55-T53 | Data validation on read with auto-repair | 10h | S55-T52 |
| S55-T54 | DR failover exercise automation (quarterly) | 8h | S55-T49 |
| S55-T55 | Error budget enforcement in CI/CD (block deploys on red) | 6h | Phase 1 |
| S55-T56 | Performance benchmark under failure (k6 + chaos) | 12h | Phase 3 |
| S55-T57 | Production runbooks for all failure scenarios | 12h | All P4 tasks |
| S55-T58 | Security audit of resilience infrastructure | 8h | All P4 tasks |
| S55-T59 | End-to-end resilience tests | 16h | All P4 tasks |
| S55-T60 | Documentation: DR plan, backup strategy, runbooks | 12h | All P4 tasks |

**Phase 4 success criteria:**
- RPO < 1min for state, < 6h for workspace
- RTO < 5min for auto-heal, < 30min for DR
- DR failover exercise passes quarterly
- Data validation catches 100% of corruption cases
- Error budget enforcement blocks deployments on red
- 100% of failure scenarios have runbooks

### 15.5 Total Effort

| Phase | Hours | Weeks | Tasks | Resilience Score |
|-------|-------|-------|-------|-----------------|
| P1: Foundation | 196h | 4 | 16 | 50 -> 65/100 |
| P2: Self-Healing | 148h | 3 | 14 | 65 -> 73/100 |
| P3: Chaos Engineering | 140h | 3 | 14 | 73 -> 78/100 |
| P4: Production Hardening | 156h | 3 | 16 | 78 -> 82/100 |
| **Total** | **640h** | **13** | **60** | **50 -> 82/100** |

### 15.6 Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| Self-healing actions cause more harm than the original failure | Critical | Medium | Cooldown periods, manual approval for destructive actions, verification after every action, rollback capability |
| Chaos experiments in staging affect production traffic | Critical | Low | Strict network isolation between staging and production, blast radius whitelist |
| Circuit breaker opens for a service but never recovers | High | Medium | Half-open probing with automatic recovery, timeout-based reset, health check monitoring |
| Retry storm amplifies load on already-failing service | High | Medium | Retry budget (max 20% retries), jitter, circuit breaker integration, bulkhead isolation |
| DR failover causes data loss due to async replication | High | Low | Semi-sync replication for critical data, WAL for point-in-time recovery, regular restore testing |
| Graceful shutdown timeout kills service with dirty state | High | Low | Forced shutdown only after totalTimeout, state persistence in shutdown sequence |
| Error budget enforcement blocks legitimate emergency fixes | Medium | Medium | Manual override with approval, emergency deployment bypass process |

### 15.7 Success Metrics (80/100 Score Target)

| Dimension | Current | Target (P1) | Target (P2) | Target (P3) | Target (P4) |
|-----------|---------|-------------|-------------|-------------|-------------|
| Circuit breaker maturity | Basic | Advanced with half-open | Full with metrics | Full with chaos validation | Production-hardened |
| Health check coverage | None | All 5 services | All + dependency aware | All + chaos-aware | Full DR-aware |
| Self-healing coverage | None | Basic per type | Full with policies | Auto-verified | Production-proven |
| Chaos test coverage | None | None | Basic fault injection | 15+ scenarios | 30+ scenarios |
| DR readiness | None | None | Backup strategy | Restore testing | Full DR plan |
| Error budget tracking | None | Basic | Active monitoring | CI enforcement | Production policy |
| Availability SLA | None | None | 99.5% | 99.8% | 99.9% |
| Recovery automation | 0% | 20% | 50% | 70% | 90% |
| Resilience tests in CI | None | Basic health | Health + recovery | Full suite | Production chaos |

---

## 16. Conexoes

| Estudo | Conexao com S55 |
|--------|-----------------|
| **S1** (Event Bus/NATS) | NATS JetStream is the backbone for event-driven resilience. Circuit breaker for NATS prevents cascading failures. DLQ provides retry mechanism for failed events. Event sourcing enables state reconstruction after failure. Stream replication enables DR. |
| **S4** (Seguranca/Governanca) | Self-healing actions require security approval for destructive operations. Healing audit trail uses SHA-256 chain from security module. Chaos experiments must respect security sandbox. Policy engine gates high-risk healing actions. |
| **S13** (Performance/Escalabilidade) | Bulkhead isolation shares thread pools with performance. Circuit breaker timeout values are informed by latency benchmarks. Degradation decisions use performance metrics. Chaos CPU/memory experiments validate performance under stress. |
| **S17** (Observabilidade) | Health check aggregator feeds observability dashboards. Circuit breaker metrics (state, failure count) exported via OpenTelemetry. Healing actions emit trace spans. Chaos experiments are tracked as observability events. Error budget consumption visible in Grafana. |
| **S31** (LLM Integration) | LLM fallback chain is implemented as part of graceful degradation. LLM circuit breaker protects against provider outages. Retry with backoff handles transient LLM failures. Health checks validate LLM provider availability. |
| **S15** (Cloud/Infraestrutura) | DR architecture depends on cloud infrastructure (regions, replication). Backup storage uses cloud object storage. Active-passive failover requires cloud load balancers. Resource limits (cgroups) enforce bulkhead isolation. |
| **S3** (Intent-to-Plan) | Agent execution plans must be resilient: plans are persisted before execution, execution state is checkpointed, failed plans are retried or rolled back. Resilience context enriches agent planning. |
| **S6** (Pipeline/Qualidade) | Resilience tests are a mandatory CI gate. Error budget enforcement blocks pipeline on red status. Chaos experiments validate pipeline resilience. Quality gates include resilience score threshold. |
| **S16** (Deploy/CD) | Canary deploy requires health check pass at each stage. Rollback uses WAL and state snapshots. Error budget depletion blocks production deployments. DR failover tested in CD pipeline. |
| **S51** (Parallel Agents) | Agent runtime implements Shutdownable with inflight tracking. Parallel agent execution uses bulkhead isolation. Agent state persistence enables crash recovery. Circuit breaker prevents agent explosion on LLM failures. |
| **S29** (Memory/Context) | Memory corruption detected via data validation on read. WAL protects memory state integrity. CRDT for collaborative memory enables conflict-free recovery. Memory snapshots enable fast recovery. |
| **S52** (PR Automation) | Resilience test results posted to PR as status check. Healing audit trail linked to incident tickets. Chaos experiment reports auto-generated for PR review. Error budget reports shared in weekly PR summaries. |
| **S42** (Theia DI/Contributions) | Health widget and healing dashboard registered via Inversify DI. Circuit breaker commands contributed via CommandContribution. Resilience services follow DI lifecycle with proper shutdown. |
| **S53** (MCP Ecosystem) | MCP tool execution uses retry with backoff and circuit breaker. MCP server health checks use the same aggregator. MCP marketplace tools follow same resilience policies. |
| **S45** (Workspace Resources) | File system operations use read-only mode when FS is degraded. Workspace backups follow backup strategy. File watcher recovery uses self-healing policies. |

---

> **Fim do Estudo S55 -- Resilience & Self-Healing Architecture**

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability | 99.9% | Health check aggregator + Prometheus |
| Auto-heal coverage | 90% of failures | Healing attempt success rate |
| Circuit breaker coverage | 5 services | Registered per-service breakers |
| Chaos test scenarios | 15+ | Automated experiment count |
| DR RTO | < 30min | DR failover exercise timing |
| DR RPO | < 1min (state), < 6h (workspace) | Backup interval + WAL |
| Error budget enforcement | 100% of SLOs | Budget calculator + CI gate |
| Graceful shutdown | < 30s, 0 data loss | Shutdown sequence timing |
| Resilience test pass rate | > 90% | CI resilience gate |
| Recovery without human | > 80% | Auto-heal vs escalation ratio |
