# REALITY MANIFEST — IDEIA

> **Documento Mestre da Verdade do Projeto**
> Gerado automaticamente por `scripts/audit/regenerate-metrics.ts` em 2026-07-29 §ts§
> **Status:** ✅ Verified against codebase (292 packages com código real)

---

## Métricas Globais (recalculadas por script determinístico)

| Métrica | Valor | Fonte |
|---------|-------|-------|
| Packages com `src/` | 292 | `packages/*/package.json` |
| Packages total | 292 | `packages/*/package.json` |
| Arquivos de teste (`.test.ts(x)`) | 1565 | recurse `packages/` |
| LOC em `src/` (soma) | ~440083 | line count `packages/*/src` |
| TODO markers | 49 | regex `\bTODO\b` |
| FIXME markers | 14 | regex `\bFIXME\b` |
| HACK markers | 10 | regex `\bHACK\b` |
| `console.log` em `src/` | 184 | regex `console\.log\s*\(` |
| ADRs em `docs/adr/` (arquivos) | 34 | `readdirSync` |
| ADRs únicos | 29 | dedupe por título canônico |
| ADRs duplicados | 5 | (ver AC: remover duplicatas) |
| Comandos CLI (subcomandos distintos) | 345 | regex `.command('name'` em `packages/cli/src/commands` |
| Arquivos >500 linhas | 33 | line count `packages/*/src` |

---

## Packages Reais

| Package | Status | Tests | LOC | Dependências |
|---------|--------|-------|-----|-------------|
| `@ideia/a11y-scanner` | ✅ Real | 2 ✅ | ~540 | — |
| `@ideia/acceleration` | ✅ Real | 27 ✅ | ~6589 | — |
| `@ideia/acp` | ✅ Real | 1 ✅ | ~183 | zod, uuid |
| `@ideia/adapter-base` | ✅ Real | 2 ✅ | ~145 | contracts |
| `@ideia/adapter-dart` | ✅ Real | 2 ✅ | ~680 | adapter-base, contracts |
| `@ideia/adapter-elixir` | ✅ Real | 2 ✅ | ~413 | adapter-base, contracts |
| `@ideia/adapter-fastapi` | ✅ Real | 2 ✅ | ~550 | adapter-base, contracts |
| `@ideia/adapter-go` | ✅ Real | 2 ✅ | ~690 | adapter-base, contracts |
| `@ideia/adapter-haskell` | ✅ Real | 2 ✅ | ~420 | adapter-base, contracts |
| `@ideia/adapter-java` | ✅ Real | 2 ✅ | ~608 | adapter-base, contracts |
| `@ideia/adapter-kotlin` | ✅ Real | 2 ✅ | ~396 | adapter-base, contracts |
| `@ideia/adapter-nestjs` | ✅ Real | 2 ✅ | ~756 | ts-morph, adapter-base, contracts |
| `@ideia/adapter-php` | ✅ Real | 2 ✅ | ~471 | adapter-base, contracts |
| `@ideia/adapter-ruby` | ✅ Real | 2 ✅ | ~435 | adapter-base, contracts |
| `@ideia/adapter-scala` | ✅ Real | 2 ✅ | ~382 | adapter-base, contracts |
| `@ideia/adapter-swift` | ✅ Real | 2 ✅ | ~391 | adapter-base, contracts |
| `@ideia/adapter-typescript` | ✅ Real | 2 ✅ | ~561 | adapter-base |
| `@ideia/adapter-zig` | ✅ Real | 2 ✅ | ~479 | adapter-base, contracts |
| `@ideia/adaptive-compressor` | ✅ Real | 1 ✅ | ~971 | logger |
| `@ideia/adaptive-decomposer` | ✅ Real | 1 ✅ | ~130 | logger |
| `@ideia/adaptive-learning` | ✅ Real | 1 ✅ | ~729 | — |
| `@ideia/adaptive-thresholds` | ✅ Real | 1 ✅ | ~1252 | — |
| `@ideia/agent-benchmark` | ✅ Real | 10 ✅ | ~1054 | — |
| `@ideia/agent-coordinator` | ✅ Real | 1 ✅ | ~319 | agent-runtime, logger |
| `@ideia/agent-graph` | ✅ Real | 2 ✅ | ~481 | agent-runtime, checkpoint-engine, logger |
| `@ideia/agent-identity` | ✅ Real | 1 ✅ | ~167 | — |
| `@ideia/agent-memory` | ✅ Real | 1 ✅ | ~946 | logger |
| `@ideia/agent-memory-ext` | ✅ Real | 1 ✅ | ~112 | logger |
| `@ideia/agent-protocols` | ✅ Real | 1 ✅ | ~1042 | logger |
| `@ideia/agent-registry` | ✅ Real | 1 ✅ | ~1361 | logger |
| `@ideia/agent-router` | ✅ Real | 6 ✅ | ~340 | — |
| `@ideia/agent-runtime` | ✅ Real | 10 ✅ | ~5016 | policy-engine, audit-trail, memory-store, contracts, logger, llm-provider, @langchain/langgraph, @langchain/core |
| `@ideia/agent-specialization` | ✅ Real | 1 ✅ | ~542 | logger |
| `@ideia/ai-debug` | ✅ Real | 4 ✅ | ~514 | logger, llm-provider |
| `@ideia/ai-engineer` | ✅ Real | 1 ✅ | ~316 | agent-runtime, llm-provider, event-bus, logger, commander |
| `@ideia/ai-safety` | ✅ Real | 1 ✅ | ~624 | logger |
| `@ideia/ai-testing` | ✅ Real | 7 ✅ | ~908 | logger, llm-provider, prompt-economy, quality-gates |
| `@ideia/anomaly-detection` | ✅ Real | 1 ✅ | ~233 | logger |
| `@ideia/anomaly-detector` | ✅ Real | 1 ✅ | ~2246 | logger |
| `@ideia/api-sdk` | ✅ Real | 1 ✅ | ~771 | logger |
| `@ideia/api-server` | ✅ Real | 1 ✅ | ~829 | contracts, event-bus, health-check, logger, fastify, @fastify/cors, @fastify/helmet, @fastify/rate-limit |
| `@ideia/architecture-adr` | ✅ Real | 1 ✅ | ~50 | — |
| `@ideia/audit-exporter` | ✅ Real | 2 ✅ | ~189 | logger, audit-trail |
| `@ideia/audit-trail` | ✅ Real | 5 ✅ | ~1392 | contracts, logger |
| `@ideia/auth` | ✅ Real | 2 ✅ | ~459 | core-contributions |
| `@ideia/auto-adr` | ✅ Real | 6 ✅ | ~988 | event-bus, logger |
| `@ideia/autonomous-editor` | ✅ Real | 1 ✅ | ~131 | diff |
| `@ideia/autonomous-evolution-engine` | ✅ Real | 5 ✅ | ~1294 | event-bus, audit-trail, scope-isolation, auto-adr, logger, metrics-store |
| `@ideia/autonomy-controller` | ✅ Real | 4 ✅ | ~652 | — |
| `@ideia/autonomy-orchestrator` | ✅ Real | 1 ✅ | ~140 | logger, contracts |
| `@ideia/backend-logging` | ✅ Real | 1 ✅ | ~255 | — |
| `@ideia/bayesian-risk` | ✅ Real | 1 ✅ | ~1685 | logger |
| `@ideia/bhp` | ✅ Real | 6 ✅ | ~1308 | event-bus, audit-trail, logger |
| `@ideia/bias-detection` | ✅ Real | 1 ✅ | ~917 | logger, quality-gates |
| `@ideia/blueprint-engine` | ✅ Real | 1 ✅ | ~880 | logger |
| `@ideia/blueprint-scaffold` | ✅ Real | 1 ✅ | ~877 | logger |
| `@ideia/browser-agent` | ✅ Real | 1 ✅ | ~1105 | playwright |
| `@ideia/cache` | ✅ Real | 7 ✅ | ~821 | — |
| `@ideia/capability-matcher` | ✅ Real | 10 ✅ | ~1326 | — |
| `@ideia/capability-registry` | ✅ Real | 2 ✅ | ~587 | zod |
| `@ideia/checkpoint-engine` | ✅ Real | 3 ✅ | ~192 | — |
| `@ideia/cli` | ✅ Real | 793 ✅ | ~172010 | agent-runtime, audit-trail, contracts, logger, delivery-orchestrator, event-bus, feedback-pipeline, memory-store, observability-engine, policy-engine, profiles, config-engine, control-tower, safety-circuit, scope-isolation, bhp, continuity-engine, autonomous-evolution-engine, technology-radar, auto-adr, notification-system, onboarding-wizard, self-optimization-panel, metrics-store, slo-monitor, trace-registry, workflow-engine, adapter-base, chalk, commander, node-pty, ws, yaml, ora |
| `@ideia/cli-framework` | ✅ Real | 1 ✅ | ~182 | core-contributions, core-backend |
| `@ideia/client-sdk` | ✅ Real | 1 ✅ | ~79 | — |
| `@ideia/code-signing` | ✅ Real | 1 ✅ | ~505 | — |
| `@ideia/collaborative-editing` | ✅ Real | 1 ✅ | ~378 | logger, event-bus, rpc-messaging |
| `@ideia/command-system` | ✅ Real | 1 ✅ | ~361 | core-contributions |
| `@ideia/complex-system-erp` | ✅ Real | 1 ✅ | ~88 | logger |
| `@ideia/compliance` | ✅ Real | 1 ✅ | ~723 | zod, uuid |
| `@ideia/compliance-checker` | ✅ Real | 1 ✅ | ~1309 | logger, audit-trail |
| `@ideia/compliance-cli` | ✅ Real | 2 ✅ | ~229 | commander, logger, compliance, audit-trail, incident-manager, privacy |
| `@ideia/computer-use` | ✅ Real | 1 ✅ | ~602 | logger |
| `@ideia/confidence` | ✅ Real | 4 ✅ | ~257 | zod |
| `@ideia/config-engine` | ✅ Real | 7 ✅ | ~4122 | — |
| `@ideia/context-budget` | ✅ Real | 1 ✅ | ~188 | logger |
| `@ideia/context-builder` | ✅ Real | 8 ✅ | ~1952 | logger |
| `@ideia/context-pack-system` | ✅ Real | 2 ✅ | ~2852 | logger |
| `@ideia/context-provenance` | ✅ Real | 1 ✅ | ~922 | logger |
| `@ideia/continuity-engine` | ✅ Real | 1 ✅ | ~779 | event-bus, audit-trail, profiles, logger |
| `@ideia/contract-cdc` | ✅ Real | 8 ✅ | ~2023 | — |
| `@ideia/contracts` | ✅ Real | 6 ✅ | ~965 | dotenv, zod |
| `@ideia/control-tower` | ✅ Real | 1 ✅ | ~372 | safety-circuit, event-bus, audit-trail, profiles, logger |
| `@ideia/core` | ✅ Real | 2 ✅ | ~17 | — |
| `@ideia/core-backend` | ✅ Real | 2 ✅ | ~616 | core-contributions, backend-logging |
| `@ideia/core-contributions` | ✅ Real | 3 ✅ | ~765 | reflect-metadata, inversify |
| `@ideia/correction-oracle` | ✅ Real | 1 ✅ | ~197 | — |
| `@ideia/cost-benefit` | ✅ Real | 1 ✅ | ~74 | logger |
| `@ideia/cost-benefit-analyzer` | ✅ Real | 1 ✅ | ~825 | — |
| `@ideia/cqrs-bus` | ✅ Real | 9 ✅ | ~1252 | logger |
| `@ideia/cqrs-projections` | ✅ Real | 1 ✅ | ~1411 | logger |
| `@ideia/cross-shell` | ✅ Real | 1 ✅ | ~758 | — |
| `@ideia/custom-contributions` | ✅ Real | 1 ✅ | ~167 | core-contributions |
| `@ideia/data-inventory` | ✅ Real | 1 ✅ | ~129 | zod, uuid, logger |
| `@ideia/data-layer` | ✅ Real | 17 ✅ | ~5424 | — |
| `@ideia/deep-dives-engine` | ✅ Real | 1 ✅ | ~235 | logger |
| `@ideia/defense-loop` | ✅ Real | 1 ✅ | ~4244 | logger, security-pipeline |
| `@ideia/delivery-orchestrator` | ✅ Real | 8 ✅ | ~4862 | — |
| `@ideia/dependency-analyzer` | ✅ Real | 1 ✅ | ~664 | — |
| `@ideia/desktop` | ✅ Real | 1 ✅ | ~1148 | logger |
| `@ideia/desktop-tray-shortcuts` | ✅ Real | 1 ✅ | ~383 | — |
| `@ideia/desktop-updater` | ✅ Real | 1 ✅ | ~405 | — |
| `@ideia/devx-metrics` | ✅ Real | 1 ✅ | ~761 | logger |
| `@ideia/diff-engine` | ✅ Real | 4 ✅ | ~569 | yaml |
| `@ideia/distillation-engine` | ✅ Real | 2 ✅ | ~1083 | logger, llm-provider, finetuning-pipeline, data-layer |
| `@ideia/docs-generator` | ✅ Real | 1 ✅ | ~264 | — |
| `@ideia/dx-metrics` | ✅ Real | 3 ✅ | ~1051 | — |
| `@ideia/dynamic-agent-spawning` | ✅ Real | 1 ✅ | ~215 | logger |
| `@ideia/economic-control` | ✅ Real | 3 ✅ | ~444 | — |
| `@ideia/edge-runtime` | ✅ Real | 4 ✅ | ~703 | — |
| `@ideia/editor-core` | ✅ Real | 4 ✅ | ~1473 | core-contributions, command-system |
| `@ideia/editor-intelligence` | ✅ Real | 4 ✅ | ~960 | core-contributions, editor-core, markers-output |
| `@ideia/electron-theia-migration` | ✅ Real | 1 ✅ | ~554 | — |
| `@ideia/embedding-pipeline` | ✅ Real | 1 ✅ | ~851 | logger |
| `@ideia/encryption` | ✅ Real | 2 ✅ | ~505 | — |
| `@ideia/enterprise-compliance` | ✅ Real | 1 ✅ | ~2277 | logger |
| `@ideia/environment-snapshot` | ✅ Real | 1 ✅ | ~447 | logger |
| `@ideia/event-aggregate` | ✅ Real | 1 ✅ | ~81 | logger |
| `@ideia/event-bus` | ✅ Real | 8 ✅ | ~3798 | audit-trail, contracts, logger, ws, nats |
| `@ideia/event-projections` | ✅ Real | 1 ✅ | ~83 | logger |
| `@ideia/event-sourcing` | ✅ Real | 1 ✅ | ~1322 | logger |
| `@ideia/event-sourcing-nats` | ✅ Real | 1 ✅ | ~165 | logger |
| `@ideia/execution-layer` | ✅ Real | 2 ✅ | ~53 | — |
| `@ideia/experiment-design` | ✅ Real | 1 ✅ | ~534 | logger |
| `@ideia/extension-host` | ✅ Real | 7 ✅ | ~836 | core-contributions, command-system, zod |
| `@ideia/external-connectors` | ✅ Real | 1 ✅ | ~168 | — |
| `@ideia/feedback-loop` | ✅ Real | 3 ✅ | ~179 | zod, uuid |
| `@ideia/feedback-pipeline` | ✅ Real | 5 ✅ | ~773 | memory-store, event-bus, audit-trail |
| `@ideia/filesystem` | ✅ Real | 2 ✅ | ~614 | core-contributions, editor-core |
| `@ideia/finetuning-pipeline` | ✅ Real | 3 ✅ | ~1238 | logger, data-layer, event-bus |
| `@ideia/finops` | ✅ Real | 2 ✅ | ~1094 | logger |
| `@ideia/g0-g9-cycle` | ✅ Real | 1 ✅ | ~947 | logger, study-engine, risk-approval, quality-gates, planning-engine, spec-engine, agent-runtime, distillation-engine |
| `@ideia/gan-adversarial` | ✅ Real | 1 ✅ | ~1112 | logger |
| `@ideia/governance-service` | ✅ Real | 4 ✅ | ~571 | logger |
| `@ideia/health-check` | ✅ Real | 1 ✅ | ~428 | zod, uuid |
| `@ideia/heuristic-ai` | ✅ Real | 1 ✅ | ~107 | logger |
| `@ideia/heuristic-engine` | ✅ Real | 11 ✅ | ~1782 | — |
| `@ideia/human-gate-pipeline` | ✅ Real | 1 ✅ | ~1659 | logger |
| `@ideia/human-in-the-loop` | ✅ Real | 1 ✅ | ~247 | logger |
| `@ideia/hybrid-search` | ✅ Real | 1 ✅ | ~1176 | logger |
| `@ideia/hypothesis-testing` | ✅ Real | 1 ✅ | ~676 | logger, study-engine |
| `@ideia/i18n` | ✅ Real | 2 ✅ | ~82 | — |
| `@ideia/ide-integration` | ✅ Real | 1 ✅ | ~140 | event-bus, trace-registry, feedback-pipeline, policy-gateway |
| `@ideia/idp` | ✅ Real | 1 ✅ | ~1021 | logger |
| `@ideia/incident-manager` | ✅ Real | 2 ✅ | ~518 | uuid |
| `@ideia/incident-response` | ✅ Real | 1 ✅ | ~3765 | logger |
| `@ideia/initiative-feedback` | ✅ Real | 1 ✅ | ~490 | correction-oracle, feedback-pipeline, event-bus, audit-trail, logger |
| `@ideia/innovation-roadmap` | ✅ Real | 1 ✅ | ~431 | — |
| `@ideia/installer-linux` | ✅ Real | 1 ✅ | ~388 | — |
| `@ideia/installer-macos` | ✅ Real | 1 ✅ | ~355 | — |
| `@ideia/integration-bridge` | ✅ Real | 1 ✅ | ~406 | — |
| `@ideia/ipc-security` | ✅ Real | 1 ✅ | ~936 | — |
| `@ideia/keybinding-system` | ✅ Real | 7 ✅ | ~2072 | core-contributions, command-system |
| `@ideia/langgraph-observability` | ✅ Real | 1 ✅ | ~832 | logger |
| `@ideia/langgraph-tracing` | ✅ Real | 1 ✅ | ~126 | logger |
| `@ideia/learning-engine` | ✅ Real | 3 ✅ | ~587 | logger |
| `@ideia/llm-attack-mutation` | ✅ Real | 1 ✅ | ~210 | logger |
| `@ideia/llm-gateway` | ✅ Real | 1 ✅ | ~839 | logger |
| `@ideia/llm-integration` | ✅ Real | 4 ✅ | ~1616 | core-contributions, theia-ai |
| `@ideia/llm-provider` | ✅ Real | 3 ✅ | ~1419 | — |
| `@ideia/local-ai` | ✅ Real | 5 ✅ | ~2048 | logger, llm-provider, quantization-engine |
| `@ideia/logger` | ✅ Real | 2 ✅ | ~279 | — |
| `@ideia/lsp-integration` | ✅ Real | 1 ✅ | ~280 | — |
| `@ideia/manifest-self-description` | ✅ Real | 1 ✅ | ~1310 | cli, logger, event-bus, reality-sync |
| `@ideia/markers-output` | ✅ Real | 5 ✅ | ~805 | core-contributions, editor-core, views-widgets, shell-layout |
| `@ideia/mcp` | ✅ Real | 6 ✅ | ~1075 | — |
| `@ideia/mcp-marketplace` | ✅ Real | 1 ✅ | ~993 | logger |
| `@ideia/mcp-server` | ✅ Real | 1 ✅ | ~316 | zod, uuid |
| `@ideia/memory-continuous-learning` | ✅ Real | 1 ✅ | ~718 | logger |
| `@ideia/memory-graph` | ✅ Real | 3 ✅ | ~684 | zod, uuid |
| `@ideia/memory-hierarchy` | ✅ Real | 7 ✅ | ~776 | — |
| `@ideia/memory-hierarchy-ext` | ✅ Real | 1 ✅ | ~121 | logger |
| `@ideia/memory-store` | ✅ Real | 10 ✅ | ~4001 | contracts, logger, event-bus |
| `@ideia/menu-system` | ✅ Real | 2 ✅ | ~470 | core-contributions, command-system |
| `@ideia/meta-learning` | ✅ Real | 7 ✅ | ~1662 | logger |
| `@ideia/meta-learning-maml` | ✅ Real | 1 ✅ | ~194 | logger |
| `@ideia/metadata-cache` | ✅ Real | 2 ✅ | ~665 | cache, logger |
| `@ideia/metrics-store` | ✅ Real | 4 ✅ | ~1130 | event-bus, logger |
| `@ideia/model-manager` | ✅ Real | 1 ✅ | ~290 | logger |
| `@ideia/module-loader` | ✅ Real | 3 ✅ | ~304 | core-contributions, command-system |
| `@ideia/multi-region-compliance` | ✅ Real | 1 ✅ | ~204 | logger |
| `@ideia/native-file-dialogs` | ✅ Real | 1 ✅ | ~66 | logger |
| `@ideia/nats-auth` | ✅ Real | 1 ✅ | ~685 | — |
| `@ideia/nats-observability` | ✅ Real | 1 ✅ | ~91 | logger |
| `@ideia/nats-security` | ✅ Real | 1 ✅ | ~2817 | logger |
| `@ideia/neural-decomposition` | ✅ Real | 1 ✅ | ~261 | logger |
| `@ideia/neural-planner` | ✅ Real | 1 ✅ | ~750 | — |
| `@ideia/notification-system` | ✅ Real | 8 ✅ | ~1311 | event-bus, logger |
| `@ideia/observability` | ✅ Real | 2 ✅ | ~915 | logger |
| `@ideia/observability-engine` | ✅ Real | 3 ✅ | ~1233 | logger |
| `@ideia/onboarding-engine` | ✅ Real | 1 ✅ | ~42 | — |
| `@ideia/onboarding-wizard` | ✅ Real | 5 ✅ | ~1954 | profiles, config-engine, event-bus, logger |
| `@ideia/org-trust` | ✅ Real | 1 ✅ | ~45 | — |
| `@ideia/package-managers` | ✅ Real | 2 ✅ | ~89 | logger |
| `@ideia/pattern-detector` | ✅ Real | 2 ✅ | ~751 | memory-store, logger |
| `@ideia/performance-monitor` | ✅ Real | 2 ✅ | ~624 | — |
| `@ideia/persistent-instructions` | ✅ Real | 2 ✅ | ~174 | — |
| `@ideia/planning-engine` | ✅ Real | 7 ✅ | ~794 | logger |
| `@ideia/planning-service` | ✅ Real | 1 ✅ | ~275 | logger, contracts |
| `@ideia/plugin` | ✅ Real | 16 ✅ | ~13197 | agent-runtime, core, delivery-orchestrator, event-bus, llm-provider, memory-store, policy-engine, verification-layer, @theia/ai-chat, @theia/ai-core, @theia/ai-editor, @theia/ai-mcp, @theia/ai-ollama, @theia/ai-openai, @theia/ai-terminal, @theia/core, @theia/editor, @theia/filesystem, @theia/messages, @theia/monaco, @theia/navigator, @theia/preferences, @theia/workspace, inversify, react, react-dom, react-window, uuid |
| `@ideia/plugin-sdk` | ✅ Real | 3 ✅ | ~640 | — |
| `@ideia/policy-engine` | ✅ Real | 3 ✅ | ~1539 | contracts |
| `@ideia/policy-gateway` | ✅ Real | 2 ✅ | ~223 | contracts, policy-engine |
| `@ideia/ppo-planner` | ✅ Real | 1 ✅ | ~658 | — |
| `@ideia/ppo-planning` | ✅ Real | 1 ✅ | ~109 | logger |
| `@ideia/pr-automation` | ✅ Real | 1 ✅ | ~363 | logger |
| `@ideia/predictive-quality` | ✅ Real | 2 ✅ | ~1316 | — |
| `@ideia/preferences` | ✅ Real | 4 ✅ | ~848 | core-contributions, editor-core, workspace-resources |
| `@ideia/privacy` | ✅ Real | 9 ✅ | ~1679 | — |
| `@ideia/privacy-center` | ✅ Real | 3 ✅ | ~287 | logger, zod |
| `@ideia/profiles` | ✅ Real | 5 ✅ | ~1971 | event-bus, audit-trail |
| `@ideia/progressive-disclosure` | ✅ Real | 1 ✅ | ~776 | — |
| `@ideia/project-scanner` | ✅ Real | 1 ✅ | ~387 | logger, event-bus |
| `@ideia/prompt-economy` | ✅ Real | 8 ✅ | ~2462 | agent-runtime, logger |
| `@ideia/prompt-security` | ✅ Real | 10 ✅ | ~5241 | logger |
| `@ideia/prototyping-engine` | ✅ Real | 1 ✅ | ~56 | — |
| `@ideia/quality-gates` | ✅ Real | 11 ✅ | ~1363 | logger, feedback-pipeline, memory-store, verification-layer |
| `@ideia/quality-threshold` | ✅ Real | 1 ✅ | ~95 | logger |
| `@ideia/quantization-engine` | ✅ Real | 6 ✅ | ~1553 | logger |
| `@ideia/rag-engine` | ✅ Real | 1 ✅ | ~624 | memory-store, llm-provider, contracts |
| `@ideia/real-data` | ✅ Real | 1 ✅ | ~52 | — |
| `@ideia/reality-sync` | ✅ Real | 6 ✅ | ~5976 | chokidar |
| `@ideia/realtime-collaboration` | ✅ Real | 1 ✅ | ~88 | logger |
| `@ideia/release-automation` | ✅ Real | 1 ✅ | ~519 | — |
| `@ideia/remote-web-ide` | ✅ Real | 1 ✅ | ~84 | logger |
| `@ideia/requirements-engine` | ✅ Real | 1 ✅ | ~248 | — |
| `@ideia/resilience-engine` | ✅ Real | 2 ✅ | ~1206 | — |
| `@ideia/resilience-v2` | ✅ Real | 5 ✅ | ~2779 | core-contributions |
| `@ideia/resource-manager` | ✅ Real | 3 ✅ | ~1136 | event-bus, audit-trail, control-tower, safety-circuit, resilience-engine, resilience-v2, health-check, acceleration, logger |
| `@ideia/risk-approval` | ✅ Real | 5 ✅ | ~220 | — |
| `@ideia/risk-dashboard` | ✅ Real | 1 ✅ | ~178 | logger |
| `@ideia/risk-monitor` | ✅ Real | 1 ✅ | ~1864 | logger, bayesian-risk |
| `@ideia/robot-registry` | ✅ Real | 4 ✅ | ~627 | — |
| `@ideia/robotic-integration` | ✅ Real | 1 ✅ | ~67 | logger |
| `@ideia/rpc-messaging` | ✅ Real | 2 ✅ | ~289 | core-backend, backend-logging |
| `@ideia/safety-circuit` | ✅ Real | 7 ✅ | ~2018 | event-bus, audit-trail |
| `@ideia/schema-migration` | ✅ Real | 1 ✅ | ~990 | logger |
| `@ideia/schema-registry` | ✅ Real | 6 ✅ | ~879 | — |
| `@ideia/schema-versioning` | ✅ Real | 1 ✅ | ~109 | logger |
| `@ideia/scope-isolation` | ✅ Real | 8 ✅ | ~1050 | violation-registry |
| `@ideia/search-scm-task` | ✅ Real | 3 ✅ | ~1117 | core-contributions, editor-core, views-widgets, markers-output |
| `@ideia/security-middleware` | ✅ Real | 2 ✅ | ~453 | — |
| `@ideia/security-pipeline` | ✅ Real | 1 ✅ | ~1391 | logger |
| `@ideia/self-chat-protocol` | ✅ Real | 1 ✅ | ~1082 | event-bus, schema-registry, auto-adr, technology-radar, scope-isolation, feedback-pipeline, contract-cdc, slo-monitor, initiative-feedback, contracts, logger |
| `@ideia/self-healing` | ✅ Real | 1 ✅ | ~2069 | logger |
| `@ideia/self-optimization-panel` | ✅ Real | 2 ✅ | ~960 | event-bus, autonomous-evolution-engine, technology-radar, auto-adr, metrics-store, control-tower, logger |
| `@ideia/semantic-dedup` | ✅ Real | 1 ✅ | ~397 | vector-store |
| `@ideia/server-bootstrap` | ✅ Real | 1 ✅ | ~176 | core-backend, backend-logging |
| `@ideia/service-catalog` | ✅ Real | 4 ✅ | ~644 | — |
| `@ideia/shell-layout` | ✅ Real | 6 ✅ | ~1653 | core-contributions, views-widgets, command-system |
| `@ideia/silent-installer` | ✅ Real | 1 ✅ | ~378 | — |
| `@ideia/slo-monitor` | ✅ Real | 4 ✅ | ~1281 | event-bus, logger, metrics-store |
| `@ideia/spec-engine` | ✅ Real | 1 ✅ | ~769 | logger, agent-runtime |
| `@ideia/spec-generator` | ✅ Real | 2 ✅ | ~299 | — |
| `@ideia/spec-product-engineering` | ✅ Real | 1 ✅ | ~1074 | logger |
| `@ideia/sso` | ✅ Real | 1 ✅ | ~692 | zod, uuid |
| `@ideia/study-engine` | ✅ Real | 1 ✅ | ~369 | logger, architecture-adr |
| `@ideia/supply-chain` | ✅ Real | 5 ✅ | ~233 | — |
| `@ideia/supply-chain-sec` | ✅ Real | 1 ✅ | ~897 | logger |
| `@ideia/swe-bench` | ✅ Real | 1 ✅ | ~337 | logger, agent-runtime, quality-gates |
| `@ideia/synthetic-memory` | ✅ Real | 1 ✅ | ~2209 | logger |
| `@ideia/task-queue` | ✅ Real | 3 ✅ | ~189 | zod, uuid |
| `@ideia/tauri` | ✅ Real | 3 ✅ | ~158 | @tauri-apps/api, @tauri-apps/plugin-shell, @tauri-apps/plugin-dialog, @tauri-apps/plugin-notification, @tauri-apps/plugin-process, @tauri-apps/plugin-updater, @tauri-apps/plugin-deep-link, @tauri-apps/plugin-fs, react, react-dom, react-router-dom, @xterm/xterm, @xterm/addon-fit, @monaco-editor/react |
| `@ideia/tauri-sidecar` | ✅ Real | 1 ✅ | ~631 | contracts, uuid |
| `@ideia/technology-radar` | ✅ Real | 2 ✅ | ~987 | event-bus, logger |
| `@ideia/telemetry` | ✅ Real | 2 ✅ | ~651 | logger |
| `@ideia/terminal-sandbox` | ✅ Real | 2 ✅ | ~459 | logger |
| `@ideia/test-orchestrator` | ✅ Real | 2 ✅ | ~531 | logger, contracts |
| `@ideia/theia-ai` | ✅ Real | 7 ✅ | ~1935 | core-contributions, command-system, editor-core, editor-intelligence, shell-layout, markers-output, filesystem, search-scm-task, logger |
| `@ideia/theia-cloud` | ✅ Real | 3 ✅ | ~1800 | logger, event-bus, server-bootstrap |
| `@ideia/token-optimization` | ✅ Real | 1 ✅ | ~363 | logger |
| `@ideia/trace-propagation` | ✅ Real | 1 ✅ | ~54 | — |
| `@ideia/trace-registry` | ✅ Real | 2 ✅ | ~372 | — |
| `@ideia/tree-of-thought` | ✅ Real | 1 ✅ | ~1898 | logger |
| `@ideia/trusted-context` | ✅ Real | 2 ✅ | ~56 | — |
| `@ideia/tutorial-system` | ✅ Real | 5 ✅ | ~991 | zod, uuid |
| `@ideia/unified-intelligence` | ✅ Real | 1 ✅ | ~108 | logger |
| `@ideia/unified-nucleus` | ✅ Real | 1 ✅ | ~611 | — |
| `@ideia/usability-profile` | ✅ Real | 1 ✅ | ~325 | event-bus, audit-trail, logger |
| `@ideia/uta` | ✅ Real | 1 ✅ | ~194 | zod, uuid |
| `@ideia/ux-metrics` | ✅ Real | 2 ✅ | ~1289 | — |
| `@ideia/vector-benchmark` | ✅ Real | 2 ✅ | ~1435 | logger |
| `@ideia/vector-store` | ✅ Real | 2 ✅ | ~608 | — |
| `@ideia/verification-layer` | ✅ Real | 2 ✅ | ~279 | logger |
| `@ideia/views-widgets` | ✅ Real | 5 ✅ | ~1417 | core-contributions, command-system, editor-core |
| `@ideia/violation-registry` | ✅ Real | 1 ✅ | ~168 | — |
| `@ideia/visual-agent-debugger` | ✅ Real | 1 ✅ | ~387 | logger |
| `@ideia/vulnerability-manager` | ✅ Real | 1 ✅ | ~198 | logger |
| `@ideia/widget-contributions` | ✅ Real | 1 ✅ | ~179 | core-contributions |
| `@ideia/windows-installer` | ✅ Real | 1 ✅ | ~342 | — |
| `@ideia/workflow-engine` | ✅ Real | 2 ✅ | ~839 | logger, test-orchestrator, @types/js-yaml, js-yaml |
| `@ideia/workspace-resources` | ✅ Real | 4 ✅ | ~1091 | core-contributions, editor-core, filesystem |
| `@ideia/zero-to-deploy` | ✅ Real | 2 ✅ | ~743 | logger |

### Totais
- Packages com código: **292**
- Arquivos de teste: **1565**
- Linhas de código (`src/`): **~440083**

> **Regerar:** `npx tsx scripts/audit/regenerate-metrics.ts --fix`
> **Verificar deriva em CI:** `npx tsx scripts/audit/regenerate-metrics.ts --ci` (exit 1 em divergência)
