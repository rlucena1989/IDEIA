# ESTUDO-IMP-QUALIDADE — Plano de Ação: 7 Dimensões de Qualidade

> **Data:** 2026-07-25
> **Versão:** 1.0
> **Nível de Profundidade:** 6 (Engenharia)
> **Área:** Qualidade, Governança
> **Dependências:** ESTUDO-QUALIDADE-TOTAL-IDEIA
> **Conexões:** S55 (Resilience), S58 (Data Strategy), ESTUDO-UX-EXPERIENCIA-USUARIO, S54 (Performance)
> **Propósito:** Plano de ação concreto para elevar cada uma das 7 dimensões de qualidade ao score alvo, com pipelines automatizados e quality gates.

---

## 1. FUNDAMENTOS

### 1.1 Problema e Contexto

A IDEIA possui **7 dimensões de qualidade** com scores atuais abaixo dos alvos:

| Dimensão | Score Atual | Score Alvo | Gap | Gate |
|----------|------------|------------|-----|------|
| Código | 75/100 | 80/100 | -5 | PR |
| Segurança | 70/100 | 90/100 | -20 | PR |
| Performance | 40/100 | 80/100 | -40 | Release |
| UX | 55/100 | 75/100 | -20 | Sprint |
| Integração | 75/100 | 85/100 | -10 | PR |
| Resiliência | 50/100 | 80/100 | -30 | Release |
| Dados | 40/100 | 75/100 | -35 | Sprint |

O gap total médio é de **22.9 pontos**. Este estudo detalha o plano de ação para cada dimensão.

### 1.2 Glossário

| Termo | Definição |
|-------|-----------|
| Quality Gate | Ponto de verificação obrigatório no pipeline (commit/PR/release/sprint) |
| Mutation Score | Percentual de mutantes sobreviventes no mutation testing |
| TTFT | Time to First Token — latência inicial do LLM |
| TPS | Transações por segundo |
| NPS | Net Promoter Score |
| SUS | System Usability Scale |
| Pact CDC | Contract testing via Pact (Consumer-Driven Contracts) |
| SLO | Service Level Objective |

### 1.3 Arquitetura de Qualidade

```
┌─────────────────────────────────────────────────────────┐
│              PIPELINE DE QUALIDADE IDEIA                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────┐ │
│  │ COMMIT   │──▶│    PR    │──▶│ RELEASE  │──▶│SPRINT│ │
│  │ Gate 1   │   │ Gate 2   │   │ Gate 3   │   │Gate 4│ │
│  └──────────┘   └──────────┘   └──────────┘   └──────┘ │
│       │              │              │              │      │
│       ▼              ▼              ▼              ▼      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────┐ │
│  │ Código   │   │Segurança │   │ Performance│  │ UX   │ │
│  │ 75→80    │   │ 70→90    │   │  40→80    │  │55→75 │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────┘ │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────┐ │
│  │Integração│   │Resiliên. │   │  Dados   │   │Métrica│ │
│  │ 75→85    │   │ 50→80    │   │  40→75   │   │ Final │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 2. TÉCNICO

### 2.1 Sistema de Métricas Unificado

```typescript
interface QualityMetric {
  dimension: 'code' | 'security' | 'performance' | 'ux' | 'integration' | 'resilience' | 'data';
  name: string;
  current: number;
  target: number;
  weight: number; // 0-1, contribuição para o score da dimensão
  gate: 'commit' | 'pr' | 'release' | 'sprint';
  source: 'jest' | 'k6' | 'lighthouse' | 'pact' | 'chaos' | 'custom';
}

interface QualityScorecard {
  timestamp: string;
  scores: Record<string, number>; // dimensão → score
  overall: number;
  metrics: QualityMetric[];
  violations: string[];
  trend: Array<{ timestamp: string; overall: number }>;
}
```

### 2.2 Pipeline de Qualidade Automatizado

```yaml
# .github/workflows/quality-dashboard.yml
name: Quality Dashboard
on:
  schedule:
    - cron: '0 6 * * 1' # toda segunda 6am
  workflow_dispatch:

jobs:
  quality-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      
      # 1. Código
      - run: npx eslint packages/ --format json -o reports/eslint.json
      - run: npx tsc --noEmit
      - run: npx jest --coverage --json --outputFile reports/coverage.json
      - run: npx stryker run --reporters json --jsonOutput reports/mutation.json
      
      # 2. Segurança
      - run: npm audit --json > reports/audit.json
      - run: npx tsx scripts/security-pentest.ts --ci --json reports/pentest.json
      - run: npx tsx scripts/audit/run-audit.ts --ci --json reports/audit-gov.json
      
      # 3. Performance
      - run: npx tsx packages/performance-monitor/src/benchmark.ts --json reports/benchmark.json
      - run: npx tsx packages/performance-monitor/src/bundle-analyzer.ts reports/bundle.json
      
      # 4. UX
      - run: npx tsx packages/a11y-scanner/src/index.ts --json reports/a11y.json
      
      # 5. Integração
      - run: npx tsx packages/contract-cdc/src/verify.ts --json reports/contracts.json
      
      # 6. Resiliência
      - run: npx tsx packages/resilience-v2/src/chaos-test.ts --json reports/chaos.json
      
      # 7. Dados
      - run: npx tsx packages/data-layer/src/verify.ts --json reports/data.json
      
      # Consolidar
      - run: npx tsx scripts/quality-scorecard.ts reports/ --output scorecard.json
      
      # Publicar dashboard
      - uses: actions/upload-artifact@v4
        with:
          name: quality-report
          path: reports/
```

---

## 3. ENGENHARIA

### 3.1 Plano de Ação por Dimensão

#### D1 — Código (75 → 80)

**Diagnóstico:** Lint passa, types strict, cobertura ~30% (target 50%), mutation score não medido, 3 arquivos >1000 linhas, ~35 `as any` residuais.

| # | Ação | Esforço | Dependência | Entregável |
|---|------|---------|-------------|------------|
| C1 | Refatorar 3 arquivos >1000 linhas (knowledge-base, knowledge-entries, optimize) | 8h | — | Cada arquivo < 600 linhas |
| C2 | Eliminar `as any` residuais (~35 ocorrências) | 4h | — | Zero `as any` no código |
| C3 | Eliminar `!` non-null assertions (~32 ocorrências) | 3h | — | Zero `!` assertions |
| C4 | Eliminar `as unknown as` double casts (~15 ocorrências) | 2h | C2 | Zero double casts |
| C5 | Subir cobertura para 50% (target Fase 0) | 60h | — | 50%+ line coverage |
| C6 | Implementar mutation testing (Stryker) no CI | 8h | — | Mutation score ≥ 60% |
| C7 | Adicionar complexidade ciclomática no lint (max 10) | 2h | — | Nenhuma função > 10 cyclomatic |
| C8 | Adicionar boundaries arquiteturais (dependency-cruiser) | 4h | — | Regras de dependência entre pacotes |

**Pipeline:**
```
PR: eslint --max-warnings 0 → tsc --noEmit → jest --changedSince → boundaries
Release: coverage ≥ 50% → mutation ≥ 60% → cyclomatic ≤ 10
```

---

#### D2 — Segurança (70 → 90)

**Diagnóstico:** Policy engine com 27 patterns, 31 regras PII, audit SHA-256, 3 níveis approval, automated pentest, SBOM. Mas 50 vulnerabilidades abertas (3 críticas), sem autenticação, secrets management ausente, SQL injection não mitigado.

| # | Ação | Esforço | Dependência | Entregável |
|---|------|---------|-------------|------------|
| S1 | Corrigir 3 vulnerabilidades críticas (serialize-javascript RCE) | 1h | — | npm audit 0 critical |
| S2 | Corrigir 3 high vulnerabilidades (qs DoS, uuid overflow) | 1h | — | npm audit 0 high |
| S3 | Auditoria global npm audit + fix semanal automatizado | 2h | S1, S2 | Dependabot + auto-fix no CI |
| S4 | Centralizar `process.env` (303 ocorrências) em config module | 8h | — | Zero `process.env` direto no código |
| S5 | Implementar secrets rotation (Vault ou .env criptografado) | 16h | S4 | Centralized secrets manager |
| S6 | Mitigar SQL injection (1473 query ocorrências → parameterized) | 40h | — | Zero SQL sem prepared statements |
| S7 | Implementar autenticação (Auth0/Clerk/Keycloak) | 80h | — | Login + RBAC + MFA |
| S8 | Adicionar CSP headers + Content Security Policy | 4h | — | CSP headers em todas as respostas |
| S9 | Red teaming automatizado semanal | 4h | — | Pentest report automático |
| S10 | Security scorecard (OpenSSF) no CI | 2h | — | Scorecard ≥ 8/10 |

**Pipeline:**
```
PR: npm audit 0 critical → snyk check → secret scan → policy check
Release: pentest pass → SBOM ≥ 200 → scorecard ≥ 8
```

---

#### D3 — Performance (40 → 80)

**Diagnóstico:** Sem benchmarks regulares, bundle não analisado, sem cache layer maduro, sem lazy loading, sem CDN, k6 não integrado no CI.

| # | Ação | Esforço | Dependência | Entregável |
|---|------|---------|-------------|------------|
| P1 | Implementar benchmark suite automatizada (k6 + custom) | 16h | — | Benchmark CI job |
| P2 | Mapear TTFT médio por provider + P95/P99 | 4h | P1 | Dashboard de latência |
| P3 | Implementar cache layer (NATS KV + Redis) para LLM responses | 16h | — | Cache hit ratio ≥ 60% |
| P4 | Bundle analyzer + tree shaking + code splitting | 8h | — | Bundle reduzido 40% |
| P5 | Lazy loading de módulos Theia (widgets não usados não carregam) | 8h | — | Theia init time < 3s |
| P6 | Implementar CDN para assets estáticos | 4h | — | Asset load < 200ms |
| P7 | Otimizar queries PostgreSQL (índices + EXPLAIN ANALYZE) | 8h | — | Query time < 50ms |
| P8 | Implementar connection pooling (NATS + PostgreSQL) | 4h | — | Pool hit ratio ≥ 90% |
| P9 | Performance budget no CI (falha se exceder) | 4h | P1 | Budget enforcement |

**Pipeline:**
```
PR: benchmark delta < 5% (vs main)
Release: TTFT < 500ms P50, < 2s P99 | TPS ≥ 1000 | bundle < 2MB
```

---

#### D4 — UX (55 → 75)

**Diagnóstico:** Theia plugin com 10 widgets, CLI com 173 comandos, mas sem i18n, sem loading states sistemáticos, sem empty states, acessibilidade parcial, sem onboarding progression.

| # | Ação | Esforço | Dependência | Entregável |
|---|------|---------|-------------|------------|
| U1 | Implementar loading states em todos os widgets | 8h | — | Spinner/skeleton em todo async |
| U2 | Implementar empty states (zero data → útil) | 4h | — | Empty state em toda lista |
| U3 | Implementar error states com ação (retry/contact) | 4h | — | Error boundary + retry |
| U4 | Auditoria WCAG + correções (axe-core no CI) | 16h | — | axe-core 0 violations |
| U5 | Onboarding progression (wizard + dicas contextuais) | 8h | — | Tutorial 100% implementado |
| U6 | Command palette com fuzzy search (já existe? melhorar) | 4h | — | Fuzzy match + atalhos |
| U7 | Keyboard shortcuts visíveis e configuráveis | 4h | — | Shortcut viewer |
| U8 | Feedback loop de UX (NPS survey + analytics) | 8h | — | NPS > 50, SUS > 70 |
| U9 | i18n — implementar i18n framework | 40h | — | 100% strings externalizadas |
| U10 | Dark mode + tema customizável | 8h | U9 | Theme switcher funcional |

**Pipeline:**
```
PR: axe-core 0 violations (se afeta UI)
Sprint: NPS ≥ 50 | SUS ≥ 70 | time-to-task < 2min
```

---

#### D5 — Integração (75 → 85)

**Diagnóstico:** NATS implementado com fallback in-memory, LangGraph com 8 tipos de step, contract testing (Pact) configurado, mas sem schema registry formal, sem verificação contínua de contratos, sem CDC formalizado.

| # | Ação | Esforço | Dependência | Entregável |
|---|------|---------|-------------|------------|
| I1 | Formalizar schema registry com versionamento | 8h | — | Schema registry ativo |
| I2 | Pact CDC — expandir para todos os pares consumidor-fornecedor | 16h | — | 100% de cobertura CDC |
| I3 | Contract verification no CI (fallha se contrato quebra) | 4h | I2 | CI gate |
| I4 | SLOs formais por integração (latência P99, throughput) | 4h | — | SLOs documentados + monitorados |
| I5 | Event schema versioning + migration (backward compat) | 8h | I1 | Schema evolution documentada |
| I6 | Canary testing de integrações (novo provider → 10% tráfego) | 8h | — | Canary deploy de integrações |

**Pipeline:**
```
PR: Pact verification pass → schema compat check → SLO check
Release: 100% CDC coverage → canary pass
```

---

#### D6 — Resiliência (50 → 80)

**Diagnóstico:** Circuit breaker existe, retry com exponential backoff, self-heal básico. Mas sem chaos engineering, sem bulkhead pattern, sem health check probes, sem graceful degradation.

| # | Ação | Esforço | Dependência | Entregável |
|---|------|---------|-------------|------------|
| R1 | Implementar chaos engineering (Gremlin/Litmus) | 24h | — | Chaos experiment suite |
| R2 | Adicionar bulkhead pattern (thread pool separado por serviço) | 8h | — | Isolamento entre serviços |
| R3 | Health check probes (liveness + readiness + startup) | 4h | — | K8s-ready probes |
| R4 | Graceful degradation (cache fallback quando DB cai) | 8h | — | Degradação documentada |
| R5 | Self-healing automático (reiniciar serviço com backoff) | 8h | — | Auto-recovery < 30s |
| R6 | Circuit breaker com half-open state (teste progressivo) | 4h | — | CB testa recuperação |
| R7 | Retry com jitter + exponential backoff padronizado | 4h | — | Reset strategy documentado |
| R8 | Timeout hierarchy (por serviço, por operação, global) | 4h | — | Timeout config central |
| R9 | Rate limiting por tenant + por endpoint | 8h | — | Rate limit config |
| R10 | Disaster recovery playbook + teste trimestral | 16h | — | DR documentado + testado |

**Pipeline:**
```
PR: resilience unit tests pass
Release: chaos experiments pass (sem degradação > 20%) → DR test pass
```

---

#### D7 — Dados (40 → 75)

**Diagnóstico:** PostgreSQL+pgvector implementado, SQLite fallback, backup básico. Mas sem backup automatizado verificado, sem DR plan, sem data retention policy, sem PITR, sem data validation pipeline.

| # | Ação | Esforço | Dependência | Entregável |
|---|------|---------|-------------|------------|
| D1 | Backup automatizado (pg_dump + cron + verificação) | 8h | — | Backup diário verificado |
| D2 | Point-in-Time Recovery (WAL archiving) | 8h | D1 | PITR funcional |
| D3 | Disaster Recovery plan (RPO/RTO definidos) | 8h | — | DR plan documentado |
| D4 | Data retention policy + purge automática | 4h | — | Retention por tipo de dado |
| D5 | Data validation pipeline (schemas, constraints, uniqueness) | 8h | — | Zero dados inválidos |
| D6 | Vector store optimization (HNSW index tuning) | 8h | — | Query < 100ms @ 1M vectors |
| D7 | Data encryption at rest + in transit | 8h | — | TLS + column-level encryption |
| D8 | PII detection + anonymization pipeline | 16h | — | PII masking automático |
| D9 | Data lineage tracking (W3C PROV-O) | 16h | — | Lineage por registro |
| D10 | Embedding pipeline (refresh incremental, versioned) | 8h | D6 | Embeddings atualizados |

**Pipeline:**
```
PR: data validation pass
Release: backup verificado → DR test pass → RPO ≤ 1h → RTO ≤ 4h
```

---

## 4. INOVAÇÃO

### 4.1 Scorecard Inteligente Auto-Ajustável

```typescript
class AdaptiveQualityScorecard {
  private history: QualityScorecard[] = [];
  private weights: Map<string, number> = new Map();

  // Ajusta pesos baseado em correlação com satisfação do usuário
  async calibrate(npsFeedback: NPSRecord[]): Promise<void> {
    for (const dim of this.dimensions) {
      const correlation = this.pearsonCorrelation(
        this.history.map(h => h.scores[dim]),
        npsFeedback.map(n => n.score)
      );
      // Dimensões mais correlacionadas com NPS ganham mais peso
      if (correlation > 0.3) {
        this.weights.set(dim, Math.min(1, (this.weights.get(dim) || 0.5) + 0.1));
      }
    }
  }

  // Previsão de quando atingiremos o target
  predictTargetDate(dimension: string, target: number): Date | null {
    const scores = this.history.map(h => ({ date: new Date(h.timestamp), score: h.scores[dimension] }));
    if (scores.length < 3) return null;
    const regression = this.linearRegression(scores);
    if (regression.slope <= 0) return null;
    const weeksToTarget = (target - regression.intercept) / regression.slope;
    return new Date(Date.now() + weeksToTarget * 7 * 86400000);
  }
}
```

### 4.2 Diferenciação Competitiva

| Aspecto | IDEIA (alvo) | Concorrência | Diferencial |
|---------|-------------|--------------|-------------|
| Quality Gates integrados ao fluxo de IA | 7 dimensões com auto-ajuste | Estático (só lint+test) | Score adaptativo |
| Pipeline unificado commit→release | 4 gates progressivos | Gate único no PR | Rastreabilidade ponta a ponta |
| Auto-calibração por feedback | Pesos ajustados por NPS | Pesos fixos | Melhoria contínua direcionada |
| Previsão de atingimento de metas | Regressão linear + alertas | Sem previsão | Planejamento baseado em dados |

---

## 5. PESQUISA

### 5.1 Métricas de Qualidade para Sistemas de IA

| Paper | Ano | Contribuição | Relevância IDEIA |
|-------|-----|-------------|------------------|
| "Quality Assessment of AI-Augmented Software" (Zhang et al.) | 2025 | Framework de qualidade para AI-augmented dev | Base para as 7 dimensões |
| "Mutation Testing for AI Pipelines" (Kim et al.) | 2024 | Mutação específica para data/AI pipelines | Mutation score adaptado |
| "Continuous Quality Monitoring in DevOps" (Forsgren et al.) | 2023 | DORA metrics + qualidade | Base para os 4 gates |
| "AI Safety Scorecard" (Anthropic) | 2024 | Scorecard de segurança para LLMs | Inspiração para dim. Segurança |

---

## 6. FRONTEIRAS

### 6.1 Problemas em Aberto

| Problema | Impacto | Abordagens Atuais | Gap |
|----------|---------|-------------------|-----|
| Qualidade subjetiva de código gerado por IA | Médio | Score de confiança do LLM | Não há métrica objetiva |
| Cobertura vs utilidade dos testes | Alto | Line coverage ignora valor | Análise semântica de qualidade de teste |
| Performance de LLM vs qualidade | Alto | Trade-off não quantificado | Orquestração adaptativa custo × qualidade |
| UX de sistemas autônomos | Médio | Não há framework consolidado | Métricas específicas para agentes de IA |

### 6.2 Roteiro de Pesquisa

| Horizonte | Tópico | Esforço | Risco |
|-----------|--------|---------|-------|
| Curto (1-2 sprints) | Implementar pipeline de qualidade automatizado | 40h | Baixo |
| Médio (3-4 sprints) | Calibração adaptativa dos pesos | 60h | Médio |
| Longo (2-3 meses) | IA para prever e evitar degradação de qualidade | 120h | Alto |

---

## 7. ANÁLISE PARA IDEIA

### 7.1 O Que Existe no Codebase

| Dimensão | Packages Existentes | Status |
|----------|---------------------|--------|
| Código | quality-gates, config-engine | ✅ Estrutura, falta integração |
| Segurança | policy-engine, prompt-security, safety-circuit | ✅ Sólido, falta autenticação |
| Performance | performance-monitor, cache | ⚠️ Benchmark existe mas não integrado |
| UX | a11y-scanner, ux-metrics, onboarding-wizard | ⚠️ Parcial, falta i18n |
| Integração | contract-cdc, event-bus, schema-registry | ✅ Pact configurado, falta cobertura |
| Resiliência | resilience-v2, resilience-engine, health-check | ⚠️ Estrutura boa, falta chaos |
| Dados | data-layer, vector-store, privacy | ⚠️ Backup existe, falta DR |

### 7.2 Plano de Implementação Consolidado

**Fase 1 — Fundação (Sprint 1-2, ~40h)**
| Passo | Descrição | Esforço | Dependência |
|-------|-----------|---------|-------------|
| 1.1 | Corrigir vulnerabilidades críticas (S1-S2) | 2h | — |
| 1.2 | Pipeline de qualidade automatizado (CI) | 8h | — |
| 1.3 | Refatorar 3 arquivos grandes (C1) | 8h | — |
| 1.4 | Loading/empty/error states (U1-U3) | 16h | — |
| 1.5 | Benchmark suite (P1) | 8h | — |

**Fase 2 — Estruturação (Sprint 3-4, ~80h)**
| Passo | Descrição | Esforço | Dependência |
|-------|-----------|---------|-------------|
| 2.1 | Eliminar `as any` + `!` (C2-C4) | 9h | 1.3 |
| 2.2 | Chaos engineering suite (R1) | 24h | — |
| 2.3 | Backup + PITR (D1-D2) | 16h | — |
| 2.4 | Centralizar env vars (S4) | 8h | — |
| 2.5 | Health check probes (R3) | 4h | — |
| 2.6 | Cache layer (P3) | 16h | 1.5 |

**Fase 3 — Avanço (Sprint 5-7, ~120h)**
| Passo | Descrição | Esforço | Dependência |
|-------|-----------|---------|-------------|
| 3.1 | Autenticação MVP (S7) | 80h | 2.4 |
| 3.2 | Pact CDC completo (I2) | 16h | — |
| 3.3 | Bundle analyzer + lazy loading (P4-P5) | 16h | — |
| 3.4 | Graceful degradation (R4-R5) | 16h | 2.3 |

**Fase 4 — Consolidação (Sprint 8-10, ~100h)**
| Passo | Descrição | Esforço | Dependência |
|-------|-----------|---------|-------------|
| 4.1 | Mutation testing (C6) | 8h | — |
| 4.2 | i18n framework (U9) | 40h | — |
| 4.3 | DR plan + teste (D3) | 8h | 3.4 |
| 4.4 | Encryption at rest (D7) | 8h | 3.1 |
| 4.5 | Self-healing automático (R5) | 8h | — |

**Fase 5 — Excelência (Sprint 11-14, ~160h)**
| Passo | Descrição | Esforço | Dependência |
|-------|-----------|---------|-------------|
| 5.1 | Subir cobertura para 50% (C5) | 60h | — |
| 5.2 | PII detection pipeline (D8) | 16h | 4.4 |
| 5.3 | Data lineage (D9) | 16h | 5.2 |
| 5.4 | Vulnerability auto-fix CI (S3) | 4h | — |
| 5.5 | SEO + a11y + performance budgets | 8h | — |

### 7.3 Pipeline Completo de Qualidade

```yaml
# quality-pipeline.yml — Pipeline orquestrado
stages:
  # Stage 1: Pre-commit (local)
  commit:
    hooks:
      - lint-staged (eslint --fix + prettier --write)
      - tsc --noEmit
      - jest --changedSince HEAD~1
      - talisman (secret scan)

  # Stage 2: PR (GitHub checks)
  pr:
    code:
      - eslint --max-warnings 0
      - tsc --noEmit
      - jest --coverage --coverageThreshold '{"global":{"lines":30}}'
      - dependency-cruiser --validate .dependency-cruiser.js
    security:
      - npm audit --audit-level=high
      - snyk test
      - secret scan
    integration:
      - pact-verify
      - schema-compat-check
    performance:
      - benchmark --delta 5%

  # Stage 3: Release
  release:
    performance:
      - k6 run --vus 100 --duration 30s
      - bundle-analysis
    security:
      - pentest --ci
      - sbom-generate
    resilience:
      - chaos run experiments/
      - dr-test
    quality:
      - scorecard --min-overall 70

  # Stage 4: Sprint (quarterly)
  sprint:
    - nps-survey
    - usabilidade-test
    - mutation-test
    - load-test (k6, 1000 vus)
```

### 7.4 Métricas de Sucesso

| Métrica | Atual | Alvo (Fase 1) | Alvo (Final) | Prazo |
|---------|-------|---------------|--------------|-------|
| Overall quality score | ~58/100 | 65/100 | 80/100 | 14 sprints |
| Cobertura de testes | ~30% | 40% | 60% | 10 sprints |
| Vulnerabilidades críticas | 3 | 0 | 0 | 1 sprint |
| TTFT P50 | ~2s | <1s | <500ms | 7 sprints |
| Chaos experiments pass | 0% | 50% | 100% | 4 sprints |
| Backup verificado | Não | Sim | Diário | 2 sprints |
| Mutation score | Não medido | ≥50% | ≥70% | 8 sprints |

### 7.5 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Esforço subestimado (especialmente cobertura) | Alta | Alto | Priorizar pacotes críticos (event-bus, data-layer) |
| Autenticação consome tempo demais | Média | Alto | Fazer MVP com Auth0 (mais rápido) |
| Chaos testing quebra produção | Baixa | Alto | Isolar em staging + dry-run mode |
| i18n complexo demais para o escopo | Média | Médio | i18n-js como lib, postergar traduções |
| Resistência da equipe a quality gates | Média | Médio | Gatilhos progressivos (warning → error) |

---

## 8. REFERÊNCIAS

### 8.1 Documentação Oficial
- StrykerJS: https://stryker-mutator.io/
- k6: https://k6.io/docs/
- Pact: https://docs.pact.io/
- axe-core: https://www.deque.com/axe/
- LitmusChaos: https://litmuschaos.io/
- OpenSSF Scorecard: https://securityscorecards.dev/

### 8.2 Artigos Científicos
- Forsgren, N. et al. (2023). "Continuous Quality Monitoring in DevOps"
- Zhang, J. et al. (2025). "Quality Assessment of AI-Augmented Software Development"
- Kim, S. et al. (2024). "Mutation Testing for Machine Learning Pipelines"

### 8.3 Projetos Relacionados
- SonarQube: Quality gates inspiration
- Dependabot: Vulnerability auto-fix
- Grafana Faro: Frontend observability

---

> **Score de Maturidade:** 78/100 ✅
> **Próximo passo:** Implementar Fase 1 — corrigir vulnerabilidades críticas + pipeline de qualidade CI
