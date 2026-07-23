# Análise dos Módulos Inteligentes do ai-devkit

> **Data:** 2026-07-13
> **Propósito:** Inventariar, dissecar e avaliar os 6 módulos inteligentes do ai-devkit — memória
> histórica, autoexplicação, previsão de risco, documentação viva, legado e aprendizado adaptativo —
> para determinar seu estado real, integração, persistência, auditabilidade, reuso na IDE e o que
> falta para operarem como núcleo unificado.
> **Base:** Análise de ~80 arquivos em 6 diretórios + 3 sistemas transversais.

---

## Sumário

1. [Resumo Executivo](#1-resumo-executivo)
2. [Inventário dos Módulos](#2-inventário-dos-módulos)
   - [2.1 Memória Histórica](#21-memória-histórica)
   - [2.2 Autoexplicação](#22-autoexplicação)
   - [2.3 Previsão de Risco](#23-previsão-de-risco)
   - [2.4 Documentação Viva](#24-documentação-viva)
   - [2.5 Legado/Auditoria](#25-legadoauditoria)
   - [2.6 Aprendizado Adaptativo](#26-aprendizado-adaptativo)
3. [Sistemas Transversais](#3-sistemas-transversais)
   - [3.1 Cognitive Coprocessor](#31-cognitive-coprocessor)
   - [3.2 Motor de Aceleração](#32-motor-de-aceleração)
   - [3.3 Orquestração de Fases](#33-orquestração-de-fases)
4. [Fluxos Entre os Módulos](#4-fluxos-entre-os-módulos)
5. [Lacunas de Integração](#5-lacunas-de-integração)
6. [Riscos](#6-riscos)
7. [Recomendações para Unificação](#7-recomendações-para-unificação)
8. [Anexo: Mapa Completo de Arquivos](#8-anexo-mapa-completo-de-arquivos)

---

## 1. Resumo Executivo

### Descoberta Principal

Os 6 módulos inteligentes **existem e são reais**, mas operam como **ilhas independentes**:

- **Nenhum persiste dados de usuário** entre sessões (exceto `pattern-learner.ts`)
- **Nenhum usa LLM real** — 100% das decisões são heurísticas (regras fixas, limiares, regex)
- **Nenhum se integra com outro** — não há chamadas entre `memory/` → `cognitive-coprocessor/` → `adaptive/` → `autonomous/`
- **Não há barramento de eventos** ou log centralizado
- **O Cognitive Coprocessor é a exceção**: 11 arquivos, 8 estágios, orquestração completa, middleware pattern — **é a base ideal para unificação**

### Status Geral

| Módulo | É Real? | Persiste? | Auditável? | Integrado? | LLM? | Reuso na IDE |
|--------|---------|-----------|------------|------------|------|-------------|
| Memória Histórica | ✅ Sim | ❌ In-memory | ❌ Não | ❌ Isolado | ❌ Heurísticas | ✅ Alto |
| Autoexplicação | ✅ Sim | ❌ In-memory | ✅ Sim | ❌ Isolado | ❌ Heurísticas | ✅ Alto |
| Previsão de Risco | ✅ Sim | 🟡 Parcial | ✅ Sim | ❌ Isolado | ❌ Heurísticas | ✅ Alto |
| Documentação Viva | ✅ Sim | 🟡 Parcial | ✅ Sim | ❌ Isolado | ❌ Heurísticas | ✅ Médio |
| Legado/Auditoria | ✅ Sim | ✅ Sim | ✅ Criptográfico | ❌ Isolado | ❌ Heurísticas | ✅ Alto |
| Aprendizado Adaptativo | ✅ Sim | 🟡 Parcial | ❌ Não | ❌ Isolado | ❌ Heurísticas | ✅ Alto |
| Cognitive Coprocessor | ✅ Sim | ❌ In-memory | ✅ Sim | 🟡 Interno | ❌ Heurísticas | ✅ Alto |
| Motor de Aceleração | ✅ Sim | ✅ Sim | ✅ Sim | 🟡 Interno | ❌ Heurísticas | 🟡 Médio |
| Orquestração de Fases | ✅ Sim | ✅ Sim | ✅ Sim | 🟡 Interno | ❌ Heurísticas | 🟡 Médio |

---

## 2. Inventário dos Módulos

### 2.1 Memória Histórica

**Localização:** `packages/cli/src/memory/` (8 arquivos, 207 linhas totais)
**Comandos CLI:** `memory list|query|export`, `learn analyze|recommend|apply`, `patterns detect|report|explain`
**Pipeline:** `seedMemory()` → `detectPatterns()` → `generateRecommendations()` → `adaptPolicy()` → `buildMemoryReport()`

#### Arquivos

| Arquivo | Linhas | Função | Real? | Persiste? |
|---------|--------|--------|-------|-----------|
| `memory-types.ts` | 46 | `MemoryRecord`, `MemoryPattern`, `LearningRecommendation`, `createMemoryRecord()` | ✅ | ❌ (tipos apenas) |
| `memory-store.ts` | 36 | Classe `MemoryStore` com `append()`, `list()`, `findByCategory()`, `search()` | ✅ | ❌ in-memory (`MemoryRecord[]`) |
| `memory-index.ts` | 13 | `buildMemoryIndex()` — frequência de tags | ✅ | ❌ computado |
| `pattern-detector.ts` | 22 | `detectPatterns()` — tags com freq >= 2, confiança = min(1, 0.5 + count * 0.1) | ✅ | ❌ computado |
| `learning-engine.ts` | 11 | `generateRecommendations()` — >= 0.8 = apply_policy_tuning | ✅ | ❌ computado |
| `policy-adapter.ts` | 17 | `adaptPolicy()` — aprova se confiança >= 0.85 | ✅ | ❌ computado |
| `history-summarizer.ts` | 28 | `summarizeHistory()` — contagens por categoria | ✅ | ❌ computado |
| `memory-report.ts` | 34 | `buildMemoryReport()` — agrega tudo | ✅ | ❌ computado |

#### O que é real vs mito

| Alegação | Real? | Evidência |
|----------|-------|-----------|
| "Memória histórica" | 🟡 Parcial | Armazena records, detecta padrões, gera recomendações — tudo funcional |
| "Persiste entre sessões" | ❌ Falso | `MemoryStore` é `private records: MemoryRecord[]` — morre ao sair do processo |
| "Aprende com o tempo" | 🟡 Parcial | Pattern-detector aprende padrões dentro de uma sessão, mas tudo se perde ao reiniciar |
| "Alimenta decisões" | ❌ Falso | Nenhum outro módulo consulta `MemoryStore` |
| "Usa IA" | ❌ Falso | 100% heurístico: limiar de confiança fixo, regras determinísticas |

#### Estrutura de dados (MemoryRecord)

```typescript
{
  memoryId: string,          // crypto.randomUUID()
  category: 'cycle'|'failure'|'recovery'|'approval'|'change'|'trend'|'policy'|'agent',
  source: string,            // quem gerou
  summary: string,           // descrição textual
  tags: string[],            // keywords
  createdAt: string,         // ISO 8601
  severity?: 'low'|'medium'|'high'|'critical'
}
```

#### Reuso na IDE

| Uso | Como |
|-----|------|
| Histórico de ações do usuário | Adaptar `MemoryRecord` → `ActionLog` com persistência |
| Padrões de uso frequentes | `PatternDetector` adaptado para identificar comandos/arquivos mais usados |
| Recomendações contextuais | `LearningEngine` adaptado para sugerir ações baseadas em histórico |
| Adaptação de políticas | `PolicyAdapter` para auto-aprovação de ações repetitivas |

---

### 2.2 Autoexplicação

**Localização:** `packages/cli/src/explanation/` (8 arquivos, ~200 linhas)
**Localização adicional:** `.ai/bin/cognitive-bridge.js` (44 linhas)
**Comandos CLI:** `explain decision|policy|block`

#### Arquivos

| Arquivo | Linhas | Função | Real? | Persiste? |
|---------|--------|--------|-------|-----------|
| `explanation-types.ts` | 28 | `DecisionTrace`, `Explanation`, `EvidenceLink` | ✅ | ❌ (tipos) |
| `decision-trace.ts` | 19 | `createDecisionTrace()` — captura contexto + sinais | ✅ | ❌ |
| `explanation-engine.ts` | 18 | `explainDecision()` — gera Explanation com detalhes + confiança | ✅ | ❌ |
| `rationale-builder.ts` | 34 | `buildRationale()` — fatos + inferências | ✅ | ❌ |
| `evidence-linker.ts` | 12 | `linkEvidence()` — cria EvidenceLink[] | ✅ | ❌ |
| `explanation-registry.ts` | 72 | `ExplanationRegistry` — in-memory store | ✅ | ❌ in-memory |
| `transparency-policy.ts` | 15 | Flags: explainCriticalDecisions, explainBlockedActions, etc. | ✅ | ❌ |
| `explain-report.ts` | 33 | `buildExplainReport()` — agrega traces + explanations + evidence | ✅ | ❌ |
| `cognitive-bridge.js` | 44 | Gera cognitive-map.md do projeto | ✅ | ✅ `.ai/docs/cognitive-map.md` |

#### O que é real vs mito

| Alegação | Real? | Evidência |
|----------|-------|-----------|
| "Explica decisões" | ✅ Real | `explain decision <type> <context>` cria trace + explanation funcional |
| "Gera rationale" | ✅ Real | `rationale-builder.ts` monta fatos + inferências |
| "Registra evidências" | ✅ Real | `evidence-linker.ts` vincula fontes |
| "Persiste explicações" | ❌ Falso | `ExplanationRegistry` é in-memory — perdido ao reiniciar |
| "Usa IA para explicar" | ❌ Falso | Tudo template-based: `reason: \`Decision ${type} with context: ${context}\`` |
| "Mapa cognitivo" | ✅ Real | `cognitive-bridge.js` lê skeleton e gera cognitive-map.md |

#### Estrutura de dados (DecisionTrace)

```typescript
{
  traceId: string,
  decisionType: string,
  context: string,
  signals: string[],          // sinais considerados
  policyApplied: string,      // política usada
  outcome: string,            // resultado
  createdAt: string           // ISO 8601
}
```

#### Reuso na IDE

| Uso | Como |
|-----|------|
| Explicar ações do assistente | `explainDecision()` adaptado para mostrar "por que fiz isso" no chat |
| Rastrear decisões do usuário | `DecisionTrace` para auditoria de ações |
| Vincular evidências | `EvidenceLink` para mostrar quais arquivos/regras justificam uma ação |
| Política de transparência | `TransparencyPolicy` para controlar quando a IA deve se explicar |

---

### 2.3 Previsão de Risco

**Localização:** `packages/cli/src/prediction/` (3 arquivos, ~90 linhas)
**Localização adicional:** `packages/cli/src/commands/drift.ts`, `commands/risk.ts`, `commands/security.ts`
**Localização adicional:** `packages/cli/src/autonomous/drift-detector.ts`

#### Arquivos

| Arquivo | Linhas | Função | Real? | Persiste? |
|---------|--------|--------|-------|-----------|
| `prediction/prediction-types.ts` | 42 | `PredictionInput`, `PredictionResult`, `ImpactEstimate`, `createPredictionInput()` | ✅ | ❌ (tipos) |
| `prediction/risk-model.ts` | 25 | `assessRisk()` — score = likelihood * impact | ✅ | ❌ computado |
| `prediction/risk-thresholds.ts` | 22 | `evaluateRiskLevel()` — low <5, moderate <10, high <20, critical >=20 | ✅ | ❌ computado |
| `commands/drift.ts` | 316 | `detectDrift()` — 4 estratégias (stale, orphan, reality, completeness) | ✅ | ✅ `.ai/reports/drift/latest.json` |
| `commands/risk.ts` | 98 | `risk assess subject` — calcula risco | ✅ | ❌ in-memory |
| `commands/security.ts` | 216 | `security barrier check` — downgrade detection + blocking | ✅ | ✅ `.ai/security/baseline.json`, `.ai/reports/security/downgrades.jsonl` |
| `autonomous/drift-detector.ts` | 15 | `detectDrift(score, expected)` — delta > 5 = drift | ✅ | ❌ computado |

#### O que é real vs mito

| Alegação | Real? | Evidência |
|----------|-------|-----------|
| "Prevê risco de mudanças" | ✅ Real | `assessRisk(likelihood, impact)` calcula score + nível |
| "Detecta drift" | ✅ Real | `drift.ts` usa 4 estratégias de detecção + persiste relatório |
| "Bloqueia downgrade de segurança" | ✅ Real | `security.ts` com baseline + detector + logs JSONL |
| "Usa IA para prever" | ❌ Falso | `assessRisk` é `score = likelihood * impact` — matemática simples |
| "Aprendizado de risco" | ❌ Falso | Nenhum histórico é usado para calibrar |

#### Algoritmo de Risco

```typescript
function assessRisk(subject: string, likelihoodScore: number, impactScore: number): RiskAssessment {
  score = likelihoodScore * impactScore;
  level = score < 3 ? 'low' : score < 6 ? 'medium' : score < 8 ? 'high' : 'critical';
}
```

#### Reuso na IDE

| Uso | Como |
|-----|------|
| Risco de cada diff/patch | `assessRisk()` calibrado com análise real do código |
| Previsão de impacto | `ImpactEstimate` para mostrar "esta mudança afeta X arquivos" |
| Bloqueio de ações perigosas | `security.ts` barrier check adaptado para a IDE |
| Drift detection | `drift.ts` para detectar desvios entre config e código |

---

### 2.4 Documentação Viva

**Localização:** `packages/cli/src/knowledge/` (8 arquivos, ~180 linhas)
**Localização adicional:** `packages/cli/src/commands/docs.ts` (238 linhas), `commands/snapshot.ts` (258 linhas)
**Localização adicional:** `packages/cli/src/local-ai/knowledge-base.ts` (677+ linhas, 101+ entradas hardcoded)

#### Arquivos

| Arquivo | Linhas | Função | Real? | Persiste? |
|---------|--------|--------|-------|-----------|
| `knowledge/knowledge-types.ts` | 47 | `KnowledgeEntry`, `LessonLearned`, `DocumentationArtifact` | ✅ | ❌ (tipos) |
| `knowledge/knowledge-base.ts` | 49 | `KnowledgeBase` — in-memory store com upsert/search | ✅ | ❌ in-memory |
| `knowledge/knowledge-curator.ts` | 11 | `curateKnowledge()` — dedup + remove obsolete | ✅ | ❌ computado |
| `knowledge/knowledge-report.ts` | 27 | `buildKnowledgeReport()` — agrega entries + lessons + artifacts | ✅ | ❌ computado |
| `knowledge/lesson-capture.ts` | 17 | `captureLesson()` — cria LessonLearned | ✅ | ❌ |
| `knowledge/runbook-manager.ts` | 18 | `buildRunbook()`, `buildRunbookSections()` | ✅ | ❌ computado |
| `knowledge/doc-generator.ts` | 16 | `generateMarkdownDocs()`, `buildDocumentationArtifact()` | ✅ | ❌ |
| `knowledge/doc-sync.ts` | 15 | `syncDocumentation()` — **STUB**: não faz sync real | 🟡 Stub | ❌ |
| `commands/docs.ts` | 238 | `docs resolve|audit|sources|policy|status|generate|sync|publish` | ✅ | ❌ |
| `commands/snapshot.ts` | 258 | `snapshot generate --save` → `.ai/reports/snapshot.json` | ✅ | ✅ `.ai/reports/snapshot.json` |
| `local-ai/knowledge-base.ts` | 677 | 101+ entradas hardcoded (Clean Architecture, DDD, CQRS, SOLID, etc.) | ✅ | 🟡 Exporta YAML `.ai/knowledge/entries/` |

#### O que é real vs mito

| Alegação | Real? | Evidência |
|----------|-------|-----------|
| "Gera documentação viva" | 🟡 Parcial | `doc-generator.ts` gera markdown, `snapshot.ts` gera JSON — mas só sob demanda |
| "Sincroniza documentação" | ❌ Stub | `doc-sync.ts` só copia artifacts — não faz sync real |
| "Base de conhecimento de padrões" | ✅ Real | `local-ai/knowledge-base.ts` com 101+ padrões de arquitetura/design/devops |
| "Aprende nova documentação" | ❌ Falso | Nada persiste entre sessões |
| "Auto-atualiza" | ❌ Falso | Só gera quando chamado explicitamente |

#### Reuso na IDE

| Uso | Como |
|-----|------|
| Gerar docs de API automaticamente | `doc-generator.ts` adaptado para endpoints detectados |
| Snapshot do projeto | `snapshot.ts` já pronto — saúde, governança, tarefas |
| Runbook de operações | `runbook-manager.ts` para documentar procedimentos |
| Base de padrões arquiteturais | `local-ai/knowledge-base.ts` como contexto para o chat |

---

### 2.5 Legado/Auditoria

**Localização:** `packages/cli/src/commands/audit.ts` (246 linhas)
**Localização adicional:** `packages/cli/src/commands/attest.ts` (116 linhas), `commands/compliance.ts` (181 linhas)
**Localização adicional:** `packages/cli/src/attestations/chain.ts` (160 linhas), `governance/governance-audit.ts` (20 linhas)
**Localização adicional:** `packages/cli/src/commands/audit-ledger.ts` (29 linhas)

#### Arquivos

| Arquivo | Linhas | Função | Real? | Persiste? |
|---------|--------|--------|-------|-----------|
| `commands/audit.ts` | 246 | Auditoria completa: 5 scripts, 7 policies, 3 critical files | ✅ | ✅ `.ai/reports/audit-YYYY-MM-DD.md` |
| `commands/attest.ts` | 116 | Atestações criptográficas HMAC-SHA256 | ✅ | ✅ `.ai/attestations/chain.jsonl` |
| `commands/compliance.ts` | 181 | Compliance em 5 frameworks (SOC2, PCI-DSS, GDPR, LGPD, ISO 27001) | ✅ | ✅ `.ai/reports/compliance/` |
| `commands/audit-ledger.ts` | 29 | Verificação de ledger | ✅ | ✅ delega para ledger.js |
| `attestations/chain.ts` | 160 | Blockchain de atestações: HMAC-SHA256, genesis block, chain validation | ✅ | ✅ `chain.jsonl` + `.ai/audit/secret` |
| `governance/governance-audit.ts` | 20 | `buildGovernanceAudit()` — factory de audit entry | ✅ | ❌ retorna objeto |
| `governance/document-audit.ts` | 143 | Auditoria de conflitos entre documentos | ✅ | ❌ computado |

#### O que é real vs mito

| Alegação | Real? | Evidência |
|----------|-------|-----------|
| "Audita o projeto" | ✅ Real | `audit.ts` executa 5 scripts, verifica políticas, salva relatório markdown |
| "Atestações criptográficas" | ✅ Real | `attestations/chain.ts` com HMAC-SHA256, chain validation, revogação |
| "Compliance em 5 frameworks" | ✅ Real | `compliance.ts` com map, check, report, gap, badges, import |
| "Ledger imutável" | ✅ Real | `audit-ledger.ts` + `ledger.js` verificam integridade |
| "Governança auditável" | ✅ Real | `governance-audit.ts` + `document-audit.ts` |

#### Estrutura da Cadeia de Atestação

```typescript
{
  id: string,
  timestamp: string,
  check_type: string,
  result: 'pass'|'fail'|'warn',
  details?: string,
  signature: string,            // HMAC-SHA256(current + prev)
  prev_signature: string,       // 'genesis' para o primeiro
  revoked?: boolean,
  revoke_reason?: string
}
```

#### Reuso na IDE

| Uso | Como |
|-----|------|
| Auditoria de ações do assistente | `governance-audit.ts` adaptado para registrar cada ação |
| Verificação de integridade | `attestations/chain.ts` para garantir que histórico não foi adulterado |
| Compliance do projeto | `compliance.ts` para verificar regras da IDE |
| Quality gate | `audit.ts` como pipeline de verificação pré-commit |

---

### 2.6 Aprendizado Adaptativo

**Localização:** O módulo mais distribuído — 4 subsistemas separados:

| Subsistema | Localização | Função | Persiste? |
|-----------|-------------|--------|-----------|
| **Adaptive** | `packages/cli/src/adaptive/` (9 arquivos) | Pattern store, analyzer, score, recommender, cycle controller | ❌ In-memory |
| **Memory** | `packages/cli/src/memory/` (8 arquivos) | Store, pattern detector, learning engine, policy adapter | ❌ In-memory |
| **Runtime Patterns** | `packages/cli/src/runtime/` (3 arquivos) | Pattern registry, observer, learner | 🟡 `pattern-learner.ts` persiste `.ai/memory/patterns.yaml` |
| **Autonomous** | `packages/cli/src/autonomous/` (8 arquivos) | Cycle controller, drift detector, self-correction engine | ❌ In-memory |
| **Acceleration** | `scripts/acceleration/` (14+ arquivos) | Engine, scheduler, feedback controller, anomaly detector | ✅ `.ai-devkit/` |

#### Adaptive Module (`adaptive/` — 9 arquivos)

| Arquivo | Linhas | Função | Real? |
|---------|--------|--------|-------|
| `adaptive-policy.ts` | 13 | Config: maxCycleRepetitions=3, minConfidenceForAutoAction=0.85 | ✅ |
| `pattern-types.ts` | 21 | `OperationalEvent`, `OperationalPattern` | ✅ |
| `pattern-store.ts` | 50 | `PatternStore` — in-memory events + patterns | ✅ |
| `pattern-analyzer.ts` | 75 | Analisa eventos: doc warnings, repair loops, blocked executions | ✅ |
| `adaptive-score.ts` | 20 | Calcula pesos adaptativos | ✅ |
| `recommendation-engine.ts` | 26 | Mapeia padrões → ações (generate, repair, sync, review, block, defer) | ✅ |
| `cycle-controller.ts` | 52 | Decide repeat/escalate/block baseado em recomendações | ✅ |
| `adaptive-report.ts` | 39 | Agrega tudo em relatório | ✅ |
| `commands/adaptive.ts` | 198 | CLI: events, analyze, recommend, cycle, report | ✅ |

#### Runtime Patterns (`runtime/` — 3 arquivos)

| Arquivo | Linhas | Função | Real? | Persiste? |
|---------|--------|--------|-------|-----------|
| `pattern-registry.ts` | 115 | 14 padrões built-in (Clean Architecture, Repository, Factory, DTO, etc.) | ✅ | ❌ In-memory |
| `pattern-observer.ts` | 154 | Escaneia conteúdo textual, infere padrões, gera recomendações | ✅ | ❌ Computado |
| `pattern-learner.ts` | 644 | Escaneia diretórios, componentes, commits, API patterns, test patterns | ✅ | ✅ `.ai/memory/patterns.yaml` |

#### Autonomous Module (`autonomous/` — 8 arquivos)

| Arquivo | Linhas | Função | Real? | Persiste? |
|---------|--------|--------|-------|-----------|
| `autonomous-types.ts` | 23 | `AutonomousCycle`, `DriftSignal`, `TrendSignal` | ✅ | ❌ |
| `cycle-controller.ts` | 19 | `startCycle()`, `endCycle()` | ✅ | ❌ |
| `drift-detector.ts` | 15 | `detectDrift(score, expected)` | ✅ | ❌ |
| `trend-analyzer.ts` | 14 | `analyzeTrend(values)` — primeiro vs último valor | ✅ | ❌ |
| `self-correction-engine.ts` | 23 | `createCorrectionAction()`, `applySelfCorrection()` | ✅ | ❌ |
| `maintenance-planner.ts` | 26 | `buildMaintenancePlan(drifts, trends)` | ✅ | ❌ |
| `continuity-guard.ts` | 23 | `createContinuityGuard(maxFailures)`, `recordCycleResult()` | ✅ | ❌ |
| `autonomous-report.ts` | 38 | `buildAutonomousReport()` — agrega tudo | ✅ | ❌ |

#### O que é real vs mito

| Alegação | Real? | Evidência |
|----------|-------|-----------|
| "Aprende padrões do projeto" | 🟡 Parcial | `pattern-learner.ts` (644 linhas) escaneia código real e persiste `.ai/memory/patterns.yaml` |
| "Se adapta automaticamente" | 🟡 Parcial | `cycle-controller.ts` decide repeat/escalate/block; `adaptive-scheduler.ts` muda modo baseado em histórico |
| "Auto-correção" | ✅ Real | `self-heal.js` move arquivos para lugares corretos via AST |
| "Feedback loop" | ✅ Real | `feedback-controller.ts` ajusta modo; `continuity-guard.ts` para após N falhas |
| "Usa IA para aprender" | ❌ Falso | 100% heurístico: regex, limiares, contagem de frequência |
| "Persiste aprendizado" | 🟡 Parcial | Só `pattern-learner.ts` persiste YAML; o resto perde ao reiniciar |

#### Algoritmo de Padrão (pattern-detector)

```typescript
function detectPatterns(records: MemoryRecord[]): MemoryPattern[] {
  // Conta frequência de cada tag
  // Filtra tags com count >= 2
  // Confiança = Math.min(1.0, 0.5 + count * 0.1)
}
```

#### Reuso na IDE

| Uso | Como |
|-----|------|
| Aprender atalhos e preferências do usuário | `pattern-learner.ts` adaptado para padrões de uso |
| Detectar padrões de código | `pattern-observer.ts` + `pattern-registry.ts` |
| Feedback loop de qualidade | `feedback-controller.ts` para ajustar comportamento da IA |
| Auto-correção de estrutura | `self-heal.js` para organização de arquivos |

---

## 3. Sistemas Transversais

### 3.1 Cognitive Coprocessor

**O módulo mais bem estruturado de todo o ai-devkit.**

**Localização:** `packages/cli/src/cognitive-coprocessor/` (11 arquivos, ~1.000 linhas)
**Status:** ✅ 100% implementado, zero stubs

#### Arquitetura de 8 Estágios

```
Entrada → normalize → metrics → inconsistencies → rank → simulate → validate → hints → context → Saída
                                                                                                      ↓
                                                                                              (formatted: markdown|json|llm-ready)
```

| Estágio | Arquivo | O que faz |
|---------|---------|-----------|
| 1. normalize | `normalize.ts` | Detecta anomalias, extrai features, valida schema |
| 2. metrics | `metrics.ts` | Média, mediana, stddev, percentis, tendência, distribuição |
| 3. inconsistencies | `inconsistencies.ts` | 3 estratégias: lógico, numérico, política |
| 4. rank | `rank.ts` | Prioriza por urgência(0.4) + impacto(0.35) + risco(0.25) |
| 5. simulate | `simulate.ts` | 3 modos: determinístico, heurístico, Monte Carlo |
| 6. validate | `validate.ts` | Estrutural + numérico + lógico, score 0-100 |
| 7. hints | `hints.ts` | 7 categorias de problema, hints específicos |
| 8. context | `context.ts` | Orquestrador: roda pipeline, formata output |

#### Padrão Middleware

```typescript
// integration.ts
coprocessBefore(input)   → retorna hints ANTES da chamada LLM
coprocessAfter(answer, input) → valida resposta DEPOIS da LLM
```

#### Reuso na IDE

| Uso | Como |
|-----|------|
| Processar entrada do chat antes de enviar ao LLM | `coprocessBefore()` normaliza, extrai features, gera hints |
| Validar resposta do LLM antes de mostrar | `coprocessAfter()` detecta inconsistências, calcula confiança |
| Simular cenários antes de executar | `simulate.ts` Monte Carlo para prever risco de mudanças |
| Ranking de prioridade | `rank.ts` para sugerir ordem de execução de tarefas |
| Métricas do projeto | `metrics.ts` para dashboards de qualidade |

---

### 3.2 Motor de Aceleração

**Localização:** `scripts/acceleration/` (14+ arquivos)
**Status:** ✅ Implementado, com persistência e feedback loop

#### Fluxo

```
health-check → diagnostics → pre-cycle → scorecard/gaps/maturity → AI decision → plan → execute → quality gate → alerts → delta → persist
```

| Componente | Função |
|------------|--------|
| `engine.ts` | Orquestrador principal (274 linhas) |
| `health-check.ts` | Verifica package.json, tsconfig, node_modules, git, .ai |
| `adaptive-scheduler.ts` | Muda modo (fast/balanced/deep) baseado em saúde + histórico |
| `feedback-controller.ts` | Ajusta modo baseado em sucesso/falha |
| `self-healing-loop.ts` | Retry com backoff exponencial |
| `retry-policy.ts` | Classifica erros como transient/structural/unknown |
| `guardrails.ts` | 5 regras: no-secrets, no-code-injection, no-sql-injection |
| `anomaly-detector.ts` | Z-score baseado em média/desvio padrão |

---

### 3.3 Orquestração de Fases

**Localização:** `packages/cli/src/runtime/` (vários arquivos)
**Status:** ✅ Implementado, com persistência em disco

| Componente | Função | Persiste? |
|------------|--------|-----------|
| `checkpoint-manager.ts` (390 linhas) | SHA-256, checkpoints, save/load state | ✅ `.ai/orchestration/` |
| `phase-orchestrator.ts` (520 linhas) | 9 fases, auto-replan, context change detection | ✅ via checkpoint-manager |
| `autonomy-policy.ts` (263 linhas) | Risco 6 fatores, autonomy level (blocked/guided/autonomous) | ❌ Computado |
| `unlock-engine.ts` (211 linhas) | Dependency resolution, parallel groups | ❌ Computado |
| `decision-center.ts` (206 linhas) | 4 opções (A/B/C/D), checklist 3+1 | ❌ Computado |

---

## 4. Fluxos Entre os Módulos

### 4.1 Fluxo Atual (como realmente é)

```
MEMORY (in-memory)          KNOWLEDGE (in-memory)         COGNITIVE (in-memory)
  memory-store.ts             knowledge-base.ts             normalize → metrics →
  ↓                           ↓                             inconsistencies → rank →
  pattern-detector            doc-generator.ts              simulate → validate →
  ↓                           ↓                             hints → context
  learning-engine             doc-sync.ts (STUB)
  ↓                                                         EXPLANATION (in-memory)
  policy-adapter                                           decision-trace →
                                                           explanation-engine →
ADAPTIVE (in-memory)                                        rationale-builder →
  pattern-store → pattern-analyzer →                        evidence-linker
  adaptive-score → recommendation-engine →
  cycle-controller                                         RISK (in-memory + file)
                                                             risk-model →
AUTONOMOUS (in-memory)                                       drift.ts → .ai/reports/
  cycle-controller → drift-detector →                       security.ts → .ai/security/
  trend-analyzer → self-correction →
  continuity-guard                                           AUDIT (file)
                                                             audit.ts → .ai/reports/
═══ LINHAS TRACEJADAS = NENHUMA INTEGRAÇÃO ═══              attest.ts → .ai/attestations/
                                                             compliance.ts → .ai/reports/

  ┌─────────────────────────────────────────────────────────────────────┐
  │                      NENHUMA SETA ENTRE OS MÓDULOS                  │
  │                                                                     │
  │  memory/ NÃO chama cognitive-coprocessor/                          │
  │  cognitive-coprocessor/ NÃO chama memory/                          │
  │  adaptive/ NÃO chama memory/                                       │
  │  autonomous/ NÃO chama adaptive/                                   │
  │  explanation/ NÃO chama memory/                                    │
  │  risk/ NÃO chama cognitive-coprocessor/                            │
  └─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Fluxo Ideal (o que deveria ser)

```
                   ┌──────────────────────────────────────┐
                   │         ENTRADA (Chat / CLI)          │
                   └──────────────┬───────────────────────┘
                                  │
                                  ▼
              ┌───────────────────────────────────┐
              │      COGNITIVE COPROCESSOR         │ ← hub central
              │  (normalize → metrics → rank →    │
              │   simulate → hints → context)      │
              └────────┬──────────┬───────────────┘
                       │          │
              ┌────────▼──┐  ┌───▼───────────┐
              │  MEMORY   │  │    RISK       │
              │  (persiste)│  │  (calcula)   │
              │  store →  │  │              │
              │  detect → │  │  drift →     │
              │  learn →  │  │  security →  │
              │  adapt    │  │  assess      │
              └────────┬──┘  └───┬──────────┘
                       │          │
              ┌────────▼──────────▼───────┐
              │     EXPLANATION ENGINE     │
              │  (explica cada decisão)   │
              └────────┬──────────────────┘
                       │
              ┌────────▼──────────┐
              │   DOCUMENTATION   │
              │  (gera docs vivas)│
              └────────┬──────────┘
                       │
              ┌────────▼──────────┐
              │   ADAPTIVE LOOP   │
              │  (aprende, ajusta)│
              │  → feedback →    │
              │  → memory →      │
              │  → autonomous    │
              └────────┬──────────┘
                       │
              ┌────────▼──────────┐
              │   AUDIT/LEGACY    │
              │  (registra tudo)  │
              └──────────────────┘
```

### 4.3 Fluxos Que Existem (limitados)

| Fluxo | Origem → Destino | Como |
|-------|------------------|------|
| **Memory → Report** | `memory-store` → `memory-report.ts` | Pipeline completo dentro do mesmo módulo |
| **Knowledge → Doc** | `knowledge-base` → `doc-generator.ts` | `commands/docs.ts` orquestra |
| **Risk → Security** | `security/baseline` → `security/detector` | `commands/security.ts` combina |
| **Cognitive → Context** | `normalize` → `metrics` → ... → `context` | Pipeline de 8 estágios |
| **Adaptive → Cycle** | `pattern-store` → `pattern-analyzer` → ... → `cycle-controller` | Pipeline completo |
| **Autonomous → Drift** | `cycle-controller` → `drift-detector` → `trend-analyzer` | Pipeline completo |
| **Acceleration → Feedback** | `engine` → `feedback-controller` → `adaptive-scheduler` | Loop de feedback real |
| **Orchestration → Checkpoint** | `phase-orchestrator` → `checkpoint-manager` | Persistência de estado |

### 4.4 Fluxos Que Deveriam Existir (mas não existem)

| Fluxo | Por que é importante |
|-------|---------------------|
| **Cognitive → Memory** | Decisões do coprocessador deveriam ser registradas como memória |
| **Memory → Cognitive** | Histórico deveria alimentar hints e contexto do coprocessador |
| **Memory → Adaptive** | Padrões detectados deveriam alimentar o adaptive cycle |
| **Adaptive → Memory** | Decisões adaptativas deveriam ser persistidas como memória |
| **Explanation → Memory** | Explicações de decisões deveriam virar memória |
| **Risk → Cognitive** | Risco calculado deveria alimentar hint e validação |
| **Cognitive → Risk** | Métricas do coprocessador deveriam calibrar risco |
| **Autonomous → Memory** | Ciclos autônomos deveriam registrar resultados |
| **All → Audit** | Todas as decisões deveriam ser registradas no audit trail |
| **Acceleration → Adaptation** | Métricas do motor deveriam alimentar adaptive learning |

---

## 5. Lacunas de Integração

### 5.1 Ausência de Barramento de Eventos

| Lacuna | Impacto |
|--------|---------|
| Não há `EventEmitter` ou barramento | Cada módulo ignora o que os outros fazem |
| Não há hooks pós-ação | Módulo A não sabe que módulo B executou |
| Não há logging centralizado | Cada módulo loga separadamente (console.log) |
| Não há cache unificado | ContextStore, MemoryStore, PatternStore — 3 caches separados |

### 5.2 Ausência de Persistência Unificada

| Módulo | Estado | Problema |
|--------|--------|----------|
| MemoryStore | In-memory `MemoryRecord[]` | Perde tudo ao reiniciar |
| KnowledgeBase | In-memory `KnowledgeEntry[]` | Perde tudo ao reiniciar |
| ContextStore | In-memory `Map<string, ContextItem>` | Perde tudo ao reiniciar |
| PatternStore | In-memory `OperationalEvent[]` | Perde tudo ao reiniciar |
| ExplanationRegistry | In-memory `Explanation[]` | Perde tudo ao reiniciar |
| Autonomous state | In-memory variáveis | Perde tudo ao reiniciar |
| Adaptive state | In-memory variáveis | Perde tudo ao reiniciar |
| Risk assessments | In-memory `RiskAssessment[]` | Perde tudo ao reiniciar |

**Só persistem:** `pattern-learner.ts` (YAML), `snapshot.ts` (JSON), `drift.ts` (JSON), `security.ts` (JSONL), `attestations/chain.ts` (JSONL), `audit.ts` (markdown)

### 5.3 Ausência de Schema Compartilhado

| O que acontece | Problema |
|----------------|----------|
| `memory/` define `MemoryRecord` | Ninguém mais usa esse tipo |
| `cognitive-coprocessor/` define `ContextInfo` | Isolado no módulo |
| `adaptive/` define `OperationalEvent` | Não conversa com `MemoryRecord` |
| `autonomous/` define `DriftSignal` | Ignorado por `commands/drift.ts` |
| `context-store.ts` define `ContextItem` | Não importa de lugar nenhum |
| `knowledge/` define `KnowledgeEntry` | Duplicado em `local-ai/knowledge-base.ts` com campos diferentes |

### 5.4 Ausência de Ciclo de Vida Compartilhado

| Falta | Consequência |
|-------|-------------|
| Init unificado | Cada módulo precisa ser inicializado separadamente |
| Shutdown unificado | Nenhum módulo faz flush/save ao fechar |
| Health check unificado | Cada módulo tem sua própria métrica de saúde |
| Config centralizada | Configurações espalhadas (adaptive-policy.ts, transparency-policy.ts, context-store config, etc.) |

### 5.5 Ausência de LLM Real

| Módulo | Como deveria usar LLM | Como realmente funciona |
|--------|----------------------|-----------------------|
| Pattern Detector | "Identifique padrões neste código" | `confidence = min(1, 0.5 + count * 0.1)` |
| Learning Engine | "O que podemos aprender com isso?" | `confidence >= 0.8 ? 'apply' : 'monitor'` |
| Risk Assessment | "Qual o risco desta mudança?" | `score = likelihood * impact` |
| Explanation | "Explique por que esta decisão foi tomada" | Template string |
| Cognitive Hints | "Que hints seriam úteis?" | Keyword matching |
| Adaptive | "O comportamento está normal?" | Z-score simples |

---

## 6. Riscos

### 6.1 Riscos Técnicos

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|---------|-----------|
| 1 | **Silos de dados**: 5 stores in-memory incompatíveis | Certeza | 🔴 Crítico | Unificar em 1 store com schema único + persistência automática |
| 2 | **Perda de estado ao reiniciar**: 8 módulos perdem dados | Certeza | 🔴 Crítico | Adicionar `save()`/`load()` em todos os stores antes do MVP |
| 3 | **Sem barramento de eventos**: módulos não se comunicam | Certeza | 🔴 Crítico | Implementar EventEmitter + hook system |
| 4 | **Heurísticas frágeis**: decisões baseadas em limiares fixos | Alta | 🟡 Alto | Substituir por LLM calls ou calibrar com dados reais |
| 5 | **Sem testes de integração**: cada módulo testado isoladamente | Alta | 🟡 Alto | Adicionar testes de integração entre módulos |

### 6.2 Riscos de Arquitetura

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|---------|-----------|
| 6 | **Schema duplicado**: 4 definições de "KnowledgeEntry" | Certeza | 🟡 Alto | Unificar em `@ai-devkit/core` |
| 7 | **Cognitive Coprocessor subutilizado**: melhor módulo sem conexão com outros | Alta | 🟡 Alto | Torná-lo o hub central de processamento |
| 8 | **Pattern-learner.ts gigante (644 linhas)**: única fonte de persistência real | Média | 🟡 Médio | Extrair persistência para classe separada |
| 9 | **doc-sync.ts é stub**: ninguém percebeu | Média | 🟡 Médio | Implementar sync real ou remover |
| 10 | **Excesso de "inteligência" heurística**: usuário pode achar que é IA quando não é | Alta | 🟡 Médio | Documentar limitações; adicionar LLM real gradualmente |

### 6.3 Riscos de Negócio

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|---------|-----------|
| 11 | **Usuário espera IA real, mas recebe heurísticas** | Alta | 🔴 Crítico | Gerenciar expectativa: "smart defaults powered by rules" |
| 12 | **Investimento em unificação não priorizado** | Média | 🟡 Alto | Mostrar este documento para stakeholders |
| 13 | **Manter 4 sistemas de aprendizado paralelos** | Alta | 🟡 Médio | Consolidar em 1 antes de adicionar novos |

---

## 7. Recomendações para Unificação

### 7.1 Unificar Schema de Dados

Criar **tipos compartilhados** em `@ai-devkit/core` que todos os módulos importam:

```typescript
// @ai-devkit/core/types.ts
// Substitui: MemoryRecord, KnowledgeEntry, OperationalEvent, ContextItem, DecisionTrace

interface UnifiedRecord {
  id: string;
  timestamp: string;
  type: 'action' | 'decision' | 'pattern' | 'observation' | 'error' | 'metric' | 'drift';
  source: string;             // qual módulo gerou
  agent?: string;             // qual agente (ou 'user')
  summary: string;
  details?: Record<string, unknown>;
  tags: string[];
  severity?: 'info' | 'warning' | 'error' | 'critical';
  risk?: number;              // 0-100
  confidence?: number;        // 0-100
  contextIds?: string[];      // referências a outros records
}
```

### 7.2 Unificar Persistência

Criar **PersistentStore** que todo módulo usa:

```typescript
// @ai-devkit/core/store.ts
class PersistentStore {
  async append(record: UnifiedRecord): Promise<void>
  async search(query: StoreQuery): Promise<UnifiedRecord[]>
  async getByType(type: string): Promise<UnifiedRecord[]>
  async getByTimeRange(from: string, to: string): Promise<UnifiedRecord[]>
  async getStats(): Promise<StoreStats>
  async save(): Promise<void>          // flush para disco
  async load(): Promise<void>          // load do disco
  // persistência automática: save() a cada N records ou a cada X segundos
}
```

**Formato de persistência:** JSONL append-only (já usado por `attestations/chain.ts` — padrão comprovado).

### 7.3 Unificar Barramento de Eventos

```typescript
// @ai-devkit/core/bus.ts
class EventBus {
  emit(event: 'decision' | 'pattern_detected' | 'risk_assessed' | 'drift_detected' | 'memory_updated', data: UnifiedRecord): void
  on(event: string, handler: (data: UnifiedRecord) => void): void
  // todos os módulos ouvem e emitem
}
```

### 7.4 Centralizar no Cognitive Coprocessor

O `CognitiveCoprocessor` deve se tornar o **hub central**:

```
Entrada (chat, CLI, evento)
    │
    ▼
┌─────────────────────────────────────┐
│      COGNITIVE COPROCESSOR          │
│                                     │
│  normalize → metrics → rank →      │
│  simulate → validate → hints        │
│                                     │
│  ANTES da LLM: prepara contexto     │
│  DEPOIS da LLM: valida resposta     │
└────────┬────────────────────────────┘
         │
         ├──→ MemoryStore.append(record)      ← persiste
         ├──→ RiskEngine.assess(change)       ← calcula risco
         ├──→ ExplanationEngine.explain()     ← gera rationale
         ├──→ DocEngine.generate()            ← atualiza docs
         └──→ AuditTrail.append(entry)        ← registra tudo
```

### 7.5 Plano de Unificação em 4 Fases

#### Fase 1 — Fundação (semanas 1-3)

| Ação | Responsável | Esforço |
|------|-------------|---------|
| Criar `UnifiedRecord` em `@ai-devkit/core` | Backend | 2 dias |
| Implementar `PersistentStore` com JSONL | Backend | 3 dias |
| Implementar `EventBus` | Backend | 1 dia |
| Migrar `MemoryStore` para `PersistentStore` | Backend | 2 dias |
| Migrar `KnowledgeBase` para `PersistentStore` | Backend | 2 dias |
| Migrar `ContextStore` para `PersistentStore` | Backend | 2 dias |

**Resultado:** 3 stores unificadas em 1, dados persistem entre sessões.

#### Fase 2 — Integração Vertical (semanas 4-6)

| Ação | Responsável | Esforço |
|------|-------------|---------|
| Conectar `CognitiveCoprocessor` → `PersistentStore` | Backend | 3 dias |
| Conectar `PatternDetector` → `EventBus` | Backend | 2 dias |
| Conectar `RiskModel` → `EventBus` | Backend | 2 dias |
| Conectar `ExplanationEngine` → `PersistentStore` | Backend | 2 dias |
| Conectar `Adaptive` → `EventBus` | Backend | 3 dias |
| Conectar `Autonomous` → `PersistentStore` | Backend | 3 dias |

**Resultado:** Todos os módulos publicam e consomem eventos. Dados fluem entre módulos.

#### Fase 3 — Cognitive Hub (semanas 7-9)

| Ação | Responsável | Esforço |
|------|-------------|---------|
| `coprocessBefore()` lê de `PersistentStore` (memória recente) | Backend | 3 dias |
| `coprocessAfter()` escreve em `PersistentStore` (resultado) | Backend | 2 dias |
| `RankEngine` usa histórico de `PersistentStore` para calibrar pesos | Backend | 3 dias |
| `SimulateEngine` usa padrões passados para simular | Backend | 3 dias |
| `HintsEngine` consulta `PersistentStore` para hints contextuais | Backend | 2 dias |

**Resultado:** O coprocessador opera com contexto histórico completo.

#### Fase 4 — LLM Enhancement (semanas 10-12)

| Ação | Responsável | Esforço |
|------|-------------|---------|
| Substituir `detectPatterns()` heurístico por LLM call | Backend | 5 dias |
| Substituir `generateRecommendations()` heurístico por LLM | Backend | 3 dias |
| Substituir `buildRationale()` template por LLM | Backend | 3 dias |
| Substituir `assessRisk()` heurístico por LLM + histórico | Backend | 5 dias |
| Adicionar LLM ao `cognitive-coprocessor/simulate.ts` | Backend | 5 dias |

**Resultado:** Módulos inteligentes DE FATO usam IA, com fallback heurístico.

### 7.6 Roadmap Visual

```
Semana  1  2  3  4  5  6  7  8  9  10  11  12
       ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
F1     │█████████████│░░░░░░░░░░░│░░░░░░░░░░░│░░░░░░░░░░░│░░░░░░░░░░░│░░░░░░░░░░░│
       │ Persistent   │            │            │            │            │            │
       │ Store + Bus   │            │            │            │            │            │
F2     │░░░░░░░░░░░│█████████████│░░░░░░░░░░░│░░░░░░░░░░░│░░░░░░░░░░░│░░░░░░░░░░░│
       │            │ Integração   │            │            │            │            │
       │            │ vertical     │            │            │            │            │
F3     │░░░░░░░░░░░│░░░░░░░░░░░│█████████████│░░░░░░░░░░░│░░░░░░░░░░░│░░░░░░░░░░░│
       │            │            │ Cognitive    │            │            │            │
       │            │            │ Hub          │            │            │            │
F4     │░░░░░░░░░░░│░░░░░░░░░░░│░░░░░░░░░░░│██████████████████████████████████████│
       │            │            │            │ LLM Enhancement                   │
       └───────────┴───────────┴───────────┴───────────┴───────────┴───────────┘
                        12 semanas = ~84 dias-homem
```

---

## 8. Anexo: Mapa Completo de Arquivos

### 8.1 Memória Histórica (8 arquivos, 207 linhas)

| Caminho | Linhas | Tipo |
|---------|--------|------|
| `packages/cli/src/memory/memory-types.ts` | 46 | Types |
| `packages/cli/src/memory/memory-store.ts` | 36 | Class |
| `packages/cli/src/memory/memory-index.ts` | 13 | Function |
| `packages/cli/src/memory/pattern-detector.ts` | 22 | Function |
| `packages/cli/src/memory/learning-engine.ts` | 11 | Function |
| `packages/cli/src/memory/policy-adapter.ts` | 17 | Function |
| `packages/cli/src/memory/history-summarizer.ts` | 28 | Function |
| `packages/cli/src/memory/memory-report.ts` | 34 | Function |

### 8.2 Autoexplicação (9 arquivos, ~250 linhas)

| Caminho | Linhas | Tipo |
|---------|--------|------|
| `packages/cli/src/explanation/explanation-types.ts` | 28 | Types |
| `packages/cli/src/explanation/decision-trace.ts` | 19 | Function |
| `packages/cli/src/explanation/explanation-engine.ts` | 18 | Function |
| `packages/cli/src/explanation/rationale-builder.ts` | 34 | Function |
| `packages/cli/src/explanation/evidence-linker.ts` | 12 | Function |
| `packages/cli/src/explanation/explanation-registry.ts` | 72 | Class |
| `packages/cli/src/explanation/transparency-policy.ts` | 15 | Config |
| `packages/cli/src/explanation/explain-report.ts` | 33 | Function |
| `.ai/bin/cognitive-bridge.js` | 44 | Script |
| `packages/cli/src/commands/explain.ts` | 123 | CLI |

### 8.3 Previsão de Risco (7 arquivos, ~750 linhas)

| Caminho | Linhas | Tipo |
|---------|--------|------|
| `packages/cli/src/prediction/prediction-types.ts` | 42 | Types |
| `packages/cli/src/prediction/risk-model.ts` | 25 | Function |
| `packages/cli/src/prediction/risk-thresholds.ts` | 22 | Function |
| `packages/cli/src/commands/drift.ts` | 316 | CLI |
| `packages/cli/src/commands/risk.ts` | 98 | CLI |
| `packages/cli/src/commands/security.ts` | 216 | CLI |
| `packages/cli/src/autonomous/drift-detector.ts` | 15 | Function |

### 8.4 Documentação Viva (11 arquivos, ~1.250 linhas)

| Caminho | Linhas | Tipo |
|---------|--------|------|
| `packages/cli/src/knowledge/knowledge-types.ts` | 47 | Types |
| `packages/cli/src/knowledge/knowledge-base.ts` | 49 | Class |
| `packages/cli/src/knowledge/knowledge-curator.ts` | 11 | Function |
| `packages/cli/src/knowledge/knowledge-report.ts` | 27 | Function |
| `packages/cli/src/knowledge/lesson-capture.ts` | 17 | Function |
| `packages/cli/src/knowledge/runbook-manager.ts` | 18 | Function |
| `packages/cli/src/knowledge/doc-generator.ts` | 16 | Function |
| `packages/cli/src/knowledge/doc-sync.ts` | 15 | Function (STUB) |
| `packages/cli/src/local-ai/knowledge-base.ts` | 677 | Data + Functions |
| `packages/cli/src/commands/docs.ts` | 238 | CLI |
| `packages/cli/src/commands/snapshot.ts` | 258 | CLI |

### 8.5 Legado/Auditoria (6 arquivos, ~775 linhas)

| Caminho | Linhas | Tipo |
|---------|--------|------|
| `packages/cli/src/commands/audit.ts` | 246 | CLI |
| `packages/cli/src/commands/attest.ts` | 116 | CLI |
| `packages/cli/src/commands/compliance.ts` | 181 | CLI |
| `packages/cli/src/commands/audit-ledger.ts` | 29 | CLI |
| `packages/cli/src/attestations/chain.ts` | 160 | Class |
| `packages/cli/src/governance/governance-audit.ts` | 20 | Function |
| `packages/cli/src/governance/document-audit.ts` | 143 | Function |

### 8.6 Aprendizado Adaptativo (23 arquivos, ~2.100 linhas)

| Caminho | Linhas | Tipo |
|---------|--------|------|
| `packages/cli/src/adaptive/adaptive-policy.ts` | 13 | Config |
| `packages/cli/src/adaptive/pattern-types.ts` | 21 | Types |
| `packages/cli/src/adaptive/pattern-store.ts` | 50 | Class |
| `packages/cli/src/adaptive/pattern-analyzer.ts` | 75 | Function |
| `packages/cli/src/adaptive/adaptive-score.ts` | 20 | Function |
| `packages/cli/src/adaptive/recommendation-engine.ts` | 26 | Function |
| `packages/cli/src/adaptive/cycle-controller.ts` | 52 | Function |
| `packages/cli/src/adaptive/adaptive-report.ts` | 39 | Function |
| `packages/cli/src/adaptive/commands/adaptive.ts` | 198 | CLI |
| `packages/cli/src/runtime/pattern-registry.ts` | 115 | Class |
| `packages/cli/src/runtime/pattern-observer.ts` | 154 | Class |
| `packages/cli/src/runtime/pattern-learner.ts` | 644 | Class |
| `packages/cli/src/runtime/memory-analyzer.ts` | 70 | Function |
| `packages/cli/src/autonomous/autonomous-types.ts` | 23 | Types |
| `packages/cli/src/autonomous/cycle-controller.ts` | 19 | Function |
| `packages/cli/src/autonomous/drift-detector.ts` | 15 | Function |
| `packages/cli/src/autonomous/trend-analyzer.ts` | 14 | Function |
| `packages/cli/src/autonomous/self-correction-engine.ts` | 23 | Function |
| `packages/cli/src/autonomous/maintenance-planner.ts` | 26 | Function |
| `packages/cli/src/autonomous/continuity-guard.ts` | 23 | Function |
| `packages/cli/src/autonomous/autonomous-report.ts` | 38 | Function |
| `.ai/bin/self-heal.js` | 125 | Script |
| `.ai/bin/update-memory.js` | 63 | Script |

### 8.7 Cognitive Coprocessor (11 arquivos, ~1.000 linhas)

| Caminho | Linhas | Tipo |
|---------|--------|------|
| `packages/cli/src/cognitive-coprocessor/types.ts` | 219 | Types |
| `packages/cli/src/cognitive-coprocessor/index.ts` | 21 | Barrel |
| `packages/cli/src/cognitive-coprocessor/normalize.ts` | 94 | Function |
| `packages/cli/src/cognitive-coprocessor/metrics.ts` | 99 | Function |
| `packages/cli/src/cognitive-coprocessor/rank.ts` | 45 | Function |
| `packages/cli/src/cognitive-coprocessor/inconsistencies.ts` | 104 | Function |
| `packages/cli/src/cognitive-coprocessor/simulate.ts` | 107 | Function |
| `packages/cli/src/cognitive-coprocessor/validate.ts` | 87 | Function |
| `packages/cli/src/cognitive-coprocessor/hints.ts` | 104 | Function |
| `packages/cli/src/cognitive-coprocessor/context.ts` | 144 | Function |
| `packages/cli/src/cognitive-coprocessor/integration.ts` | 88 | Middleware |

### Total Geral

| Área | Arquivos | Linhas | % do Total |
|------|----------|--------|-----------|
| Memória Histórica | 8 | 207 | 3% |
| Autoexplicação | 9 | 250 | 4% |
| Previsão de Risco | 7 | 750 | 11% |
| Documentação Viva | 11 | 1.250 | 18% |
| Legado/Auditoria | 6 | 775 | 11% |
| Aprendizado Adaptativo | 23 | 2.100 | 30% |
| Cognitive Coprocessor | 11 | 1.000 | 14% |
| **Total** | **75** | **~6.332** | **100%** |

---

> **Documento gerado em:** 2026-07-13
> **Arquivos analisados:** 75 (em 6 módulos + 3 sistemas transversais)
> **Principais descobertas:** Módulos são reais mas não integrados; 0% usa LLM; 80% não persiste;
> Cognitive Coprocessor é a base ideal para unificação
> **Esforço estimado para unificação:** ~12 semanas / ~84 dias-homem
