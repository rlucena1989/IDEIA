# ESTUDO-IMP-RESIL — Resiliência em Produção: Chaos + Self-Heal + Engenharia de Caos

> **Data:** 2026-07-25
> **Versão:** 1.0
> **Nível de Profundidade:** 6 (Engenharia)
> **Área:** Resiliência, Infraestrutura
> **Dependências:** S55 (Resilience Self-Healing), S64 (Self-Healing Monitoring)
> **Conexões:** ESTUDO-IMP-QUALIDADE, ESTUDO-IMP-PERF, R8 (Observabilidade Full-stack)
> **Propósito:** Elevar o score de resiliência de 50→80/100 com chaos engineering, self-healing automatizado, bulkhead pattern, circuit breaker maduro e disaster recovery playbook.

---

## 1. FUNDAMENTOS

### 1.1 Problema e Contexto

Resiliência score: **50/100**. O QUALITY-IMPROVEMENT-PLAN.md lista 10 itens de melhoria:

| Item | Status | Impacto |
|------|--------|---------|
| Circuit breaker existe mas sem half-open state test | ⚠️ Parcial | Pode não recuperar após queda |
| Retry existe mas sem jitter | ⚠️ Parcial | Thundering herd problem |
| Health checks não existem | ❌ | Sem readiness/liveness/startup |
| Graceful degradation não documentada | ❌ | Comportamento desconhecido em falha |
| Chaos engineering não implementado | ❌ | Sem testes de resiliência reais |
| Bulkhead pattern ausente | ❌ | Um serviço lento afeta todos |
| Disaster recovery sem playbook | ❌ | Sem plano de recuperação |
| Self-healing básico existente | ⚠️ Parcial | Apenas reinicialização |
| Rate limiting ausente | ❌ | Sem proteção contra abuso |
| Timeout hierarchy não definida | ❌ | Timeout inconsistente entre serviços |

### 1.2 Glossário

| Termo | Definição |
|-------|-----------|
| Circuit Breaker | Padrão que interrompe chamadas a serviço com falha para evitar cascata |
| Half-Open State | Estado do CB que permite requisição de teste para verificar recuperação |
| Bulkhead | Isolamento de recursos (thread pool) por serviço para conter falha |
| Chaos Engineering | Disciplina de testar resiliência injetando falhas controladas |
| Self-Healing | Capacidade do sistema de se recuperar automaticamente de falhas |
| Thundering Herd | Múltiplos clientes tentando reconectar simultaneamente após queda |
| Graceful Degradation | Redução controlada de funcionalidade em vez de falha total |
| SLO | Service Level Objective — meta de disponibilidade/latência |
| Blast Radius | Raio de impacto de uma falha (quanto menor, melhor) |

### 1.3 Arquitetura de Resiliência

```
                      ┌──────────────────────┐
                      │   Health Check Probes │
                      │  (liveness/readiness) │
                      └──────────┬───────────┘
                                 │
      ┌──────────────────────────┼──────────────────────────┐
      │                          │                          │
      ▼                          ▼                          ▼
┌─────────────┐          ┌─────────────┐          ┌─────────────┐
│  Service A  │          │  Service B  │          │  Service C  │
│  (Bulkhead) │          │  (Bulkhead) │          │  (Bulkhead) │
│ CB: 🟢      │          │ CB: 🟡      │          │ CB: 🔴      │
│ Retry: 3x   │          │ Retry: 3x   │          │ Retry: max  │
└──────┬──────┘          └──────┬──────┘          └──────┬──────┘
       │                        │                        │
       └────────────────────────┼────────────────────────┘
                                │
                                ▼
                   ┌──────────────────────┐
                   │  Self-Healing Engine  │
                   │  ┌────────────────┐   │
                   │  │ Detect → Diagnose│   │
                   │  │ → Recover → Verify│   │
                   │  └────────────────┘   │
                   └──────────────────────┘
```

---

## 2. TÉCNICO

### 2.1 Circuit Breaker com Half-Open State

```typescript
// packages/resilience-v2/src/circuit-breaker.ts
type CBState = 'closed' | 'open' | 'half-open';

interface CBConfig {
  failureThreshold: number;   // 5 failures → open
  successThreshold: number;   // 3 successes → close
  halfOpenMaxRequests: number; // 1 request in half-open
  openTimeoutMs: number;       // 30s before half-open
  windowMs: number;            // 60s sliding window
}

class CircuitBreaker {
  private state: CBState = 'closed';
  private failures: number[] = []; // timestamps
  private successes: number = 0;
  private halfOpenRequests: number = 0;
  private lastOpenTime: number = 0;

  constructor(private config: CBConfig, private name: string) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastOpenTime > this.config.openTimeoutMs) {
        this.state = 'half-open';
        this.halfOpenRequests = 0;
      } else {
        throw new CircuitBreakerOpenError(this.name);
      }
    }

    if (this.state === 'half-open' && 
        this.halfOpenRequests >= this.config.halfOpenMaxRequests) {
      throw new CircuitBreakerOpenError(this.name + ' (half-open limit)');
    }

    this.halfOpenRequests++;
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.reset();
      }
    }
  }

  private onFailure(): void {
    const now = Date.now();
    this.failures = this.failures.filter(t => now - t < this.config.windowMs);
    this.failures.push(now);

    if (this.state === 'half-open') {
      this.state = 'open';
      this.lastOpenTime = Date.now();
      this.successes = 0;
      return;
    }

    if (this.failures.length >= this.config.failureThreshold) {
      this.state = 'open';
      this.lastOpenTime = Date.now();
    }
  }

  getState(): CBState { return this.state; }
  
  reset(): void {
    this.state = 'closed';
    this.failures = [];
    this.successes = 0;
    this.halfOpenRequests = 0;
  }
}
```

### 2.2 Self-Healing Engine

```typescript
// packages/resilience-v2/src/self-healing-engine.ts
interface HealthProbe {
  name: string;
  check: () => Promise<HealthStatus>;
  interval: number; // ms
  timeout: number;  // ms
}

interface HealthStatus {
  healthy: boolean;
  latency: number;
  error?: string;
  lastRestart?: number;
}

class SelfHealingEngine {
  private probes: Map<string, HealthProbe> = new Map();
  private healthHistory: Map<string, HealthStatus[]> = new Map();
  private restartCount: Map<string, number> = new Map();

  registerProbe(probe: HealthProbe): void {
    this.probes.set(probe.name, probe);
    this.startProbe(probe);
  }

  private startProbe(probe: HealthProbe): void {
    const checkLoop = async () => {
      while (true) {
        try {
          const status = await Promise.race([
            probe.check(),
            new Promise<HealthStatus>((_, reject) => 
              setTimeout(() => reject(new Error('timeout')), probe.timeout)
            ),
          ]);
          
          this.recordHealth(probe.name, status);
          
          if (!status.healthy) {
            await this.handleUnhealthy(probe);
          }
        } catch (error) {
          this.recordHealth(probe.name, { healthy: false, latency: probe.timeout, error: String(error) });
          await this.handleUnhealthy(probe);
        }
        
        await new Promise(r => setTimeout(r, probe.interval));
      }
    };
    
    checkLoop().catch(err => console.error(`Probe ${probe.name} crashed:`, err));
  }

  private async handleUnhealthy(probe: HealthProbe): Promise<void> {
    const history = this.healthHistory.get(probe.name) || [];
    const recentFailures = history.filter(h => !h.healthy).length;
    const restarts = this.restartCount.get(probe.name) || 0;
    
    if (recentFailures >= 3 && restarts < 3) {
      // Tentar restart
      console.log(`[SelfHeal] Restarting ${probe.name} (attempt ${restarts + 1})`);
      await this.restartService(probe.name);
      this.restartCount.set(probe.name, restarts + 1);
      
      // Aguardar startup
      await new Promise(r => setTimeout(r, 5000));
      
      const check = await probe.check();
      if (check.healthy) {
        console.log(`[SelfHeal] ${probe.name} recovered after restart`);
        this.restartCount.set(probe.name, 0);
      }
    } else if (restarts >= 3) {
      // Escalar para humano
      console.error(`[SelfHeal] ${probe.name} failed after 3 restarts. Escalating.`);
      await this.escalateToHuman(probe.name, history);
    }
    
    // Se falha intermitente, apenas registrar
    if (recentFailures < 3) {
      console.warn(`[SelfHeal] ${probe.name} unhealthy (${recentFailures}/3 failures). Monitoring.`);
    }
  }

  private async restartService(name: string): Promise<void> {
    // Implementação varia por tipo de serviço
    // - NATS: natsConnection.reconnect()
    // - PostgreSQL: pool.end() + new Pool()
    // - LLM Provider: provider.reconnect()
    // - Theia Service: reiniciar backend
  }
}
```

### 2.3 Chaos Experiments

```typescript
// packages/resilience-v2/src/chaos-experiments.ts
interface ChaosExperiment {
  name: string;
  description: string;
  inject: () => Promise<void>;
  validate: () => Promise<boolean>;
  rollback: () => Promise<void>;
  duration: number; // ms
}

const CHAOS_EXPERIMENTS: ChaosExperiment[] = [
  {
    name: 'nats-disconnect',
    description: 'Desconecta NATS por 10s para testar reconexão',
    inject: async () => { await nats.disconnect(); },
    validate: async () => {
      await sleep(5000);
      return nats.isConnected();
    },
    rollback: async () => { await nats.reconnect(); },
    duration: 30000,
  },
  {
    name: 'pg-slow-query',
    description: 'Injeta latência em queries PostgreSQL (500ms)',
    inject: async () => { await pg.exec('SELECT pg_sleep(0.5)'); },
    validate: async () => {
      const start = Date.now();
      await pg.query('SELECT 1');
      return Date.now() - start < 100; // Sem latência residual
    },
    rollback: async () => {},
    duration: 15000,
  },
  {
    name: 'high-cpu',
    description: 'Consome 80% CPU por 30s',
    inject: async () => {
      // Fork child process que consome CPU
    },
    validate: async () => {
      const usage = process.cpuUsage();
      return usage.user < 50000000; // 5s de usuário
    },
    rollback: async () => { /* kill child */ },
    duration: 45000,
  },
  {
    name: 'memory-pressure',
    description: 'Aloca 500MB para testar garbage collection',
    inject: async () => {
      global.gc?.(); // Forçar GC
    },
    validate: async () => {
      const mem = process.memoryUsage();
      return mem.heapUsed < 300 * 1024 * 1024;
    },
    rollback: async () => { global.gc?.(); },
    duration: 20000,
  },
  {
    name: 'llm-provider-failure',
    description: 'Simula falha do provider de LLM (timeout 30s)',
    inject: async () => {
      providerRouter.setMockLatency(30000);
    },
    validate: async () => {
      // Verificar se fallback para outro provider funcionou
      return providerRouter.lastFallbackSuccessful;
    },
    rollback: async () => { providerRouter.clearMocks(); },
    duration: 45000,
  },
];
```

---

## 3. ENGENHARIA

### 3.1 Plano de Ação

**Fase 1 — Fundação (Sprint 1-2, ~40h)**
| Passo | Descrição | Esforço |
|-------|-----------|---------|
| 1.1 | Circuit breaker com half-open state test | 8h |
| 1.2 | Retry com jitter + exponential backoff | 4h |
| 1.3 | Health check probes (liveness/readiness/startup) | 4h |
| 1.4 | Bulkhead pattern (thread pool por serviço) | 8h |
| 1.5 | Timeout hierarchy (global → serviço → operação) | 4h |
| 1.6 | Rate limiting por usuário + tenant | 8h |
| 1.7 | Testes de unidade para cada padrão | 4h |

**Fase 2 — Chaos (Sprint 3-4, ~40h)**
| Passo | Descrição | Esforço |
|-------|-----------|---------|
| 2.1 | Chaos experiment suite (5 experimentos) | 16h |
| 2.2 | Chaos CI pipeline (semanal em staging) | 8h |
| 2.3 | Graceful degradation documentada + testada | 8h |
| 2.4 | Failure injection API (para testes) | 8h |

**Fase 3 — Auto-Healing (Sprint 5-6, ~40h)**
| Passo | Descrição | Esforço |
|-------|-----------|---------|
| 3.1 | Self-healing engine (detect → diagnose → recover → verify) | 16h |
| 3.2 | Integration com health probes | 4h |
| 3.3 | Escalação automática para humano após N falhas | 4h |
| 3.4 | Dashboard de resiliência (uptime, incidentes, MTTR) | 8h |
| 3.5 | Alertas configurados (PagerDuty/OpsGenie) | 4h |
| 3.6 | Chaos experiments no dashboard | 4h |

**Fase 4 — DR (Sprint 7-8, ~40h)**
| Passo | Descrição | Esforço |
|-------|-----------|---------|
| 4.1 | Disaster Recovery playbook | 8h |
| 4.2 | DR test trimestral automatizado | 8h |
| 4.3 | Cross-region failover | 16h |
| 4.4 | RTO/RPO verification | 8h |

### 3.2 Pipeline CI/CD

```yaml
# .github/workflows/resilience.yml
name: Resilience Pipeline
on:
  schedule:
    - cron: '0 8 * * 1' # Segunda 8am
  workflow_dispatch:

jobs:
  chaos-test:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: docker compose -f docker/docker-compose.yml up -d
      
      - name: Run chaos experiments
        run: |
          npx tsx packages/resilience-v2/src/chaos-runner.ts \
            --experiments all \
            --duration 30s \
            --json results/chaos.json
      
      - name: Verify system health
        run: |
          npx tsx packages/resilience-v2/src/health-verify.ts \
            --checks all \
            --min-healthy 80
      
      - name: Publish resilience report
        run: |
          npx tsx packages/resilience-v2/src/report-generator.ts \
            --chaos results/chaos.json \
            --health results/health.json \
            --output results/resilience-report.md
      
      - uses: actions/upload-artifact@v4
        with:
          name: resilience-report
          path: results/

  dr-test:
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'
    steps:
      - name: Execute DR test
        run: |
          npx tsx scripts/dr-test.ts \
            --scenario full-region-failover \
            --rpo-target 3600 \
            --rto-target 14400
```

---

## 4. INOVAÇÃO

### 4.1 Predictive Self-Healing

```typescript
class PredictiveSelfHealer {
  async predictFailure(service: string): Promise<FailurePrediction | null> {
    const metrics = await this.getMetrics(service);
    
    // ML heuristics
    const latencyTrend = this.trend(metrics.latency, 10); // últimas 10 amostras
    const errorRate = metrics.errors / metrics.total;
    const memoryGrowth = metrics.memory.reduce((a, b) => a + b, 0) / metrics.memory.length;
    
    if (latencyTrend > 0.2 && errorRate > 0.05) {
      return {
        probability: 0.7,
        estimatedTimeToFailure: '5min',
        suggestedAction: 'Restart service proactively',
        confidence: latencyTrend * 0.6 + errorRate * 0.4,
      };
    }
    
    if (memoryGrowth > 50) { // MB/sample
      return {
        probability: 0.8,
        estimatedTimeToFailure: '15min',
        suggestedAction: 'Increase memory limit or fix leak',
        confidence: 0.8,
      };
    }
    
    return null;
  }
}
```

### 4.2 Diferenciação Competitiva

| Aspecto | IDEIA (alvo) | Concorrência |
|---------|-------------|--------------|
| Chaos engineering integrado | CI semanal automático | Manual ou ausente |
| Predictive self-healing | ML heuristics + pre-failure action | Apenas reativo |
| Half-open state test | Teste progressivo de recuperação | Simples fail → tentativa |
| Graceful degradation formal | Modos documentados + testados | Não documentado |
| DR playbook automatizado | Teste trimestral com RPO/RTO | Playbook estático |

---

## 5. PESQUISA

### 5.1 Referências

| Fonte | Ano | Contribuição |
|-------|-----|-------------|
| "Chaos Engineering" (Principles of Chaos) | 2017 | Fundamentos de chaos |
| "Building Resilient Systems" (Nygard) | 2018 | Padrões de resiliência |
| "Circuit Breaker Pattern" (Ruby, Microsoft) | 2015 | CB states |
| "Bulkhead Pattern" (Hystrix, Netflix) | 2015 | Isolamento de recursos |
| "Site Reliability Engineering" (Google) | 2016 | SLOs, error budgets |
| LitmusChaos Documentation | 2024 | Chaos engineering platform |

---

## 6. FRONTEIRAS

### 6.1 Problemas em Aberto

| Problema | Impacto | Abordagens Atuais | Gap |
|----------|---------|-------------------|-----|
| Fault injection em sistemas stateful | Alto | Simulação externa | Injeção em runtime real |
| Caos em pipelines de IA | Médio | Não testado | LLM não-determinístico |
| Self-healing com efeitos colaterais | Alto | Restart simples | Pode causar mais dano |
| Predição de falha com ML | Médio | Heurísticas simples | Modelo preditivo real |

---

## 7. ANÁLISE PARA IDEIA

### 7.1 O Que Existe

| Componente | Status |
|------------|--------|
| packages/resilience-v2 | ✅ 18 files, 5 testes |
| packages/resilience-engine | ✅ 8 files |
| packages/health-check | ✅ 3 files (mínimo) |
| packages/safety-circuit | ✅ 20 files, circuit breaker |
| Chaos experiments | ❌ |
| Self-healing engine | ⚠️ Parcial |
| Bulkhead pattern | ❌ |
| DR playbook | ❌ |

### 7.2 Métricas de Sucesso

| Métrica | Atual | Alvo 30d | Alvo 60d | Alvo 90d |
|---------|-------|----------|----------|----------|
| Resilience score | 50/100 | 60/100 | 70/100 | 80/100 |
| Chaos experiments | 0 | 5 | 10 | 15 |
| Chaos pass rate | — | 60% | 80% | 100% |
| MTTR (Mean Time to Recover) | >1h | <30min | <15min | <5min |
| Self-heal rate | 0% | 30% | 60% | 80% |
| Uptime (SLO) | 95% | 99% | 99.5% | 99.9% |
| Health probe coverage | 0% | 50% | 80% | 100% |

### 7.3 Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Chaos testing afeta produção | Média | Crítico | Isolar em staging + dry-run |
| Self-healing causa loop infinito | Baixa | Alto | Max 3 restarts + escalação |
| Circuit breaker falso positivo | Média | Médio | Tuning de threshold gradual |

---

> **Score de Maturidade:** 75/100 ✅
> **Próximo passo:** Implementar circuit breaker com half-open + retry com jitter (12h)
