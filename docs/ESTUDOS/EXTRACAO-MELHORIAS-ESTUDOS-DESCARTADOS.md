# Extração de Melhorias — Estudos Discartados e Maybe

> **Data:** 2026-07-26
> **Propósito:** Extrair conhecimento dos 35 estudos classificados como "descartados" e "maybe" para gerar melhorias concretas em packages existentes.

---

## Resumo

| Categoria | Estudos Analisados | Ideias Extraídas | Esforço Estimado |
|-----------|-------------------|------------------|------------------|
| Alta prioridade (1000+ linhas) | 15 | ~75 | ~800h |
| Média prioridade (500-999) | 8 | ~24 | ~120h |
| Baixa prioridade (<500, mockups) | 12 | ~6 | ~20h |
| **Total** | **35** | **~105** | **~940h** |

---

## 1. Competitivo/Estratégico

### S57 COMPETITIVE-POSITIONING (2.066 linhas)
**Valor:** Análise detalhada de 12 concorrentes (Devin, Factory, Copilot, Cursor), matriz de 30+ dimensões, gap closure plan.

| Ideia | Package-alvo | Esforço |
|-------|-------------|---------|
| Parallel Agent Execution via Worker Pool | `@ideia/agent-coordinator`, `@ideia/agent-runtime` | 4 semanas |
| Computer Use via Playwright BrowserController | `@ideia/agent-runtime` (novo módulo) | 4 semanas |
| SWE-bench Evaluation Pipeline | `@ideia/cli` (swebench/evaluator.ts), `@ideia/agent-graph` | 3 semanas |
| PR Automation Pipeline (Issue-to-PR) | `@ideia/cli` (git-provider.ts), `@ideia/planning-engine` | 3-4 semanas |
| Competitive Matrix Dashboard | `@ideia/cli` (ecosystem/competitive-matrix.ts) | 1 semana |

### ANALISE-COMPARATIVA-DEVIN-FACTORY-AGENTES (1.207 linhas)
**Valor:** Mapa de 35 features do Devin vs IDEIA, 15 gaps críticos, roadmap 7 fases / 2.116h.

| Ideia | Package-alvo | Esforço |
|-------|-------------|---------|
| Computer Use Engine (Playwright) | `@ideia/computer-use` (novo) | 6 semanas |
| Planner-Executor Model Split | `@ideia/agent-runtime` | 2 semanas |
| Blueprint + Snapshot System | `@ideia/cli`, `@ideia/environment` (novo) | 3 semanas |
| Agentic MapReduce para codebase | `@ideia/agent-runtime` | 2 semanas |
| MCP Marketplace (provider + discovery) | `@ideia/mcp` | 3 semanas |

---

## 2. Metodologia/Avaliação Científica

### SCIENTIFIC-EVALUATION-FRAMEWORK (3.598 linhas)
**Valor:** Framework completo de avaliação científica com hipóteses formais, experimentos controlados, testes estatísticos.

| Ideia | Package-alvo | Esforço |
|-------|-------------|---------|
| Statistical Test Suite (t-test, Wilcoxon, Cohen's d) | `@ideia/quality-gates` (evaluation/statistics) | 1 semana |
| Hypothesis Testing Framework (H1-H6) | `@ideia/study-engine`, `@ideia/g0-g9-cycle` | 1 semana |
| Experiment Design (randomização) | `@ideia/study-engine` | 1 semana |
| CI-Integrated Experiment Runner | `@ideia/g0-g9-cycle`, `@ideia/cli` | 2 semanas |
| Bias Detection Module | `@ideia/quality-gates` (bias-detection) | 1 semana |

### QUALIDADE-TOTAL-IDEIA (1.278 linhas)
**Valor:** Framework 7 dimensões de qualidade, 4 gates, métricas, maturidade.

| Ideia | Package-alvo | Esforço |
|-------|-------------|---------|
| Quality Orchestrator (4 gates) | `@ideia/cli`, `@ideia/quality-gates` | 2 semanas |
| Coverage Tracker com thresholds modulares | `@ideia/quality-gates` | 1 semana |
| Quality Dashboard Widget Theia | `@ideia/ideia-plugin`, `@ideia/observability-engine` | 2 semanas |
| LLM Mock Providers para testes | `@ideia/agent-runtime` (__mocks__) | 3 dias |
| Maturity Model com scoring automático | `@ideia/quality-gates` | 1 semana |

---

## 3. UX/Usabilidade

### S56 UX-TRANSFORMATION (1.434 linhas)
**Valor:** Estratégia completa de transformação UX com componentes, métricas, roadmap.

| Ideia | Package-alvo | Esforço |
|-------|-------------|---------|
| AgentUndoService (100 ações de histórico) | `@ideia/ideia-plugin` (agent-undo-service) | 1 semana |
| AgentStreamService (streaming real-time) | `@ideia/ideia-plugin` (chat/agent-stream) | 1 semana |
| InlineDiffManager (diff colorido no Monaco) | `@ideia/ideia-plugin` (diff) | 1 semana |
| OnboardingWizard (6 steps) | `@ideia/ideia-plugin` (onboarding) | 2 semanas |
| Error Catalog com auto-fix | `@ideia/ideia-plugin` (errors) | 1 semana |

### MELHORIA-USABILIDADE (295 linhas)
**Valor:** Pesquisa de usabilidade — insights para melhorias incrementais no theia-ai e chat widget.

---

## 4. Infraestrutura/Cloud

### CLOUD-INFRAESTRUTURA (1.401 linhas)
**Valor:** Mapeamento de provedores, containerização, IaC, arquiteturas de referência.

| Ideia | Package-alvo | Esforço |
|-------|-------------|---------|
| OpenTofu IaC Modules | `@ideia/cli` (infra commands), `@ideia/infra` (novo) | 2 semanas |
| CloudProvider Abstraction Layer | `@ideia/cli` (ecosystem) | 1 semana |
| Docker Compose Profile Generator | `@ideia/cli` (init command) | 1 semana |
| Backup/Restore Drill Script | `@ideia/cli` (infra:restore-drill) | 3 dias |
| Capacity Planning Calculator | `@ideia/cli`, `@ideia/prompt-economy` | 1 semana |

---

## 5. Performance

### PERFORMANCE-ESCALABILIDADE (1.732 linhas)
**Valor:** Benchmarks LLMs/VectorDBs/NATS, thresholds, profiling, capacity planning.

| Ideia | Package-alvo | Esforço |
|-------|-------------|---------|
| LLM Model Router com Hardware Profiles | `@ideia/agent-runtime`, `@ideia/provider-router` | 1 semana |
| Bottleneck Diagnostic Tree | `@ideia/cli` (perf:diagnose) | 1 semana |
| k6 Load Test Suite para CI | `@ideia/quality-gates` | 2 semanas |
| Memory Profiler com Heap Snapshots | `@ideia/observability` | 3 dias |
| Event Loop Lag Monitor | `@ideia/observability` | 2 dias |

### S54 PERFORMANCE-OPTIMIZATION (1.270 linhas)
**Valor:** Roadmap completo de performance: startup 5.8s→2s, bundle 4.6MB→2.5MB, search 680ms→100ms.

| Ideia | Package-alvo | Esforço |
|-------|-------------|---------|
| Lazy Widget Loading + Startup Phases | `@ideia/ideia-plugin`, `@ideia/views-widgets` | 2 semanas |
| Multi-Tier LLM Cache (exact + semantic) | `@ideia/prompt-economy`, `@ideia/llm-provider` | 1 semana |
| ripgrep + Pre-built Search Index | `@ideia/search`, `@ideia/filesystem` | 1 semana |
| Full Benchmark Suite + CI Regression | `@ideia/observability`, `@ideia/quality-gates` | 2 semanas |
| Bundle Optimization (tree-shaking) | `@ideia/agents`, `@ideia/chat` (vários) | 1 semana |

---

## 6. Desktop

### DESKTOP-NATIVE (1.778 linhas)
**Valor:** Comparação exaustiva Electron vs Tauri vs NW.js vs Neutralino.js, estratégia multi-shell.

| Ideia | Package-alvo | Esforço |
|-------|-------------|---------|
| WebView Pool (reuso 3 instâncias) | `@ideia/ideia-plugin` (shell/webview-pool) | 3 dias |
| Deep Link Protocol (ideia://) | `@ideia/desktop` (electron/main.ts) | 1 semana |
| Global Shortcuts System | `@ideia/desktop` (electron/main.ts) | 3 dias |
| Multi-Shell com Lazy Loading | `@ideia/desktop`, `@ideia/ideia-plugin` | 2 semanas |
| Tauri Sidecar Node.js | `@ideia/desktop` (tauri-sidecar), `@ideia/agent-runtime` | 2 semanas |

### D01 ELECTRON-ARQUITETURA (1.203 linhas)
**Valor:** Guia completo de Electron com código, segurança, performance.

| Ideia | Package-alvo | Esforço |
|-------|-------------|---------|
| Fix contextIsolation/nodeIntegration | `@ideia/desktop` (electron) | 1 dia |
| MetadataCache (Obsidian-style) | `@ideia/desktop`, `@ideia/reality-sync` | 8h |
| Electron Fuses (runAsNode: false) | `@ideia/desktop` | 1 dia |
| E2E tests Playwright | `@ideia/desktop`, `@ideia/code-signing` | 1 semana |
| Optimized IPC (batch-invoke) | `@ideia/desktop` (preload.ts) | 3 dias |

### D05 MATRIZ-COMPARATIVA-SHELLS (1.306 linhas)
**Valor:** 12 shells × 22 dimensões, estratégia 4 camadas, roadmap 440h.

| Ideia | Package-alvo | Esforço |
|-------|-------------|---------|
| Tauri v2 POC (Layer 2) | `@ideia/desktop-tauri` (novo) | 60h |
| ShellRouter (abstração de shell) | `@ideia/desktop` | 40h |
| Tauri Mobile companion | `@ideia/desktop-tauri-mobile` (novo) | 100h |
| WASM optimization path | `@ideia/core`, `@ideia/acceleration` | 80h |
| Shell benchmark suite | `@ideia/benchmark`, `@ideia/desktop` | 40h |

### D18 GPU-ACCELERATION-DESKTOP (1.395 linhas)
**Valor:** Pipeline GPU, WebGL/WebGPU, configuração cross-platform.

| Ideia | Package-alvo | Esforço |
|-------|-------------|---------|
| GPU Config Package | `@ideia/gpu-config` (novo) | 4h |
| GPUMemoryManager | `@ideia/gpu-config`, `@ideia/observability` | 6h |
| Monaco FPS Quality Scaling | `@ideia/ideia-plugin`, `@ideia/gpu-config` | 6h |
| WebGPU Agent Accelerator | `@ideia/webgpu-accelerator` (novo) | 8h |
| GPU Profiling + Tracing | `@ideia/gpu-config`, `@ideia/benchmark` | 6h |

### D21 PROTOCOL-HANDLERS-DEEP-LINKS (957 linhas)
**Valor:** Spec completa de deep links com 8 rotas, segurança, CI.

| Ideia | Package-alvo | Esforço |
|-------|-------------|---------|
| Nonce Replay Protection | `@ideia/desktop` (deeplink) | 3h |
| DeepLink Router (8 handlers) | `@ideia/desktop`, `@ideia/desktop-electron` | 10h |
| Auto-Repair Protocol Registration | `@ideia/desktop`, `@ideia/audit-trail` | 3h |
| External Embedding API | `@ideia/client-sdk`, `@ideia/integrations` | 10h |
| Deep Link Audit Trail | `@ideia/audit-trail`, `@ideia/desktop` | 2h |

### PLUGIN-SYSTEM-TAURI (1.074 linhas) — MAYBE
**Valor:** Tutorial de plugins Rust para Tauri. Baixo valor de implementação — conteúdo majoritariamente didático.

### D06 RUST-CORE-SEGURANCA-DESKTOP (1.657 linhas)
**Valor:** Modelo de segurança Rust, fuzzing, supply chain.

| Ideia | Package-alvo | Esforço |
|-------|-------------|---------|
| cargo-fuzz Fuzz Targets | `@ideia/tauri` (src-tauri/fuzz) | 40h |
| CI/CD Security Pipeline | `.github/workflows/rust-security.yml` | 16h |
| SidecarManager com allowlist | `@ideia/policy-engine`, `@ideia/tauri` | 24h |
| Proptest Verification | `@ideia/tauri` (security/proptests) | 16h |
| WASM Plugin Sandbox | `@ideia/tauri` (sandbox/wasm.rs) | 40h |

---

## 7. Mockups/Documentos de Processo (Baixo valor)

### Mockups obsoletos (8 estudos, <500 linhas cada)
**MOCKUP-FRONTEND-IDEIA-V2** (249), **MOCKUP-FRONTEND-IDEIA** (319), **VIABILIDADE-MOCKUP-IDENTICO** (194), **IMPLEMENTACAO-TECNICA-MOCKUP** (480), **ANALISE-PROFUNDA-SISTEMA** (320), **INTEGRACAO-THEIA-MOCKUP-FINAL** (280), **INTEGRACAO-TRIPLA-THEIA-IDEIA-IA** (288), **VISAO-COMPLETA-IDEIA-INDUSTRIAL** (209)

**Valor extraído:** Mínimo. Estes estudos serviram como provas de conceito durante o desenvolvimento inicial e foram substituídos por implementações reais. Nenhuma melhoria concreta para packages atuais.

### Documentos de processo (5 estudos, 151-608 linhas)
**COMPLETO-FLUXO-IDEIA-ENTREGA** (540), **COMPLETO-TOPOLOGIA-INTEGRACAO** (549), **MASTER-CONSOLIDADO-EXECUCAO** (151), **INTEGRACAO-UNIFICADA-IDEIA** (347), **PIPELINE-VERIFICACAO-QUALIDADE-ENTREGA** (608)

**Valor extraído:** Documentação de processo. Podem alimentar a seção de governança do `@ideia/cli` (comandos de workflow/audit), mas não geram código novo.

### Estudos de referência (3 estudos)
**D03 NWJS-LEGADO** (781), **D04 NEUTRALINOJS-ULTRA-LEVE** (675), **SELF-OPTIMIZATION-PANEL** (618)

**Valor extraído:** O SELF-OPTIMIZATION-PANEL tem conceitos de auto-otimização que podem alimentar `@ideia/self-optimization-panel`. Os estudos NW.js e Neutralino.js são apenas históricos.

---

## 8. Estudos Maybe — Reavaliação Final

| Estudo | Decisão | Motivo |
|--------|---------|--------|
| **PLUGIN-SYSTEM-TAURI** (1.074) | ❌ Confirmado descartado | Conteúdo 95% educativo, 1 interface, 1 bloco código |
| **S54-PERFORMANCE-OPTIMIZATION** (1.270) | ✅ Qualificado como referência | Roadmap de performance acionável — ideias extraídas acima |
| **BLUEPRINTS-IMPLEMENTACAO I1** (4.857) | ✅ Qualificado como referência | Maior estudo do projeto — QualityScorePipeline é código pronto |
| **PERFORMANCE-ESCALABILIDADE** (1.732) | ✅ Qualificado como referência | Benchmarks e thresholds com specs acionáveis |
| **CLOUD-INFRAESTRUTURA** (1.401) | ✅ Qualificado como referência | Arquiteturas de referência multi-região com specs de IaC |

**Novo status:** Todos os 5 Maybe foram reavaliados — 4 têm valor extraído como referência, 1 (PLUGIN-SYSTEM-TAURI) foi confirmado como descartado.

---

## Top 10 Melhorias por Impacto Imediato

| # | Melhoria | Baseado em | Package | Esforço |
|---|----------|-----------|---------|---------|
| 1 | QualityScorePipeline (código pronto) | BLUEPRINTS I1 (4.857 linhas) | `@ideia/quality-gates` | 1 semana |
| 2 | LLM Model Router c/ Hardware Profile | PERFORMANCE (1.732) | `@ideia/agent-runtime` | 1 semana |
| 3 | Statistical Test Suite | SCIENTIFIC (3.598) | `@ideia/quality-gates` | 1 semana |
| 4 | Parallel Agent Execution | COMPETITIVE (2.066) | `@ideia/agent-coordinator` | 4 semanas |
| 5 | Hypothesis Testing Framework | SCIENTIFIC (3.598) | `@ideia/study-engine` | 1 semana |
| 6 | k6 Load Test Suite | PERFORMANCE (1.732) | `@ideia/quality-gates` | 2 semanas |
| 7 | Multi-Tier LLM Cache | S54 (1.270) | `@ideia/prompt-economy` | 1 semana |
| 8 | AgentUndoService | UX (1.434) | `@ideia/ideia-plugin` | 1 semana |
| 9 | InlineDiffManager | UX (1.434) | `@ideia/ideia-plugin` | 1 semana |
| 10 | Coverage Tracker com thresholds | QUALIDADE (1.278) | `@ideia/quality-gates` | 1 semana |

---

> **Total de ideias extraídas:** ~105 melhorias em ~35 packages
> **Esforço estimado total:** ~940h
> **Pacotes novos sugeridos:** `@ideia/computer-use`, `@ideia/infra`, `@ideia/environment`, `@ideia/eval-harness`, `@ideia/gpu-config`, `@ideia/webgpu-accelerator`
