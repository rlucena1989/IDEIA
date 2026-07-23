# Contratos de API — v3 Platform

> Contratos definidos antes da implementação. Versão 0.1 — pré-v3.

---

## 1. Governance API

### `ResolveDocument`

```
Entrada:
  taskType: string        // e.g. "execution", "tests", "coverage"
  context?: {
    projectRoot?: string
    category?: string
  }

Saída:
  document: {
    id: string
    path: string
    title: string
    category: string
    priority: number
  }
  fallbacks: Document[]
  status: 'resolved' | 'ambiguous' | 'blocked'
  blockReason?: string

Persistência: Não (consulta em tempo real)
```

### `AuditConflicts`

```
Entrada:
  scope?: 'all' | 'task-type' | 'document'
  taskType?: string

Saída:
  status: 'clean' | 'warning' | 'blocked'
  conflicts: {
    id: string
    taskType: string
    severity: 'critical' | 'high' | 'medium'
    reason: string
    documents: string[]
    recommendation: string
  }[]

Persistência: Cache de resultados (TTL: 5min)
```

### `ListSources`

```
Entrada:
  category?: string
  tags?: string[]

Saída:
  documents: {
    id: string
    title: string
    path: string
    category: string
    priority: number
    tags: string[]
  }[]

Persistência: Não
```

---

## 2. Planning API

### `CreatePlan`

```
Entrada:
  description: string
  sourceDocument?: string
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  id?: string
  title?: string

Saída:
  spec: TaskSpec
  plan: ExecutionPlan
  commands: string[]
  status: 'ready' | 'blocked'
  blockReason?: string

Persistência: Sim (plano salvo com estado)
```

### `ValidatePlan`

```
Entrada:
  planId: string

Saída:
  valid: boolean
  checks: {
    context: { valid: boolean; reasons: string[] }
    scope: { valid: boolean; reasons: string[] }
    dependencies: { valid: boolean; reasons: string[] }
    executionMode: { valid: boolean; reasons: string[] }
  }

Persistência: Sim (resultado associado ao plano)
```

### `ExecutePlan`

```
Entrada:
  planId: string
  options?: {
    dryRun?: boolean
    maxSteps?: number
  }

Saída:
  executionId: string
  status: 'running' | 'completed' | 'failed' | 'blocked'
  steps: {
    id: string
    status: 'pending' | 'running' | 'passed' | 'failed'
    output?: string
  }[]

Persistência: Sim (log de execução)
```

---

## 3. Autonomy API

### `RunAutonomyCycle`

```
Entrada:
  maxGaps?: number       // default: 3
  severity?: string      // filter severity
  options?: {
    dryRun?: boolean
    autoRepair?: boolean
  }

Saída:
  cycleId: string
  status: AutonomyStatus
  repaired: string[]      // gap IDs repaired
  coverage: number
  remaining: number       // gaps still open

Persistência: Sim (status do ciclo)
```

### `GetAutonomyStatus`

```
Entrada:
  cycleId?: string        // latest if omitted

Saída:
  lastRunAt?: string
  overallCoverage: number
  gapsFound: number
  gapsResolved: number
  currentFocus?: string
  nextAction?: string
  blocked: boolean
  reason?: string

Persistência: Sim
```

### `ListGaps`

```
Entrada:
  severity?: 'critical' | 'important' | 'optional' | 'cosmetic'
  module?: string
  limit?: number

Saída:
  gaps: {
    id: string
    file: string
    module: string
    severity: string
    reason: string
    impact: string
    recommendation: string
  }[]

Persistência: Não (calculado sob demanda)
```

---

## 4. Observability API

### `GetMetrics`

```
Entrada:
  scope: 'project' | 'coverage' | 'governance' | 'autonomy'
  period?: '24h' | '7d' | '30d'

Saída:
  metrics: Record<string, number>
  timestamps?: string[]

Persistência: Sim (série temporal)
```

### `GetAuditLog`

```
Entrada:
  module?: string
  severity?: string
  limit?: number
  offset?: number

Saída:
  entries: {
    id: string
    timestamp: string
    module: string
    action: string
    severity: 'info' | 'warning' | 'error' | 'critical'
    details: Record<string, unknown>
  }[]
  total: number

Persistência: Sim
```

---

## 5. System API

### `GetStatus`

```
Entrada: (vazio — contexto implícito)

Saída:
  version: string
  state: 'idle' | 'running' | 'blocked' | 'warning' | 'ok'
  coverageScore: number
  maturityScore: number
  nextTask?: string
  currentDocument?: string
  lastRunAt?: string
  blockReason?: string

Persistência: Parcial (estado consolidado)
```

### `GetCapabilities`

```
Entrada: (vazio)

Saída:
  capabilities: {
    id: string
    title: string
    description: string
    enabled: boolean
    version: string
  }[]

Persistência: Não
```

---

## Padrões de Resposta

Todas as APIs seguem o envelope:

```typescript
interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    version: string;
    duration: number;
  };
}
```
