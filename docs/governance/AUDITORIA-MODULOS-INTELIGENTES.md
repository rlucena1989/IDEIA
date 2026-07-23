# Auditoria dos MÃ³dulos Inteligentes â€” AI-Devkit v2

> **Gerado em:** 2026-07-13  
> **MÃ³dulos auditados:** memÃ³ria histÃ³rica, autoexplicaÃ§Ã£o, simulaÃ§Ã£o preditiva, documentaÃ§Ã£o viva, legado, aprendizado adaptativo  
> **Metodologia:** Leitura direta de cÃ³digo-fonte (85+ arquivos), anÃ¡lise de imports, verificaÃ§Ã£o de integraÃ§Ã£o entre mÃ³dulos

---

## SUMÃRIO EXECUTIVO

Os 6 mÃ³dulos inteligentes estÃ£o **implementados, testados e funcionais individualmente**, mas **completamente isolados entre si**. NÃ£o hÃ¡ uma Ãºnica chamada de importaÃ§Ã£o entre eles: `memory/` nÃ£o chama `explanation/`, `prediction/` nÃ£o usa `memory/`, `knowledge/` nÃ£o integra com `legacy/`, etc. Cada mÃ³dulo Ã© uma ilha autossuficiente.

HÃ¡ **dois sistemas paralelos de detecÃ§Ã£o de padrÃµes** que nÃ£o se comunicam:
- `memory/pattern-detector.ts` (tag-based, usado por `learn` e `patterns` commands)
- `adaptive/pattern-analyzer.ts` (event-based, usado pelo `adaptive` command)

**Nenhum dado Ã© persistido entre execuÃ§Ãµes do CLI.** Todos os 6 mÃ³dulos armazenam dados em arrays em memÃ³ria (`private records: T[] = []`), que sÃ£o perdidos quando o processo termina.

**GovernanÃ§a e auditoria existem apenas no plano conceitual** â€” hÃ¡ interfaces e polÃ­ticas definidas, mas nÃ£o hÃ¡ enforcement real (as verificaÃ§Ãµes de governanÃ§a usam `confidence >= 0.85` como Ãºnica regra).

---

## 1. MÃ“DULO: MEMÃ“RIA HISTÃ“RICA

### Arquivos existentes

| Arquivo | Linhas | ExportaÃ§Ãµes |
|---------|--------|-------------|
| `src/memory/memory-types.ts` | 46 | `MemoryRecord`, `MemoryPattern`, `LearningRecommendation`, `createMemoryRecord()` |
| `src/memory/memory-store.ts` | 36 | `MemoryStore` (append, list, findByCategory, findBySeverity, search, count, clear) |
| `src/memory/memory-index.ts` | 13 | `buildMemoryIndex()` â€” indexa por tags |
| `src/memory/pattern-detector.ts` | 22 | `detectPatterns()` â€” detecta recorrÃªncias (frequÃªncia â‰¥ 2) |
| `src/memory/learning-engine.ts` | 11 | `generateRecommendations()` â€” `apply_policy_tuning` vs `monitor_more` |
| `src/memory/policy-adapter.ts` | 17 | `adaptPolicy()` â€” `approved` se confianÃ§a â‰¥ 0.85 |
| `src/memory/history-summarizer.ts` | 28 | `summarizeHistory()` â€” total por categoria |
| `src/memory/memory-report.ts` | 34 | `buildMemoryReport()` â€” relatÃ³rio consolidado |
| `src/memory/__tests__/` | 4 | 12 testes |

### FunÃ§Ãµes/classes principais

| FunÃ§Ã£o | Entrada | SaÃ­da | LÃ³gica |
|--------|---------|-------|--------|
| `MemoryStore.append()` | `MemoryRecord` | `void` | Push em array |
| `MemoryStore.search(q)` | string | `MemoryRecord[]` | Filtro por summary + tags (case-insensitive) |
| `detectPatterns(records)` | `MemoryRecord[]` | `MemoryPattern[]` | Agrupa por tag, filtrando count â‰¥ 2 |
| `generateRecommendations(patterns)` | `MemoryPattern[]` | `LearningRecommendation[]` | `monitor_more` se confianÃ§a < 0.8, senÃ£o `apply_policy_tuning` |
| `adaptPolicy(name, change, confidence)` | string, string, number | `PolicyAdjustment` | Approved se confidence â‰¥ 0.85 |

### Comandos associados

| Comando | Subcomandos | Importa de |
|---------|-------------|------------|
| `memory` | list, query, export | `MemoryStore`, `createMemoryRecord`, `buildMemoryIndex` |
| `learn` | analyze, recommend, apply | `MemoryStore`, `detectPatterns`, `generateRecommendations`, `adaptPolicy` |
| `patterns` | detect, report, explain | `MemoryStore`, `detectPatterns`, `generateRecommendations`, `summarizeHistory`, `buildMemoryReport`, `adaptPolicy` |

### Testes

| Arquivo | Testes | O que cobre |
|---------|--------|-------------|
| `memory-store.test.ts` | 3 | append, findByCategory, search |
| `pattern-detector.test.ts` | 3 | empty input, frequency â‰¥ 2, confidence |
| `learning-engine.test.ts` | 3 | recommendations, confidence threshold |
| `policy-adapter.test.ts` | 3 | approve high, review low confidence |

### Entradas e saÃ­das

- **Entrada**: `MemoryRecord` (category, source, summary, tags, severity)
- **SaÃ­da**: `MemoryPattern[]` (patternId, name, frequency, confidence, description)
- **Formato**: Objetos tipados em memÃ³ria, sem serializaÃ§Ã£o

### PersistÃªncia

**NENHUMA.** `MemoryStore` usa `private records: MemoryRecord[] = []` â€” array em memÃ³ria. Dados sÃ£o perdidos ao final do processo CLI.

### IntegraÃ§Ã£o com outros mÃ³dulos

| MÃ³dulo | IntegraÃ§Ã£o | EvidÃªncia |
|--------|-----------|-----------|
| adaptive/ | âŒ Nenhuma | `memory/` nÃ£o importa `adaptive/` |
| explanation/ | âŒ Nenhuma | Nenhum import entre os mÃ³dulos |
| prediction/ | âŒ Nenhuma | Nenhum import entre os mÃ³dulos |
| knowledge/ | âŒ Nenhuma | Nenhum import entre os mÃ³dulos |
| legacy/ | âŒ Nenhuma | Nenhum import entre os mÃ³dulos |
| adaptive command | âŒ Nenhuma | `commands/adaptive.ts` usa `PatternStore` prÃ³prio |

### Riscos

| Risco | Impacto | DescriÃ§Ã£o |
|-------|---------|-----------|
| Volatilidade total | ALTO | Dados nÃ£o persistem entre execuÃ§Ãµes CLI |
| Isolamento | ALTO | PadrÃµes detectados nÃ£o alimentam prediction/ ou adaptive/ |
| Duplicidade de motor | MÃ‰DIO | `memory/pattern-detector.ts` e `adaptive/pattern-analyzer.ts` sÃ£o paralelos e incomunicÃ¡veis |

### DependÃªncias

- `crypto` (node:crypto) â€” para `randomUUID()` em `createMemoryRecord()`

### Lacunas

- âŒ PersistÃªncia em disco (JSON/YAML)
- âŒ IntegraÃ§Ã£o com prediction/ (memÃ³ria alimentaria previsÃµes)
- âŒ IntegraÃ§Ã£o com adaptive/ (padrÃµes detectados virariam eventos adaptativos)
- âŒ ExportaÃ§Ã£o para knowledge/ (liÃ§Ãµes aprendidas poderiam virar entradas de conhecimento)
- âŒ Sem `updatedAt` nos registros (append-only, sem ediÃ§Ã£o)

---

## 2. MÃ“DULO: AUTOEXPLICAÃ‡ÃƒO

### Arquivos existentes

| Arquivo | Linhas | ExportaÃ§Ãµes |
|---------|--------|-------------|
| `src/explanation/explanation-types.ts` | 29 | `DecisionTrace`, `Explanation`, `EvidenceLink` |
| `src/explanation/decision-trace.ts` | 18 | `createDecisionTrace()` |
| `src/explanation/explanation-engine.ts` | 17 | `explainDecision()` â€” gera Explanation a partir de DecisionTrace |
| `src/explanation/evidence-linker.ts` | 15 | `linkEvidence()` â€” mapeia sourceType + sourceRef |
| `src/explanation/rationale-builder.ts` | 35 | `buildRationale()` â€” separa facts de inferences |
| `src/explanation/transparency-policy.ts` | 16 | `TransparencyPolicy`, `DEFAULT_TRANSPARENCY_POLICY` |
| `src/explanation/explain-report.ts` | 28 | `buildExplainReport()` â€” relatÃ³rio |
| `src/explanation/explanation-registry.ts` | 75 | `ExplanationRegistry` (register, list, find, search, count, clear) |
| `src/explanation/__tests__/` | 4 | 11 testes |

### FunÃ§Ãµes/classes principais

| FunÃ§Ã£o | Entrada | SaÃ­da | LÃ³gica |
|--------|---------|-------|--------|
| `createDecisionTrace(input)` | decisionType, context, signals, policyApplied, outcome | `DecisionTrace` | Gera traceId + createdAt |
| `explainDecision(trace)` | `DecisionTrace` | `Explanation` | TÃ­tulo, resumo, detalhes, confidence=0.9 fixo |
| `linkEvidence(items)` | Array de {sourceType, sourceRef, description} | `EvidenceLink[]` | Gera evidenceId |
| `buildRationale(trace, evidence)` | `DecisionTrace`, `EvidenceLink[]` | `Rationale` | 3 facts + 2 inferences |
| `ExplanationRegistry.*` | VÃ¡rios | VÃ¡rios | Armazena traces, explanations, evidence, rationales |

### Comandos associados

| Comando | Subcomandos | Importa de |
|---------|-------------|------------|
| `explain` | decision, policy, block | `ExplanationRegistry`, `createDecisionTrace`, `explainDecision`, `buildRationale`, `linkEvidence` |
| `decision` | trace, show, export | `ExplanationRegistry`, `createDecisionTrace`, `explainDecision`, `buildRationale`, `linkEvidence`, `buildExplainReport` |
| `trace` | list, show, search | `ExplanationRegistry`, `createDecisionTrace`, `explainDecision` |

### Testes

| Arquivo | Testes | O que cobre |
|---------|--------|-------------|
| `decision-trace.test.ts` | 3 | createDecisionTrace, fields, empty signals |
| `explanation-engine.test.ts` | 2 | explainDecision, confidence, details |
| `evidence-linker.test.ts` | 3 | linkEvidence, multiple items, empty |
| `rationale-builder.test.ts` | 3 | buildRationale, facts/inferences, missing evidence |

### Entradas e saÃ­das

- **Entrada**: ParÃ¢metros de decisÃ£o (tipo, contexto, sinais, polÃ­tica, resultado)
- **SaÃ­da**: `Explanation` (tÃ­tulo, resumo, 4 detalhes, confidence=0.9 fixo)

### PersistÃªncia

**NENHUMA.** `ExplanationRegistry` usa arrays em memÃ³ria â€” `private traces: DecisionTrace[] = []`, etc.

### IntegraÃ§Ã£o com outros mÃ³dulos

| MÃ³dulo | IntegraÃ§Ã£o | EvidÃªncia |
|--------|-----------|-----------|
| memory/ | âŒ Nenhuma | ExplicaÃ§Ãµes nÃ£o sÃ£o registradas como memÃ³ria |
| prediction/ | âŒ Nenhuma | DecisÃµes nÃ£o alimentam previsÃµes |
| knowledge/ | âŒ Nenhuma | ExplicaÃ§Ãµes nÃ£o viram liÃ§Ãµes aprendidas |
| adaptive/ | âŒ Nenhuma | DecisÃµes viram eventos adaptativos |
| legacy/ | âŒ Nenhuma | ExplicaÃ§Ãµes nÃ£o sÃ£o preservadas |

### Riscos

| Risco | Impacto | DescriÃ§Ã£o |
|-------|---------|-----------|
| ExplicaÃ§Ãµes volÃ¡teis | ALTO | Perde-se todo o histÃ³rico de decisÃµes entre execuÃ§Ãµes |
| ConfianÃ§a fixa | MÃ‰DIO | `confidence: 0.9` Ã© hardcoded, nÃ£o reflete incerteza real |
| EvidÃªncias nÃ£o vinculadas | MÃ‰DIO | `evidenceIds: []` fica sempre vazio (ninguÃ©m popula) |

### DependÃªncias

- Nenhuma alÃ©m de TypeScript

### Lacunas

- âŒ ExplicaÃ§Ãµes nÃ£o alimentam `memory/` (decisÃµes deveriam virar `MemoryRecord`)
- âŒ ExplicaÃ§Ãµes nÃ£o alimentam `knowledge/` (liÃ§Ãµes aprendidas)
- âŒ `confidence: 0.9` fixo â€” nÃ£o reflete qualidade da decisÃ£o
- âŒ EvidÃªncias nunca sÃ£o populadas nos explanations (`evidenceIds: []`)
- âŒ Nenhuma auditoria externa (trace nÃ£o Ã© enviado para ledger)

---

## 3. MÃ“DULO: SIMULAÃ‡ÃƒO PREDITIVA

### Arquivos existentes

| Arquivo | Linhas | ExportaÃ§Ãµes |
|---------|--------|-------------|
| `src/prediction/prediction-types.ts` | 47 | `PredictionInput`, `PredictionResult`, `ImpactEstimate`, `createPredictionInput()` |
| `src/prediction/predictor-engine.ts` | 27 | `predictRisk()` |
| `src/prediction/risk-model.ts` | 28 | `assessRisk()` |
| `src/prediction/impact-estimator.ts` | 17 | `estimateImpact()` |
| `src/prediction/preventive-recommender.ts` | 22 | `recommendPrevention()` |
| `src/prediction/risk-thresholds.ts` | 19 | `RiskThresholds`, `DEFAULT_RISK_THRESHOLDS`, `evaluateRiskLevel()` |
| `src/prediction/scenario-forecaster.ts` | 37 | `forecastHorizon()` |
| `src/prediction/prediction-report.ts` | 27 | `buildPredictionReport()` |
| `src/prediction/__tests__/` | 4 | 16 testes |

### FunÃ§Ãµes/classes principais

| FunÃ§Ã£o | Entrada | SaÃ­da | LÃ³gica |
|--------|---------|-------|--------|
| `predictRisk(input)` | histÃ³rico, drift, alertas, falhas | `PredictionResult` | `riskValue = drift + alertsÃ—2 + failuresÃ—3` |
| `assessRisk(subject, likelihood, impact)` | string, score(0-10), score(0-10) | `RiskAssessment` | Score = likelihood Ã— impact |
| `estimateImpact(target, area, score)` | string, string, number | `ImpactEstimate` | Severidade por faixas (<3, <6, <8, >=8) |
| `recommendPrevention(prediction)` | `PredictionResult` | `string[]` | 4 nÃ­veis de aÃ§Ã£o |
| `forecastHorizon(size, strength)` | number, number | `ForecastHorizon[]` | Short/medium/long com confianÃ§a decrescente |

### Comandos associados

| Comando | Subcomandos | ObservaÃ§Ã£o |
|---------|-------------|------------|
| `predict` | run, validate, compare, **report** | `report` Ã© da Fase 28; run/validate/compare sÃ£o da Fase 19 (simulation/) |
| `risk` | assess, list, watch | Thresholds configurÃ¡veis |
| `forecast` | run, trend, horizon | PrevisÃ£o + tendÃªncia + horizonte |

### Testes

| Arquivo | Testes | O que cobre |
|---------|--------|-------------|
| `predictor-engine.test.ts` | 4 | Low/critical risk, confidence |
| `risk-model.test.ts` | 3 | Low/critical, score product |
| `impact-estimator.test.ts` | 3 | Low/critical severity, reasoning |
| `preventive-recommender.test.ts` | 4 | 4 nÃ­veis de aÃ§Ã£o |

### Entradas e saÃ­das

- **Entrada**: Arrays numÃ©ricos (histÃ³rico, drift, alertas, falhas)
- **SaÃ­da**: RiskLevel (low|moderate|high|critical) + confianÃ§a + aÃ§Ãµes preventivas
- **Nota**: `predict report` e `forecast run` usam `Math.random()` para simular dados â€” **nÃ£o usam dados reais de memÃ³ria**

### PersistÃªncia

**NENHUMA.** PrevisÃµes sÃ£o calculadas sob demanda e perdidas ao final do processo.

### IntegraÃ§Ã£o com outros mÃ³dulos

| MÃ³dulo | IntegraÃ§Ã£o | EvidÃªncia |
|--------|-----------|-----------|
| memory/ | âŒ Nenhuma | `predictRisk()` aceita arrays, nÃ£o `MemoryStore` |
| explanation/ | âŒ Nenhuma | PrevisÃµes nÃ£o geram explicaÃ§Ãµes |
| knowledge/ | âŒ Nenhuma | PrevisÃµes nÃ£o viram entradas de conhecimento |
| adaptive/ | âŒ Nenhuma | PrevisÃµes nÃ£o alimentam ciclo adaptativo |
| legacy/ | âŒ Nenhuma | PrevisÃµes nÃ£o sÃ£o arquivadas |

### Riscos

| Risco | Impacto | DescriÃ§Ã£o |
|-------|---------|-----------|
| Dados simulados | ALTO | `predict report` e `forecast run` usam `Math.random()` â€” nÃ£o refletem realidade |
| Sem histÃ³rico real | ALTO | PredictionInput aceita arrays vazios sem validaÃ§Ã£o |
| IntegraÃ§Ã£o zero | ALTO | PrevisÃµes deveriam usar dados de `memory/` (drift, falhas histÃ³ricas) |

### DependÃªncias

- Nenhuma alÃ©m de TypeScript

### Lacunas

- âŒ PrevisÃµes nÃ£o usam dados reais de `memory/`
- âŒ PrevisÃµes nÃ£o geram `Explanation` nem `DecisionTrace`
- âŒ PrevisÃµes nÃ£o alimentam `knowledge/` como liÃ§Ãµes
- âŒ `forecast run` usa `Math.random()` â€” nÃ£o hÃ¡ dados histÃ³ricos reais
- âŒ Nenhum dado de alerta real â€” `alertCount` Ã© sempre simulado

---

## 4. MÃ“DULO: DOCUMENTAÃ‡ÃƒO VIVA

### Arquivos existentes

| Arquivo | Linhas | ExportaÃ§Ãµes |
|---------|--------|-------------|
| `src/knowledge/knowledge-types.ts` | 60 | `KnowledgeEntry`, `LessonLearned`, `DocumentationArtifact`, `createKnowledgeEntry()` |
| `src/knowledge/knowledge-base.ts` | 50 | `KnowledgeBase` (upsert, remove, list, findByCategory, findByStatus, search, count, clear) |
| `src/knowledge/doc-generator.ts` | 24 | `generateMarkdownDocs()`, `buildDocumentationArtifact()` |
| `src/knowledge/runbook-manager.ts` | 30 | `buildRunbook()`, `buildRunbookSections()` |
| `src/knowledge/lesson-capture.ts` | 18 | `captureLesson()` |
| `src/knowledge/knowledge-curator.ts` | 14 | `curateKnowledge()` â€” remove duplicidades e obsoletos |
| `src/knowledge/doc-sync.ts` | 16 | `syncDocumentation()` |
| `src/knowledge/knowledge-report.ts` | 28 | `buildKnowledgeReport()` |
| `src/knowledge/__tests__/` | 4 | 12 testes |

### FunÃ§Ãµes/classes principais

| FunÃ§Ã£o | Entrada | SaÃ­da | LÃ³gica |
|--------|---------|-------|--------|
| `KnowledgeBase.upsert(entry)` | `KnowledgeEntry` | void | FindById + update ou push |
| `KnowledgeBase.search(query)` | string | `KnowledgeEntry[]` | Case-insensitive em title, content, tags |
| `generateMarkdownDocs(entries)` | `KnowledgeEntry[]` | string (markdown) | `# Documentation Snapshot` + seÃ§Ãµes |
| `buildRunbook(entries)` | `KnowledgeEntry[]` | string | Lista markdown de entradas ativas |
| `captureLesson(input)` | summary, context, outcome, recommendation | `LessonLearned` | Gera lessonId + timestamp |
| `curateKnowledge(entries)` | `KnowledgeEntry[]` | `KnowledgeEntry[]` | Remove duplicatas (category:title) e obsoletos |

### Comandos associados

| Comando | Subcomandos | Origem |
|---------|-------------|--------|
| `knowledge` | query, show, list, add, stats (Fase 19) + **export** (Fase 29) | Misto |
| `docs` | resolve, audit, sources, policy, status (Fase 19) + **generate, sync, publish** (Fase 29) | Misto |
| `runbook` | **build, show, update** (Fase 29) | Novo |

### Testes

| Arquivo | Testes | O que cobre |
|---------|--------|-------------|
| `knowledge-base.test.ts` | 5 | Upsert, update, filter, search, remove |
| `doc-generator.test.ts` | 2 | Markdown generation, artifact creation |
| `runbook-manager.test.ts` | 3 | Build, skip obsolete, sections |
| `lesson-capture.test.ts` | 2 | Fields, recordedAt |

### Entradas e saÃ­das

- **Entrada**: `KnowledgeEntry` (8 categorias: incident, decision, policy, lesson, runbook, guide, faq, version-note)
- **SaÃ­da**: Markdown (documentaÃ§Ã£o), string (runbook), `DocumentationArtifact`

### PersistÃªncia

**NENHUMA.** `KnowledgeBase` usa `private entries: KnowledgeEntry[] = []` â€” array em memÃ³ria.

### IntegraÃ§Ã£o com outros mÃ³dulos

| MÃ³dulo | IntegraÃ§Ã£o | EvidÃªncia |
|--------|-----------|-----------|
| memory/ | âŒ Nenhuma | LiÃ§Ãµes poderiam vir de memÃ³ria, mas nÃ£o vÃªm |
| explanation/ | âŒ Nenhuma | ExplicaÃ§Ãµes poderiam virar KnowledgeEntry |
| prediction/ | âŒ Nenhuma | PrevisÃµes poderiam virar guias/runbooks |
| adaptive/ | âŒ Nenhuma | PadrÃµes poderiam documentar-se |
| legacy/ | âŒ Nenhuma | Conhecimento nÃ£o Ã© arquivado |

### Riscos

| Risco | Impacto | DescriÃ§Ã£o |
|-------|---------|-----------|
| Conhecimento volÃ¡til | ALTO | Entradas adicionadas via `runbook update` sÃ£o perdidas |
| `knowledge export` usa KB diferente | ALTO | Export usa `local-ai/knowledge-base.ts` (172 entries), nÃ£o `KnowledgeBase` vazio |
| Sem versionamento | MÃ‰DIO | `DocumentationArtifact.version` Ã© string livre, sem controle |

### DependÃªncias

- Nenhuma alÃ©m de TypeScript

### Lacunas

- âŒ `runbook update` adiciona a `KnowledgeBase` em memÃ³ria que Ã© perdida
- âŒ `knowledge export` usa fonte diferente (`local-ai/knowledge-base.ts` local, nÃ£o `knowledge/KnowledgeBase`)
- âŒ Nenhum hook para capturar liÃ§Ãµes automaticamente de outros mÃ³dulos
- âŒ Nenhuma persistÃªncia em disco (YAML/JSON)
- âŒ `docs generate` sempre gera documento vazio (KnowledgeBase local nunca Ã© populada)

---

## 5. MÃ“DULO: LEGADO

### Arquivos existentes

| Arquivo | Linhas | ExportaÃ§Ãµes |
|---------|--------|-------------|
| `src/legacy/legacy-types.ts` | 23 | `LegacyState`, `ArchiveBundle`, `RestorationPlan` |
| `src/legacy/freeze-manager.ts` | 18 | `freezeLegacy()` |
| `src/legacy/preservation-vault.ts` | 18 | `PreservationVault` (store, list, count, clear) |
| `src/legacy/archive-manager.ts` | 24 | `archiveItems()`, `verifyArchive()` |
| `src/legacy/shutdown-coordinator.ts` | 18 | `shutdownSystem()`, `confirmShutdown()` |
| `src/legacy/restoration-plan.ts` | 26 | `buildRestorationPlan()`, `validateRestoration()` |
| `src/legacy/legacy-policy.ts` | 16 | `LegacyPolicy`, `DEFAULT_LEGACY_POLICY` |
| `src/legacy/final-audit.ts` | 16 | `runFinalAudit()` |
| `src/legacy/legacy-report.ts` | 31 | `buildLegacyReport()` |
| `src/legacy/__tests__/` | 4 | 14 testes |

### FunÃ§Ãµes/classes principais

| FunÃ§Ã£o | Entrada | SaÃ­da | LÃ³gica |
|--------|---------|-------|--------|
| `freezeLegacy(items)` | `string[]` | `LegacyState` (status: 'frozen') |
| `PreservationVault.store(item)` | string | void | Push em array |
| `archiveItems(items)` | `string[]` | `ArchiveBundle` | Gera bundleId + checksum |
| `verifyArchive(bundle)` | `ArchiveBundle` | boolean | Compara checksum |
| `shutdownSystem(state)` | `LegacyState` | `LegacyState` (status: 'shutdown') |
| `buildRestorationPlan(reason, allowed)` | string, boolean | `RestorationPlan` | Passos condicionais |

### Comandos associados

| Comando | Subcomandos |
|---------|-------------|
| `legacy` | freeze, status, report |
| `archive` | create, list, verify |
| `shutdown` | run, confirm |
| `restore` | plan, validate, apply |

### Testes

| Arquivo | Testes | O que cobre |
|---------|--------|-------------|
| `freeze-manager.test.ts` | 3 | Freeze with/without items |
| `preservation-vault.test.ts` | 3 | Store, empty, clear |
| `archive-manager.test.ts` | 3 | Create, verify valid, verify tampered |
| `shutdown-coordinator.test.ts` | 4 | Shutdown, confirm |

### Entradas e saÃ­das

- **Entrada**: Listas de strings (itens a preservar/arquivar)
- **SaÃ­da**: `LegacyState`, `ArchiveBundle`, `RestorationPlan`, `FinalAuditEntry[]`

### PersistÃªncia

**NENHUMA.** `PreservationVault` usa `private items: string[] = []`.

### IntegraÃ§Ã£o com outros mÃ³dulos

| MÃ³dulo | IntegraÃ§Ã£o | EvidÃªncia |
|--------|-----------|-----------|
| memory/ | âŒ Nenhuma | Freeze nÃ£o persiste memÃ³ria real |
| explanation/ | âŒ Nenhuma | Archive nÃ£o arquiva explicaÃ§Ãµes reais |
| prediction/ | âŒ Nenhuma | Shutdown nÃ£o salva previsÃµes |
| knowledge/ | âŒ Nenhuma | PreservaÃ§Ã£o nÃ£o inclui conhecimento real |
| Todos | âŒ Nenhuma | `freeze --items` aceita strings arbitrÃ¡rias, nÃ£o objetos reais |

### DependÃªncias

- Nenhuma alÃ©m de TypeScript

### Lacunas

- âŒ `legacy freeze` nÃ£o congela dados reais dos outros mÃ³dulos â€” apenas nomes de itens
- âŒ `archive create` arquiva strings, nÃ£o objetos serializados
- âŒ `shutdown run` nÃ£o salva estado real em disco
- âŒ `restore apply` nÃ£o restaura nada â€” apenas imprime passos
- âŒ `final-audit` audita nomes de itens, nÃ£o conteÃºdo

---

## 6. MÃ“DULO: APRENDIZADO ADAPTATIVO

### Arquivos existentes

| Arquivo | Linhas | ExportaÃ§Ãµes |
|---------|--------|-------------|
| `src/adaptive/pattern-types.ts` | 21 | `OperationalEvent`, `OperationalPattern` |
| `src/adaptive/pattern-store.ts` | 50 | `PatternStore` (addEvent, createAndAddEvent, listEvents, setPatterns, listPatterns, clear) |
| `src/adaptive/pattern-analyzer.ts` | 75 | `analyzePatterns()` â€” detecta 4 tipos de padrÃ£o |
| `src/adaptive/adaptive-score.ts` | 20 | `computeAdaptiveScores()` |
| `src/adaptive/recommendation-engine.ts` | 26 | `recommendActions()` |
| `src/adaptive/cycle-controller.ts` | 52 | `controlCycle()` â€” decide repeat, escalate, stop |
| `src/adaptive/adaptive-policy.ts` | 13 | `AdaptivePolicy`, `DEFAULT_ADAPTIVE_POLICY` |
| `src/adaptive/adaptive-report.ts` | 39 | `buildAdaptiveReport()` |
| `src/adaptive/__tests__/` | 4 | test files |

### FunÃ§Ãµes/classes principais

| FunÃ§Ã£o | Entrada | SaÃ­da | LÃ³gica |
|--------|---------|-------|--------|
| `PatternStore.addEvent(event)` | `OperationalEvent` | void | Push |
| `PatternStore.createAndAddEvent(params)` | type, command, outcome | `OperationalEvent` | Factory + push |
| `analyzePatterns(events)` | `OperationalEvent[]` | `OperationalPattern[]` | 4 regras: inconsistentDocsâ‰¥3, repairLoopsâ‰¥2, blockedExecsâ‰¥3, failedGensâ‰¥2 |
| `computeAdaptiveScores(patterns)` | `OperationalPattern[]` | `AdaptiveScores` | Pesos baseados em critical/high count |
| `recommendActions(patterns)` | `OperationalPattern[]` | `Recommendation[]` | Priority = impact, action = recommendedAction |
| `controlCycle(recommendations, policy)` | `Recommendation[]`, `AdaptivePolicy` | `CycleControlResult` | Critical â†’ block, repeated repair â†’ review |

### PadrÃµes detectados (4)

| PadrÃ£o | Trigger | ConfianÃ§a | AÃ§Ã£o |
|--------|---------|-----------|------|
| InconsistÃªncia documental recorrente | â‰¥3 events consistency:warning | 0.87 | repair |
| Loop de reparo recorrente | â‰¥2 evolution:repair | 0.81 | review |
| Bloqueios frequentes | â‰¥3 blocked outcomes | 0.85 | review |
| Falhas de geraÃ§Ã£o | â‰¥2 generation:failed | 0.78 | repair |

### Comandos associados

| Comando | Subcomandos | Importa de |
|---------|-------------|------------|
| `adaptive` | (nÃ£o verificado em detalhe) | `PatternStore` |

### Testes

4 arquivos de teste no diretÃ³rio `src/adaptive/__tests__/`.

### Entradas e saÃ­das

- **Entrada**: `OperationalEvent[]` (type, command, outcome, scores)
- **SaÃ­da**: `AdaptiveReport` (eventCount, patterns, scores, recommendations, cycleControl)

### PersistÃªncia

**NENHUMA.** `PatternStore` usa arrays em memÃ³ria.

### IntegraÃ§Ã£o com outros mÃ³dulos

| MÃ³dulo | IntegraÃ§Ã£o | EvidÃªncia |
|--------|-----------|-----------|
| memory/ | âŒ Nenhuma | NÃ£o usa `MemoryStore` nem `detectPatterns()` |
| explanation/ | âŒ Nenhuma | DecisÃµes nÃ£o geram eventos adaptativos |
| prediction/ | âŒ Nenhuma | PrevisÃµes nÃ£o alimentam ciclo adaptativo |
| knowledge/ | âŒ Nenhuma | PadrÃµes nÃ£o geram documentaÃ§Ã£o |
| legacy/ | âŒ Nenhuma | Ciclo adaptativo nÃ£o Ã© preservado |

### Riscos

| Risco | Impacto | DescriÃ§Ã£o |
|-------|---------|-----------|
| Paralelo com memory/ | ALTO | `adaptive/pattern-analyzer.ts` duplica `memory/pattern-detector.ts` |
| Sem fonte de eventos | ALTO | NinguÃ©m populava o `PatternStore` com eventos reais (exceto `commands/adaptive.ts`) |
| AusÃªncia de CLI visÃ­vel | MÃ‰DIO | `adaptive` command existe mas nÃ£o aparece no `--help` principal (enterrado) |

### DependÃªncias

- `crypto` (node:crypto) â€” para `randomUUID()`

### Lacunas

- âŒ `adaptive/` nÃ£o importa `memory/` (deveria usar padrÃµes histÃ³ricos)
- âŒ `adaptive/` nÃ£o exporta para `prediction/` (padrÃµes deveriam alimentar previsÃµes)
- âŒ `adaptive/` nÃ£o exporta para `knowledge/` (padrÃµes deveriam virar liÃ§Ãµes)
- âŒ `adaptive/` nÃ£o exporta para `legacy/` (padrÃµes deveriam ser preservados)
- âŒ `memory/pattern-detector.ts` e `adaptive/pattern-analyzer.ts` duplicam esforÃ§o

---

## 7. MAPA DOS MÃ“DULOS INTELIGENTES

```
+------------------+     +-------------------+
|    MEMÃ“RIA       |     |   ADAPTATIVO      |
|  (memory/)       |     |  (adaptive/)      |
|                  |     |                   |
| MemoryStore      |     | PatternStore      |
| detectPatterns() |     | analyzePatterns() |
| learning-engine  |     | recommendation    |
| policy-adapter   |     | cycle-controller  |
+--------+---------+     +--------+----------+
         |                         |
         | (nenhuma integraÃ§Ã£o)    | (nenhuma integraÃ§Ã£o)
         v                         v
+------------------+     +-------------------+
|   AUTOEXPLICAÃ‡ÃƒO |     |   PREVISÃƒO        |
|  (explanation/)  |     |  (prediction/)    |
|                  |     |                   |
| DecisionTrace    |     | predictRisk()     |
| explainDecision  |     | assessRisk()      |
| evidence-linker  |     | forecastHorizon() |
| rationale        |     | preventRecommender|
+--------+---------+     +--------+----------+
         |                         |
         | (nenhuma integraÃ§Ã£o)    | (nenhuma integraÃ§Ã£o)
         v                         v
+------------------+     +-------------------+
| DOCUMENTAÃ‡ÃƒO     |     |   LEGADO          |
|  (knowledge/)    |     |  (legacy/)        |
|                  |     |                   |
| KnowledgeBase    |     | freezeLegacy()    |
| doc-generator    |     | PreservationVault |
| runbook-manager  |     | archiveManager    |
| lesson-capture   |     | shutdownSystem    |
+------------------+     +-------------------+

        TODOS OS MÃ“DULOS SÃƒO SILOS ISOLADOS
        NENHUM IMPORTA DE OUTRO MÃ“DULO INTELIGENTE
```

---

## 8. LISTA DE INCONSISTÃŠNCIAS

### Entre mÃ³dulos inteligentes

| # | Severidade | InconsistÃªncia | MÃ³dulos envolvidos |
|---|------------|----------------|--------------------|
| I1 | ðŸ”´ CRÃTICA | Zero integraÃ§Ã£o entre mÃ³dulos â€” 6 ilhas isoladas | Todos |
| I2 | ðŸ”´ CRÃTICA | Dois motores de pattern detection paralelos e incomunicÃ¡veis | `memory/` vs `adaptive/` |
| I3 | ðŸ”´ CRÃTICA | `knowledge/commands/knowledge.ts` usa `local-ai/knowledge-base.ts` (172 entries), enquanto `knowledge/KnowledgeBase` local Ã© sempre vazia | `knowledge/` vs `local-ai/` |
| I4 | ðŸŸ  ALTA | `prediction/` usa `Math.random()` para simular dados em vez de consultar `memory/` | `prediction/` vs `memory/` |

### Entre comandos e mÃ³dulos

| # | Severidade | InconsistÃªncia | Detalhe |
|---|------------|----------------|---------|
| I5 | ðŸŸ  ALTA | `patterns.ts` e `learn.ts` usam `memory/`, mas `adaptive.ts` nÃ£o | Dois pipelines paralelos |
| I6 | ðŸŸ¡ MÃ‰DIA | `runbook update` adiciona entradas volÃ¡teis perdidas no prÃ³ximo comando | `commands/runbook.ts` |
| I7 | ðŸŸ¡ MÃ‰DIA | `knowledge export` exporta 172 entries (`local-ai/`), `docs generate` gera 0 entries (`knowledge/`) | `commands/knowledge.ts` vs `commands/docs.ts` |

### De governanÃ§a

| # | Severidade | InconsistÃªncia | Detalhe |
|---|------------|----------------|---------|
| I8 | ðŸŸ¡ MÃ‰DIA | `TransparencyPolicy` define regras mas nenhum cÃ³digo as verifica | SÃ³ documentaÃ§Ã£o |
| I9 | ðŸŸ¡ MÃ‰DIA | `LegacyPolicy` bloqueia mudanÃ§as estruturais mas nÃ£o hÃ¡ enforcement real | SÃ³ constante |
| I10 | ðŸŸ¡ MÃ‰DIA | `DEFAULT_LEGACY_POLICY.allowStructuralChanges = false` â€” mas nÃ£o hÃ¡ cÃ³digo que impeÃ§a | SÃ³ valor |

---

## 9. LISTA DE DADOS FALTANTES

| # | Dado faltante | Onde deveria estar | Para que serviria |
|---|---------------|-------------------|-------------------|
| D1 | HistÃ³rico real de drift/falhas | `prediction/` viria de `memory/` | PrevisÃµes reais vs simuladas |
| D2 | Eventos adaptativos reais | `adaptive/` viria de `memory/` + comandos | Ciclo adaptativo real |
| D3 | LiÃ§Ãµes aprendidas | `knowledge/` viria de `explanation/` | DocumentaÃ§Ã£o automÃ¡tica |
| D4 | ExplicaÃ§Ãµes das decisÃµes | `memory/` viria de `explanation/` | Rastreabilidade |
| D5 | Artefatos preservados reais | `legacy/` viria de todos os mÃ³dulos | Backup real |
| D6 | SerializaÃ§Ã£o em disco | Todos os mÃ³dulos | PersistÃªncia entre execuÃ§Ãµes |
| D7 | IDs de evidÃªncia preenchidos | `explanation/` (`evidenceIds: []`) | Rastreabilidade |

---

## 10. RASTREABILIDADE ENTRE DECISÃƒO, EXPLICAÃ‡ÃƒO, EVIDÃŠNCIA E AÃ‡ÃƒO

### Estado atual

```
DecisÃ£o â”€â”€â†’ (explicaÃ§Ã£o gerada, mas nÃ£o registrada como memÃ³ria)
ExplicaÃ§Ã£o â”€â”€â†’ (evidenceIds sempre vazio, sem vÃ­nculo real)
EvidÃªncia â”€â”€â†’ (linkEvidence() cria objetos, mas ninguÃ©m os consome)
AÃ§Ã£o â”€â”€â†’ (recommendPrevention() sugere aÃ§Ãµes, mas ninguÃ©m as executa automaticamente)
```

### Cadeia ideal (nÃ£o implementada)

```
DecisÃ£o â”€â”€â†’ DecisionTrace â”€â”€â†’ explainDecision() â”€â”€â†’ Explanation
  â”‚                              â”‚
  â”‚                              â””â”€â”€ evidenceIds â”€â”€â†’ EvidenceLink
  â”‚                                                    â”‚
  â””â”€â”€ MemoryRecord (category: 'decision') â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚
        â”œâ”€â”€ detectPatterns() â”€â”€â†’ MemoryPattern â”€â”€â†’ LearningRecommendation â”€â”€â†’ adaptPolicy()
        â”‚
        â”œâ”€â”€ predictRisk() â”€â”€â†’ PredictionResult â”€â”€â†’ recommendPrevention()
        â”‚
        â”œâ”€â”€ captureLesson() â”€â”€â†’ LessonLearned â”€â”€â†’ KnowledgeEntry
        â”‚
        â””â”€â”€ freezeLegacy() â”€â”€â†’ PreservatonVault (em disco)
```

---

## 11. RECOMENDAÃ‡Ã•ES PARA UI/CHAT

### O que jÃ¡ pode ser usado imediatamente

| Funcionalidade | API | Formato | UI sugerida |
|---------------|-----|---------|-------------|
| `memory list/query/export` | JSON via envelope | `{ data: { records: [...] } }` | Timeline/memÃ³ria visual com filtros |
| `explain decision/block` | JSON via envelope | `{ data: { trace, explanation } }` | Modal de decisÃ£o com detalhes |
| `decision trace/show/export` | JSON via envelope | `{ data: { trace, rationale } }` | Ãrvore de decisÃ£o expandÃ­vel |
| `risk assess/list` | JSON via envelope | `{ data: { risk, score } }` | Dashboard de risco semafÃ³rico |
| `forecast run/horizon` | JSON via envelope | `{ data: { prediction, horizons } }` | GrÃ¡fico de confianÃ§a temporal |
| `knowledge export` | JSON + markdown | `{ data: { markdown } }` | DocumentaÃ§Ã£o renderizada |
| `runbook build/show` | JSON + markdown | `{ data: { runbook, sections } }` | Manual visual por categoria |
| `archive create/list/verify` | JSON | `{ data: { bundle, checksum } }` | Gerenciador de pacotes |
| `legacy freeze/status/report` | JSON | `{ data: { state, audit } }` | Painel de status do legado |

### O que precisa de adaptaÃ§Ã£o para UI

| Funcionalidade | Problema | SoluÃ§Ã£o |
|---------------|----------|---------|
| `learn analyze/recommend` | Usa `--seed` para dados de exemplo | Conectar a dados reais de `memory/` |
| `predict report` | Usa `Math.random()` | Conectar a `memory/` para dados histÃ³ricos |
| `docs generate` | Sempre gera vazio (KnowledgeBase local vazia) | Unificar `local-ai/` e `knowledge/` |
| `runbook update` | Dados volÃ¡teis (perdidos entre sessÃµes) | Adicionar persistÃªncia JSON |

### RecomendaÃ§Ãµes de UX

1. **Dashboard de inteligÃªncia**: Combinar `legacy status` (estado geral), `risk list` (riscos ativos), `memory list` (Ãºltimos eventos), `forecast horizon` (projeÃ§Ãµes)
2. **Timeline unificada**: `memory list` + `decision export` + `explain decision` â€” mostrar decisÃµes, explicaÃ§Ãµes e memÃ³ria em ordem cronolÃ³gica
3. **Ãrvore de rastreabilidade**: `decision show <id>` + `explain decision` â€” clicar em uma decisÃ£o e ver explicaÃ§Ã£o, evidÃªncias e aÃ§Ãµes relacionadas
4. **BotÃ£o "Preservar"**: Em qualquer tela, botÃ£o que chama `legacy freeze --items "current"` para preservar estado atual

---

## 12. RECOMENDAÃ‡Ã•ES PARA ORQUESTRAÃ‡ÃƒO HÃBRIDA

### IntegraÃ§Ã£o necessÃ¡ria

Para que os mÃ³dulos funcionem em um fluxo de orquestraÃ§Ã£o hÃ­brida (humano + IA), Ã© necessÃ¡rio conectar as 6 ilhas:

```
Orquestrador HÃ­brido (a implementar)
  â”‚
  â”œâ”€â”€ 1. memory/ â”€â”€â†’ alimenta prediction/ com dados histÃ³ricos reais
  â”œâ”€â”€ 2. prediction/ â”€â”€â†’ gera DecisionTrace para explanation/
  â”œâ”€â”€ 3. explanation/ â”€â”€â†’ registra MemoryRecord em memory/
  â”œâ”€â”€ 4. adaptive/ â”€â”€â†’ usa unified pattern detector (memory/ + adaptive/)
  â”œâ”€â”€ 5. knowledge/ â”€â”€â†’ captura liÃ§Ãµes de explanation/ + memory/
  â””â”€â”€ 6. legacy/ â”€â”€â†’ preserva snapshot de todos os mÃ³dulos
```

### Pipeline de ciclo completo (a implementar)

```
[Evento] â†’ memory/MemoryStore.append()
    â†’ memory/detectPatterns() â†’ adaptive/analyzePatterns()
    â†’ prediction/predictRisk() â†’ prediction/recommendPrevention()
    â†’ explanation/createDecisionTrace() â†’ explanation/explainDecision()
    â†’ knowledge/captureLesson() â†’ knowledge/KnowledgeBase.upsert()
    â†’ legacy/freezeLegacy() (periÃ³dico, preserva tudo)
```

### Pontos de intervenÃ§Ã£o humana

| Ponto | Gatilho | AÃ§Ã£o humana esperada |
|-------|---------|---------------------|
| Risco crÃ­tico | `predictRisk() â†’ riskLevel: 'critical'` | Revisar e autorizar contenÃ§Ã£o |
| Bloqueio frequente | `detectPatterns() â†’ pattern: blocked` | Revisar polÃ­tica |
| RecomendaÃ§Ã£o de baixa confianÃ§a | `recommendPrevention() â†’ confidence < 0.85` | Decidir se executa |
| Ajuste de polÃ­tica | `adaptPolicy() â†’ approved: false` | Aprovar ou rejeitar |
| Shutdown | `shutdownSystem()` | Confirmar encerramento |

### Gatilhos automÃ¡ticos vs manuais

| AÃ§Ã£o | AutomÃ¡tico? | CondiÃ§Ã£o |
|------|-------------|----------|
| Registrar memÃ³ria | âœ… Sempre | Todo comando relevante |
| Detectar padrÃµes | âœ… Sob demanda | `learn analyze` / `patterns detect` |
| Calcular risco | âœ… Sob demanda | `forecast run` / `predict report` |
| Gerar explicaÃ§Ã£o | âœ… Sob demanda | `explain decision` |
| Adaptar polÃ­tica | âŒ Requer aprovaÃ§Ã£o | `adaptPolicy() â†’ approved: true` sÃ³ com confidence â‰¥ 0.85 |
| Preservar legado | âŒ Manual | `legacy freeze` / `archive create` |
| Shutdown | âŒ Requer confirmaÃ§Ã£o | `shutdown run` â†’ `shutdown confirm` |
| Restaurar | âŒ Requer governanÃ§a | `restore apply` sÃ³ se `plan.allowed === true` |

---

## 13. RISCOS GLOBAIS DOS MÃ“DULOS INTELIGENTES

| Risco | Probabilidade | Impacto | DescriÃ§Ã£o |
|-------|---------------|---------|-----------|
| Dados simulados em produÃ§Ã£o | Alta | Alto | `prediction/` usa `Math.random()` â€” feedback falso |
| Perda de memÃ³ria entre sessÃµes | Certa | Alto | Todos os mÃ³dulos sÃ£o volÃ¡teis â€” sem persistÃªncia |
| DecisÃµes sem rastreabilidade | Alta | Alto | `EvidenceLink` nunca Ã© populado â€” cadeia quebrada |
| Duplicidade de pattern detection | Alta | MÃ©dio | `memory/` e `adaptive/` sÃ£o paralelos â€” resultados divergentes |
| GovernanÃ§a sem enforcement | Alta | MÃ©dio | PolÃ­ticas existem como constantes, ninguÃ©m as verifica |
| DocumentaÃ§Ã£o vazia | MÃ©dia | MÃ©dio | `docs generate` sempre vazio porque KnowledgeBase local nunca Ã© populada |

---

## 14. DEPENDÃŠNCIAS ENTRE MÃ“DULOS

### DependÃªncias atuais (via comandos)

```
commands/memory.ts    â†’ memory/
commands/learn.ts     â†’ memory/
commands/patterns.ts  â†’ memory/
commands/explain.ts   â†’ explanation/
commands/decision.ts  â†’ explanation/
commands/trace.ts     â†’ explanation/
commands/predict.ts   â†’ prediction/ (+ simulation/)
commands/risk.ts      â†’ prediction/
commands/forecast.ts  â†’ prediction/
commands/knowledge.ts â†’ knowledge/ (+ local-ai/)
commands/docs.ts      â†’ knowledge/
commands/runbook.ts   â†’ knowledge/
commands/legacy.ts    â†’ legacy/
commands/archive.ts   â†’ legacy/
commands/shutdown.ts  â†’ legacy/
commands/restore.ts   â†’ legacy/
commands/adaptive.ts  â†’ adaptive/
```

### DependÃªncias ideais (deveriam existir)

```
prediction/  â”€â”€â†’ memory/    (para dados histÃ³ricos reais)
adaptive/    â”€â”€â†’ memory/    (para padrÃµes unificados)
explanation/ â”€â”€â†’ memory/    (para registrar decisÃµes)
knowledge/   â”€â”€â†’ memory/    (para liÃ§Ãµes de padrÃµes)
knowledge/   â”€â”€â†’ explanation/ (para liÃ§Ãµes de decisÃµes)
legacy/      â”€â”€â†’ todos      (para preservar estado real)
```

---

## 15. CONCLUSÃƒO

Os 6 mÃ³dulos inteligentes estÃ£o **bem projetados individualmente** â€” cada um tem tipos claros, funÃ§Ãµes puras, testes e comandos CLI. O problema fundamental Ã© que **nÃ£o foram integrados entre si**.

### O que funciona bem

- âœ… Testes unitÃ¡rios para todos os mÃ³dulos (65 testes)
- âœ… Tipos e interfaces bem definidos
- âœ… FunÃ§Ãµes puras e testÃ¡veis
- âœ… CLI funcional para cada mÃ³dulo
- âœ… Envelope de saÃ­da padronizado (`createEnvelope()`)

### O que nÃ£o funciona

- âŒ Nenhuma integraÃ§Ã£o entre mÃ³dulos (6 ilhas)
- âŒ PersistÃªncia zero (dados volÃ¡teis)
- âŒ Dois sistemas de pattern detection paralelos
- âŒ PrevisÃµes usam dados simulados (`Math.random()`)
- âŒ Cadeia de rastreabilidade quebrada (evidenceIds sempre vazio)
- âŒ GovernanÃ§a declarativa sem enforcement

### Prioridade de correÃ§Ã£o

| Prioridade | AÃ§Ã£o | EsforÃ§o estimado |
|------------|------|-------------------|
| ðŸ”´ P1 | Adicionar persistÃªncia JSON a `memory/` e `knowledge/` | 4h |
| ðŸ”´ P2 | Unificar `memory/pattern-detector` e `adaptive/pattern-analyzer` | 8h |
| ðŸ”´ P3 | Conectar `prediction/` a `memory/` para dados reais | 4h |
| ðŸŸ  P4 | Conectar `explanation/` a `memory/` para registrar decisÃµes | 2h |
| ðŸŸ  P5 | Unificar `local-ai/KnowledgeEntry` e `knowledge/KnowledgeEntry` | 4h |
| ðŸŸ  P6 | Popular `evidenceIds` nas explicaÃ§Ãµes | 2h |
| ðŸŸ¡ P7 | Adicionar `memory/` como fonte para `adaptive/` | 4h |
| ðŸŸ¡ P8 | Conectar `knowledge/` a `explanation/` para liÃ§Ãµes | 2h |
| ðŸŸ¡ P9 | Fazer `legacy freeze` serializar estado real dos mÃ³dulos | 4h |
