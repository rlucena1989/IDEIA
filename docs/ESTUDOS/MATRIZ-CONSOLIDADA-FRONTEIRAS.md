# Matriz Consolidada de Viabilidade — 10 Frentes de Fronteira Tecnológica

> **Data**: 2026-07-15
> **Metodologia**: Template Permanente (Fase 2) — 5 dimensões ponderadas
> **Contexto**: Adições à Malha de Integração da IDE além dos 6 TASK-IDE-* originais

---

## Pontuação Consolidada

| # | Frente Tecnológica | Valor (3×) | Diferenciação (2×) | Sinergia (2×) | Custo-Benefício (2×) | Maturidade (1×) | **Score** | Decisão |
|:-:|--------------------|:----------:|:------------------:|:-------------:|:--------------------:|:---------------:|:---------:|:-------:|
| 1 | **Contract Testing (CDC)** | 5 | 4 | 5 | 4 | 4 | **4.5** | ✅ FAZER |
| 2 | **Resilience Patterns** | 4 | 3 | 5 | 4 | 5 | **4.1** | ✅ FAZER |
| 3 | **Security at Boundaries** | 5 | 3 | 4 | 4 | 4 | **4.1** | ✅ FAZER |
| 4 | **Distributed Observability** | 4 | 3 | 5 | 3 | 5 | **3.9** | ✅ FAZER |
| 5 | **MCP as Universal Protocol** | 5 | 5 | 5 | 4 | 4 | **4.7** | ✅ FAZER (já pontuado) |
| 6 | **Degradation Modes** | 4 | 3 | 5 | 4 | 5 | **4.1** | ✅ FAZER |
| 7 | **Performance Budget** | 4 | 3 | 5 | 4 | 5 | **4.1** | ✅ FAZER |
| 8 | **Contract Versioning** | 5 | 4 | 5 | 4 | 4 | **4.5** | ✅ FAZER |
| 9 | **Auto-detect Violations** | 5 | 4 | 5 | 4 | 4 | **4.5** | ✅ FAZER |
| 10 | **Visual Onboarding** | 4 | 3 | 5 | 5 | 5 | **4.3** | ✅ FAZER |

---

## Detalhamento por Frente

### 1. Contract Testing / CDC (Score: 4.5)

| Dimensão | Nota | Justificativa |
|----------|:----:|---------------|
| Valor | 5 | Crítico: 19 contratos formais entre módulos validados em tempo real |
| Diferenciação | 4 | Poucas IDEs têm CDC entre módulos internos |
| Sinergia | 5 | `CONTRATOS-INTEGRACAO.md` (559 linhas), `contract.ts`, differ, linter, audit já existem |
| Custo-Benefício | 4 | 2-3 sem, fundação sólida (differ, linter, audit scripts prontos) |
| Maturidade | 4 | Pact (4.700★), Spring Cloud Contract, bem estabelecido |

**Arquivos existentes**: `CONTRATOS-INTEGRACAO.md`, `contract.ts` (263 linhas), `contracts/differ.ts`, `contracts/linter.ts`, `contracts/validator.ts`, `contracts/generator.ts`, `TASK-F8-01-contract-validation.md`, 3 arquivos de teste

---

### 2. Resilience Patterns (Score: 4.1)

| Dimensão | Nota | Justificativa |
|----------|:----:|---------------|
| Valor | 4 | Crítico para produção mas não user-facing |
| Diferenciação | 3 | Padrão em sistemas robustos |
| Sinergia | 5 | `circuit-breaker.ts`, `resilience-policy.ts`, `resilience-report.ts`, `repair-coordinator.ts` existem |
| Custo-Benefício | 4 | 2-3 sem, código base já existe |
| Maturidade | 5 | Resilience4j, Polly — padrões maduros e testados |

**Gap atual**: Circuit breaker existe mas faltam Bulkhead, Retry formal, Timeout com fallback, e integração IDE-wide.

---

### 3. Security at Boundaries (Score: 4.1)

| Dimensão | Nota | Justificativa |
|----------|:----:|---------------|
| Valor | 5 | Fundamental: IDE multi-agente com execução de código |
| Diferenciação | 3 | Toda IDE tem segurança básica |
| Sinergia | 4 | `v3-boundaries.md`, `TASK-GAP-06-security-barriers.md` existem |
| Custo-Benefício | 4 | 3-4 sem, crítico antes de abrir agentes autônomos |
| Maturidade | 4 | OWASP, STRIDE, CASL — frameworks maduros |

**Gap atual**: `security barrier check/list/add` existe como CLI mas não há validação runtime nas fronteiras entre módulos da IDE.

---

### 4. Distributed Observability (Score: 3.9)

| Dimensão | Nota | Justificativa |
|----------|:----:|---------------|
| Valor | 4 | Essencial para debugar fluxos multi-agente |
| Diferenciação | 3 | Cursor/Windsurf não expõem traces |
| Sinergia | 5 | `observability.ts` (374 linhas), traces JSONL, `45-OBSERVABILIDADE-TELEMETRIA.md` (395 linhas) |
| Custo-Benefício | 3 | OpenTelemetry tem overhead de instrumentação |
| Maturidade | 5 | OpenTelemetry CNCF graduated, W3C Trace Context |

**Gap atual**: Traces existem para chamadas de IA mas não há distributed tracing entre módulos da IDE (AgentRuntime → FileBridge → TerminalBridge → Chat).

---

### 5. MCP as Universal Protocol (Score: 4.7)

> Já analisado em `MATRIZ-FEASIBILIDADE-TECNOLOGICA.md` — mantido como referência
> TASK-F2-01-mcp-server.md já criada

---

### 6. Degradation Modes (Score: 4.1)

| Dimensão | Nota | Justificativa |
|----------|:----:|---------------|
| Valor | 4 | IDE precisa funcionar parcialmente quando serviços falham |
| Diferenciação | 3 | Prática padrão de engenharia |
| Sinergia | 5 | `feature-flag.ts` (139 linhas), `FeatureFlagManager`, `features.ts` existem |
| Custo-Benefício | 4 | 1-2 sem, feature flags prontas |
| Maturidade | 5 | Feature flags = padrão industrial (LaunchDarkly, Unleash) |

**Gap atual**: Feature flags existem mas não há hierarquia de degradação (ex: "sem LLM → fallback para regras locais").

---

### 7. Performance Budget (Score: 4.1)

| Dimensão | Nota | Justificativa |
|----------|:----:|---------------|
| Valor | 4 | IDE responsiva = produtividade |
| Diferenciação | 3 | Lighthouse, bundle analyzer são padrão |
| Sinergia | 5 | `budget.yaml` com 7 métricas, `performance.ts` pronto |
| Custo-Benefício | 4 | 1-2 sem, config + CLI existem |
| Maturidade | 5 | Lighthouse, sitespeed.io, bundlesize maduros |

**Gap atual**: Budget configurado mas não há verificação no CI nem alertas quando excedido na IDE runtime.

---

### 8. Contract Versioning (Score: 4.5)

| Dimensão | Nota | Justificativa |
|----------|:----:|---------------|
| Valor | 5 | Monorepo com 23 pacotes precisa de evolução controlada |
| Diferenciação | 4 | Poucos projetos versionam contratos internos formalmente |
| Sinergia | 5 | `differ.ts` (breaking vs non-breaking), `version.ts`, `version-priority.ts`, `version-scope-matrix.md` |
| Custo-Benefício | 4 | 2-3 sem, ferramental base pronto |
| Maturidade | 4 | Semver padrão, breaking change detection emergente |

**Gap atual**: `contract diff` existe mas não há política automática de versão (ex: breaking change → bump major, CI bloqueia).

---

### 9. Auto-detect Violations (Score: 4.5)

| Dimensão | Nota | Justificativa |
|----------|:----:|---------------|
| Valor | 5 | Qualidade automatizada = core value da IDE |
| Diferenciação | 4 | Linter qualquer IDE tem; enforcement runtime é diferencial |
| Sinergia | 5 | `TASK-F6-02-diagnostics-violations.md`, `contract.ts check-all`, `check-contracts.ts`, `contract-audit.ts` |
| Custo-Benefício | 4 | 3-4 sem, audit e lint existem; falta enforcement runtime |
| Maturidade | 4 | Pact para contratos; runtime enforcement é fronteira |

**Gap atual**: Violações detectadas em build mas não em runtime. Contratos entre módulos IDE não são validados na inicialização.

---

### 10. Visual Onboarding (Score: 4.3)

| Dimensão | Nota | Justificativa |
|----------|:----:|---------------|
| Valor | 4 | Primeira impressão, tempo até primeira task |
| Diferenciação | 3 | Maioria das ferramentas tem onboarding |
| Sinergia | 5 | `TASK-QUICK-05-wizard.md`, `onboarding.ts` (70 linhas), `stack-detector.ts` |
| Custo-Benefício | 5 | 1-2 sem (Quick Win), código e task definidos |
| Maturidade | 5 | Wizard/onboarding é padrão maduro |

**Gap atual**: `onboarding.ts` gera checklist markdown mas não há wizard interativo na IDE webview.

---

## Dependências entre as Frentes

```
Contract Testing ──→ Contract Versioning ──→ Auto-detect Violations
       │                    │                       │
       └────────────────────┴───────────────────────┘
                              │
                              ↓
                      Security Boundaries
                              │
                   ┌──────────┴──────────┐
                   ↓                     ↓
          Resilience Patterns    Distributed Observability
                   │                     │
                   └──────────┬──────────┘
                              ↓
                   Degradation Modes
                              │
                              ↓
                   Performance Budget
                              │
                              ↓
          MCP (Universal Protocol)
                              │
                              ↓
                   Visual Onboarding
```

---

## Linha do Tempo Recomendada

```
Sem 1-2 (Jul)     Sem 3-4 (Ago)      Sem 5-8 (Set-Out)
─────────────────────────────────────────────────────────
IDE-12 Onboarding  IDE-07 Contracts   IDE-10 Observability
IDE-13 PerfBudget  IDE-11 Violations  IDE-08 Resilience
                   IDE-09 Security    IDE-06 Degradation
```

---

## Decisões Finais

| Frente | Decisão | Esforço | Task | Prioridade |
|--------|:-------:|:-------:|:----:|:----------:|
| Contract Testing + Versioning | ✅ FAZER | M (3-4 sem) | TASK-IDE-07 | 🔴 Alta |
| Resilience Patterns + Degradation | ✅ FAZER | M (3-4 sem) | TASK-IDE-08 | 🟡 Média |
| Security at Boundaries | ✅ FAZER | M (3-4 sem) | TASK-IDE-09 | 🔴 Alta |
| Distributed Observability | ✅ FAZER | M (3-4 sem) | TASK-IDE-10 | 🟡 Média |
| MCP (já task) | ✅ FAZER | L (5-6 sem) | TASK-F2-01 | 🔴 Alta |
| Performance Budget | ✅ FAZER | P (1-2 sem) | TASK-IDE-13 | 🟡 Média |
| Auto-detect Violations | ✅ FAZER | M (3-4 sem) | TASK-IDE-11 | 🔴 Alta |
| Visual Onboarding | ✅ FAZER | P (1-2 sem) | TASK-IDE-12 | 🟢 Baixa |

---

## Artefatos Gerados

- `docs/ESTUDOS/MATRIZ-CONSOLIDADA-FRONTEIRAS.md` ← este arquivo
- `.ai/tasks/TASK-IDE-07.md` — Contract Testing + Versioning
- `.ai/tasks/TASK-IDE-08.md` — Resilience + Degradation
- `.ai/tasks/TASK-IDE-09.md` — Security at Boundaries
- `.ai/tasks/TASK-IDE-10.md` — Distributed Observability
- `.ai/tasks/TASK-IDE-11.md` — Auto-detect Violations
- `.ai/tasks/TASK-IDE-12.md` — Visual Onboarding
- `.ai/tasks/TASK-IDE-13.md` — Performance Budget
