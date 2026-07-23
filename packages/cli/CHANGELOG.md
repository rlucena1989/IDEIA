## 2026-07-22 â€” vundefined

## 2026-07-22 â€” vundefined

## 2026-07-13 — v2.4.0

# Changelog — @ideia/cli

## 1.0.0 (2026-07-09)

- Initial release
- 50+ CLI commands
- Scorecard v10 with 14 categories and 84 maturity items
- Decision Optimization Layer
- GitHub/GitLab integration
- VSCode extension support

## [Unreleased]

### Added

- **Fase 26 — Inteligência adaptativa por memória histórica** (8 arquivos, 3 comandos)
  - `memory/memory-types.ts` — interfaces `MemoryRecord`, `MemoryPattern`, `LearningRecommendation` + factory `createMemoryRecord()`
  - `memory/memory-store.ts` — classe `MemoryStore` com `append()`, `list()`, `findByCategory()`, `findBySeverity()`, `search()`, `count()`, `clear()`
  - `memory/memory-index.ts` — `buildMemoryIndex()` indexa por tags
  - `memory/pattern-detector.ts` — `detectPatterns()` detecta recorrências com confiança
  - `memory/learning-engine.ts` — `generateRecommendations()` converte padrões em ações
  - `memory/policy-adapter.ts` — `adaptPolicy()` ajusta política com governança (`approved` se confiança >= 0.85)
  - `memory/history-summarizer.ts` — `summarizeHistory()` consolida resumo por categoria
  - `memory/memory-report.ts` — `buildMemoryReport()` relatório completo
  - `commands/memory.ts` — subcomandos `list`, `query`, `export`
  - `commands/learn.ts` — subcomandos `analyze`, `recommend`, `apply`
  - `commands/patterns.ts` — subcomandos `detect`, `report`, `explain`
  - `memory/__tests__/` — 4 suites, 12 testes unitários (store, patterns, engine, adapter)

### Fixed

- `runtime/pattern-learner.ts` — Repository Pattern Auto-Learning (EV-13)
  - Directory structure analysis (depth, naming conventions, common prefixes)
  - File naming convention extraction (camelCase, kebab-case, PascalCase, snake_case by extension)
  - Component detection (Props, Hooks, Styles, test presence)
  - Commit pattern analysis (conventional commits, scopes)
  - Test pattern detection (framework, location, naming convention)
  - API route detection (method, path, auth, validation)
  - Auto-generated suggestions based on detected patterns
  - `suggestForContext()` for context-aware recommendations
  - `savePatterns()` for persistence to `.ai/memory/patterns.yaml`
  - `formatPatternReport()` for human-readable output
- `commands/learn.ts` extended: `learn-patterns` and `suggest` subcommands

### Fixed

- `commands/scorecard.ts`: `evalPipelineHealth()` — extracted complex IIFE into separate `runAllScripts()` function to fix TS parser cascading errors
- `commands/scorecard.ts`: Replaced `require("child_process")` with imported `spawnSync`

### Added

- `runtime/pipeline-orchestrator.ts` — Unified Optimizer Orchestration (EV-14)
  - Three pipeline modes: short (8 stages), full (12 stages), forensic (12 stages)
  - Auto-selection by task type and budget
  - `buildPipeline()`, `dryRunPipeline()`, `executeStages()`, `formatPipelineReport()`
  - `selectPipelineMode()`, `estimateTokensSaved()`, `modeLabel()`
- `commands/optimize.ts` extended:
  - `run --pipeline <mode>` — force pipeline mode
  - `explain <request-file> [--json]` — preview pipeline stages
  - `dry-run <request-file> [--pipeline <mode>] [--json]` — simulate pipeline
  - `status` — show available modes and quick reference
- `.ai/optimizer/schemas/pipeline-report.schema.json` — JSON Schema
- **Fase 27 — Autoexplicação e transparência decisional** (8 arquivos, 3 comandos, 4 testes)
  - `explanation/explanation-types.ts` — interfaces `DecisionTrace`, `Explanation`, `EvidenceLink`
  - `explanation/decision-trace.ts` — `createDecisionTrace()` factory com traceId e timestamp
  - `explanation/explanation-engine.ts` — `explainDecision()` gera explicação a partir da trilha
  - `explanation/evidence-linker.ts` — `linkEvidence()` vincula evidências por tipo
  - `explanation/rationale-builder.ts` — `buildRationale()` separa fatos de inferências
  - `explanation/transparency-policy.ts` — `TransparencyPolicy` + `DEFAULT_TRANSPARENCY_POLICY`
  - `explanation/explain-report.ts` — `buildExplainReport()` relatório consolidado
  - `explanation/explanation-registry.ts` — classe `ExplanationRegistry` com registro e busca
  - `commands/explain.ts` — subcomandos `decision`, `policy`, `block`
  - `commands/decision.ts` — subcomandos `trace`, `show`, `export`
  - `commands/trace.ts` — subcomandos `list`, `show`, `search`
  - `explanation/__tests__/` — 4 suites, 11 testes unitários
- **Fase 28 — Simulação preditiva e antecipação de risco** (8 arquivos, 3 comandos, 4 testes)
  - `prediction/prediction-types.ts` — interfaces `PredictionInput`, `PredictionResult`, `ImpactEstimate` + factory
  - `prediction/predictor-engine.ts` — `predictRisk()` calcula nível de risco com base em drift, alertas e falhas
  - `prediction/risk-model.ts` — `assessRisk()` classifica probabilidade/impacto e calcula score
  - `prediction/impact-estimator.ts` — `estimateImpact()` projeta severidade em área afetada
  - `prediction/preventive-recommender.ts` — `recommendPrevention()` sugere ações por nível de risco
  - `prediction/risk-thresholds.ts` — `RiskThresholds` + `DEFAULT_RISK_THRESHOLDS` + `evaluateRiskLevel()`
  - `prediction/scenario-forecaster.ts` — `forecastHorizon()` projeta confiança curto/médio/longo prazo
  - `prediction/prediction-report.ts` — `buildPredictionReport()` relatório consolidado
  - `commands/predict.ts` — novo subcomando `report`
  - `commands/risk.ts` — subcomandos `assess`, `list`, `watch`
  - `commands/forecast.ts` — subcomandos `run`, `trend`, `horizon`
  - `prediction/__tests__/` — 4 suites, 16 testes unitários
- **Fase 29 — Gestão de conhecimento operacional e documentação viva** (8 arquivos, 3 comandos, 4 testes)
  - `knowledge/knowledge-types.ts` — interfaces `KnowledgeEntry`, `LessonLearned`, `DocumentationArtifact` + factory
  - `knowledge/knowledge-base.ts` — classe `KnowledgeBase` com `upsert()`, `search()`, `list()`, `remove()`
  - `knowledge/doc-generator.ts` — `generateMarkdownDocs()` e `buildDocumentationArtifact()`
  - `knowledge/runbook-manager.ts` — `buildRunbook()` e `buildRunbookSections()`
  - `knowledge/lesson-capture.ts` — `captureLesson()` registra lições aprendidas
  - `knowledge/knowledge-curator.ts` — `curateKnowledge()` remove duplicidades e obsoletos
  - `knowledge/doc-sync.ts` — `syncDocumentation()` sincroniza artefatos
  - `knowledge/knowledge-report.ts` — `buildKnowledgeReport()` relatório consolidado
  - `commands/knowledge.ts` — novo subcomando `export`
  - `commands/docs.ts` — novos subcomandos `generate`, `sync`, `publish`
  - `commands/runbook.ts` — subcomandos `build`, `show`, `update`
  - `knowledge/__tests__/` — 4 suites, 12 testes unitários
- **Fase 30 — Encerramento total, modo legado e preservação final** (9 arquivos, 4 comandos, 4 testes)
  - `legacy/legacy-types.ts` — interfaces `LegacyState`, `ArchiveBundle`, `RestorationPlan`
  - `legacy/freeze-manager.ts` — `freezeLegacy()` congela capacidades principais
  - `legacy/preservation-vault.ts` — classe `PreservationVault` para guardar itens
  - `legacy/archive-manager.ts` — `archiveItems()` + `verifyArchive()` arquivamento com checksum
  - `legacy/shutdown-coordinator.ts` — `shutdownSystem()` + `confirmShutdown()` desligamento seguro
  - `legacy/restoration-plan.ts` — `buildRestorationPlan()` + `validateRestoration()` retorno controlado
  - `legacy/legacy-policy.ts` — `LegacyPolicy` + `DEFAULT_LEGACY_POLICY` (sem mudanças estruturais)
  - `legacy/final-audit.ts` — `runFinalAudit()` auditoria de itens preservados
  - `legacy/legacy-report.ts` — `buildLegacyReport()` relatório de encerramento
  - `commands/legacy.ts` — subcomandos `freeze`, `status`, `report`
  - `commands/archive.ts` — subcomandos `create`, `list`, `verify`
  - `commands/shutdown.ts` — subcomandos `run`, `confirm`
  - `commands/restore.ts` — subcomandos `plan`, `validate`, `apply`
  - `legacy/__tests__/` — 4 suites, 14 testes unitários
