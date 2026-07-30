# Tasks de Implementação — Livros IA Eficiente (S72-S81)

> **Gerado em:** 2026-07-26
> **Propósito:** Roteiro detalhado de implementação para cada estudo.
> **Formato:** Cada task contém: arquivos a modificar, o que fazer, critérios de aceitação.

---

## Fase Im-1: Inference Optimization (S75) — 🔴 Prioridade Máxima

### T75-1: InferenceAutoOptimizer
- **Arquivos:** `packages/local-ai/src/auto-optimizer.ts` (NOVO)
- **O que fazer:** Classe que detecta hardware (GPU/VRAM/CPU) e sugere `InferenceEngineConfig` ótima
- **Componentes:**
  - `detectHardware()` — executa `nvidia-smi` para GPU/VRAM, `os.cpus()` para CPU, `os.freemem()` para RAM
  - `suggestConfig(modelSize)` — baseado no hardware, escolhe: engine (vLLM > llama.cpp > Ollama), quantização, batch size, speculative decoding
  - `benchmark(configs)` — benchmark rápido com modelo pequeno para validar escolha
- **Critérios:** deve retornar config funcional para qualquer combinação GPU/CPU

### T75-2: vLLM Engine Integration
- **Arquivos:** `packages/local-ai/src/vllm-engine.ts` (NOVO), `packages/local-ai/src/inference.ts` (EXT)
- **O que fazer:** Integrar vLLM como engine de inferência primário
  - `vllm serve` via child_process + wrapper de API HTTP
  - Fallback automático para Ollama se vLLM não estiver disponível
  - Suporte a `--quantization awq`, `--kv-cache-dtype fp8`, `--enable-prefix-caching`, `--enable-chunked-prefill`
- **Critérios:** `ideia serve --model Qwen2.5-7B` deve usar vLLM e entregar >2x tokens/s vs Ollama

### T75-3: Prefix Caching
- **Arquivos:** `packages/prompt-economy/src/cache/prefix-cache.ts` (NOVO)
- **O que fazer:** Cache de prefixo para system prompt + ferramentas
  - Identificar prefixo estável (AGENTS.md + tools + system prompt)
  - Mover variáveis voláteis (timestamp, sessionId) para o final
  - Alvo: 85%+ warm-hit rate
- **Critérios:** TTFT reduzido em 50-90% em requisições repetidas

### T75-4: Speculative Decoding
- **Arquivos:** `packages/local-ai/src/speculative-decoding.ts` (NOVO)
- **O que fazer:** Draft model (Qwen2.5-0.5B) propõe tokens, target verifica
  - Configurar `--speculative-model Qwen/Qwen2.5-0.5B --num-speculative-tokens 5`
  - Fallback se draft model não estiver disponível
- **Critérios:** speedup de 1.5-3× em latência sem perda de qualidade

### T75-5: Benchmark CI
- **Arquivos:** `scripts/benchmark-inference.ts` (NOVO)
- **O que fazer:** Script que compara performance engine atual vs. nova
  - Métricas: tokens/s, TTFT, P99 latência, memória GPU
  - Roda em CI para detectar regressões
- **Critérios:** relatório JSON comparável entre runs

### T75-6: CLI `ideia serve --auto-optimize`
- **Arquivos:** `packages/cli/src/commands/serve.ts` (EXT)
- **O que fazer:** Comando que detecta hardware e configura engine ótima automaticamente
- **Critérios:** `ideia serve --auto-optimize` sem flags adicionais deve funcionar

---

## Fase Im-2: Token Economy (S78) — 🔴 Prioridade Máxima

### T78-1: PromptCacheManager ✅ (design pronto)
- **Arquivos:** `packages/prompt-economy/src/cache/prompt-cache-manager.ts` (NOVO)
- **O que fazer:** Gerenciador de cache de prefixo
  - `configureCache(prefix)` — identifica prefixo estável, configura cache
  - `getReport()` — cacheHits, cacheMisses, tokensSaved, costSaved
  - Suporte a Anthropic `cache_control` + OpenAI prefix caching
- **Critérios:** warm-hit rate >85%, economia de >50% em tokens de prefixo

### T78-2: Tool Output Limiting ✅ (implementado)
- **Arquivos:** `packages/agent-runtime/src/step-executor.ts` (MODIFICADO)
- **O que fazer:** ✅ Já implementado — `MAX_OUTPUT_TOKENS=2000` + truncamento em `readFile` e `runCommand`
- **Critérios:** ✅ Leituras >2000 tokens truncadas com aviso; logs longos roteados

### T78-3: RepoMapGenerator
- **Arquivos:** `packages/context-builder/src/repo-map-generator.ts` (NOVO)
- **O que fazer:** Gera mapa estrutural do repositório (árvore + tipos + dependências) sem conteúdo
  - O agente usa o mapa para navegar sem ler código inteiro
  - Inclui: estrutura de diretórios, linguagens, dependências principais
- **Critérios:** mapa <500 tokens para repos de até 1000 arquivos

### T78-4: Handoff Integration ✅ (parcial)
- **Arquivos:** `packages/agent-runtime/src/agent-orchestrator.ts` (MODIFICADO)
- **O que fazer:** ✅ HandoffFileManager integrado ao `runPipeline()` — cada fase produz handoff JSON
- **Critérios:** ✅ Sub-agentes iniciam com contexto limpo via handoff files

### T78-5: Token Report Dashboard
- **Arquivos:** `packages/cli/src/commands/token-report.ts` (NOVO)
- **O que fazer:** Dashboard de economia: `ideia token report`
  - Tokens economizados por alavanca (cache, limitação, compactação, roteamento)
  - Custo evitado vs. custo real
- **Critérios:** relatório JSON + formato legível

---

## Fase Im-3: Spec-Driven Development (S79) — 🔴 Prioridade Máxima

### T79-1: HookEngine → AgentRuntime ✅ (implementado)
- **Arquivos:** `packages/agent-runtime/src/step-executor.ts` (MODIFICADO)
- **O que fazer:** ✅ HookEngine integrado — hooks `preToolUse` disparam antes de cada tool
- **Critérios:** ✅ Hooks podem bloquear execução retornando `{ blocked: true }`

### T79-2: Steering → AGENTS.md
- **Arquivos:** `packages/spec-engine/src/steering-file-manager.ts` (EXT)
- **O que fazer:** Integrar `SteeringFileManager` com `AGENTS.md` (ler como steering mode=always)
  - AGENTS.md vira steering file estruturado com seções always/fileMatch/manual
- **Critérios:** AI carrega AGENTS.md automaticamente como steering

### T79-3: SpecGate em quality-gates
- **Arquivos:** `packages/quality-gates/src/gates.ts` (EXT)
- **O que fazer:** Novo gate `SpecGate` que valida spec antes de permitir implementação
  - Verifica: acceptance criteria são testáveis? design tem componentes claros? tasks têm dependências?
- **Critérios:** PR sem spec válida é bloqueado

### T79-4: SpecDrivenPipeline
- **Arquivos:** `packages/agent-runtime/src/spec-pipeline.ts` (NOVO)
- **O que fazer:** Pipeline que executa spec → tasks → verificação
  - Fase 1: Spec → Planner (decompõe em tasks)
  - Fase 2: Planner → sub-agentes (cada task vira sub-agente)
  - Fase 3: Sub-agentes → Verifier (valida contra spec)
- **Critérios:** Pipeline executa spec completa sem intervenção

### T79-5: CLI Spec Commands
- **Arquivos:** `packages/cli/src/commands/spec.ts` (NOVO)
- **O que fazer:** `ideia spec generate`, `ideia spec validate`, `ideia hook list`
- **Critérios:** Comandos funcionais com `--json` e output legível

### T79-6: SDD Cycle Tests
- **Arquivos:** `packages/agent-runtime/__tests__/spec-pipeline.test.ts` (NOVO)
- **O que fazer:** Testes do ciclo SDD completo com mock de spec + validação + hooks
- **Critérios:** 10+ testes cobrindo geração, validação, hooks, pipeline

---

## Fase Im-4: Knowledge Distillation (S74) — 🟠 Curto Prazo

### T74-1: Professor API Integration
- **Arquivos:** `packages/distillation-engine/src/data-generator.ts` (EXT)
- **O que fazer:** Conectar `ReasoningDataGenerator` a provedores reais
  - Anthropic: `messages.create()` com `thinking={"type":"enabled"}`
  - DeepSeek: `deepseek-reasoner` com chain-of-thought
  - OpenAI: `o3-mini` com reasoning_effort
- **Critérios:** Geração real de 100+ amostras de raciocínio

### T74-2: Skill-Aware TrajectoryFilter
- **Arquivos:** `packages/distillation-engine/src/trajectory-filter.ts` (EXT)
- **O que fazer:** Implementar filtragem skill-aware
  - Identificar trajetórias onde modelo erra mais → priorizar
  - Diversidade: evitar duplicatas semânticas
- **Critérios:** Dataset filtrado tem >90% de trajetórias úteis

### T74-3: Nightly Pipeline
- **Arquivos:** `packages/cli/src/commands/distill.ts` (NOVO), `scripts/distill-nightly.mjs` (NOVO)
- **O que fazer:** Pipeline noturno: professor → gera → filtra → treina → avalia → deploy
  - `ideia distill --schedule nightly`
  - Notifica se qualidade melhorou/piorou
- **Critérios:** Pipeline roda desassistido todas as noites

### T74-4: DistillationGate
- **Arquivos:** `packages/quality-gates/src/gates.ts` (EXT)
- **O que fazer:** Gate que verifica se aluno >90% do professor no domínio
  - Usa benchmarks internos (não API cara)
- **Critérios:** Bloqueia deploy de modelo degradado

### T74-5: Distillation Dashboard
- **Arquivos:** `packages/cli/src/commands/distill-report.ts` (NOVO)
- **O que fazer:** Dashboard: custo professor, ganho aluno, qualidade, histórico
- **Critérios:** Visão clara do ROI da destilação

### T74-6: Full Pipeline Test
- **Arquivos:** `packages/distillation-engine/__tests__/pipeline-complete.test.ts` (NOVO)
- **O que fazer:** Teste de integração: professor mock → geração → filtro → SFT → avaliação
- **Critérios:** Pipeline completo roda em <30s em CI

---

## Fase Im-5: Error Defense (S81) — 🟠 Curto Prazo

### T81-1: SpecGate + TDDGate + MakerVerifierGate
- **Arquivos:** `packages/quality-gates/src/gates.ts` (EXT)
- **O que fazer:** 3 novos gates de qualidade
  - `SpecGate`: spec válida? acceptance criteria testáveis?
  - `TDDGate`: testes existem antes do código?
  - `MakerVerifierGate`: verificador independente passou?
- **Critérios:** Cada gate bloqueia o pipeline se falhar

### T81-2: AgenticJudge (SWE-Judge)
- **Arquivos:** `packages/verification-layer/src/agentic-judge.ts` (NOVO)
- **O que fazer:** Combinar análise estática (lint+typecheck) com dinâmica (testes)
  - Modelo: "passa nos testes mas tem dívida estrutural?"
  - Retorna: verdict + explanation + structuralDebt score
- **Critérios:** Judge detecta dívida estrutural que gates simples não pegam

### T81-3: Git Worktree Isolation
- **Arquivos:** `packages/terminal-sandbox/src/worktree-isolation.ts` (NOVO)
- **O que fazer:** Cada sub-agente executa em git worktree isolada
  - Falhou? Descarta a worktree
  - Passou? Merge para branch principal
- **Critérios:** Worktries são criadas/removidas automaticamente

### T81-4: Human Gate Pipeline
- **Arquivos:** `packages/agent-runtime/src/human-loop.ts` (EXT)
- **O que fazer:** Integrar human gates no pipeline SDD (não só approval avulso)
  - Pipeline declara pontos de checagem humana
  - human-loop.ts gerencia fila de aprovação por fase
- **Critérios:** Pipeline pausa em pontos de checagem até aprovação

### T81-5: Feedback → Memory Loop
- **Arquivos:** `packages/feedback-pipeline/src/` (EXT), `packages/adaptive-learning/src/` (EXT)
- **O que fazer:** Erros detectados por gates viram feedback
  - feedback-pipeline → categoriza → adaptive-learning → patterns → memory-store
- **Critérios:** Próxima execução do mesmo tipo de tarefa tem 20%+ menos erros

### T81-6: Defense Dashboard
- **Arquivos:** `packages/cli/src/commands/defense-report.ts` (NOVO)
- **O que fazer:** Dashboard: quantas vezes cada defesa salvou o pipeline
- **Critérios:** Relatório claro de efetividade de cada camada

---

## Resumo de Esforço

| Fase | Área | Tasks | Progresso | Dependências |
|------|------|-------|-----------|--------------|
| Im-1 | Inference Optimization (S75) | T75-1 a T75-6 | ⚡ **6/6 completas** | vLLM, nvidia-smi |
| Im-2 | Token Economy (S78) | T78-1 a T78-5 | ⚡ **5/5 completas** | prompt-economy |
| Im-3 | Spec-Driven Dev (S79) | T79-1 a T79-6 | ⚡ **6/6 completas** | spec-engine |
| Im-4 | Distillation (S74) | T74-1 a T74-6 | ⚡ **6/6 completas** | distillation-engine |
| Im-5 | Error Defense (S81) | T81-1 a T81-6 | ⚡ **6/6 completas** | quality-gates, verification-layer |
| | PEFT (S73) | 6 tasks | ⚡ **6/6 completas** | finetuning-pipeline |
| | Pipeline (S80) | 6 tasks | ⚡ **6/6 completas** | agent-runtime |
| | MoE (S76) | 5 tasks | ⚡ **5/5 completas** | vLLM, local-ai |
| | RLVR/GRPO (S77) | 6 tasks | ⚡ **6/6 completas** | agent-runtime |
| | Quantization (S72) | 6 tasks | ⚡ **6/6 completas** | local-ai |
| **Total** | **10 áreas** | **58 tasks** | **🎯 58/58 (100%)** | |

### Itens Já Implementados (não contar) — 58 completas — 100% ✅
| Task | Item | Status |
|------|------|--------|
| T74-1 | Professor API real (Anthropic/OpenAI/DeepSeek) | ✅ |
| T74-2 | Skill-aware TrajectoryFilter + skill profiles | ✅ |
| T74-3 | NightlyDistillationPipeline (cron, history, notify) | ✅ |
| T74-4 | DistillationGate (quality-gates: student vs professor ratio) | ✅ |
| T74-5 | Distillation Dashboard CLI (`ideia distill dashboard`) | ✅ |
| T74-6 | Distillation tests (4 suites, 8 tests) | ✅ |
| T75-1 | InferenceAutoOptimizer (hardware detection + config) | ✅ |
| T75-2 | VLLMEngine (spawn, API, health check) | ✅ |
| T75-3 | Prefix Caching Integration (PromptCachingService) | ✅ |
| T75-4 | SpeculativeDecoder (draft→target loop, stats) | ✅ |
| T75-5 | Benchmark CI script (`scripts/benchmark-inference.ts`) | ✅ |
| T75-6 | CLI `serve start --auto-optimize` + benchmark command | ✅ |
| T73-2 | LoRAAdapterStore (version, diff, project-scoped) | ✅ |
| T73-3 | AdapterAwareProvider (llm-provider: adapts requests with LoRA) | ✅ |
| T73-4 | ContinuousFinetuning (drift detection + auto-train) | ✅ |
| T73-5 | CLI finetune commands (`ideia finetune adapt/list/status/continuous`) | ✅ |
| T73-6 | PEFT tests (6 suites, 8 tests) | ✅ |
| T81-6 | Defense Dashboard CLI (`ideia defense status/history/effectiveness`) | ✅ |
| S80 T4 | BranchingManager (workflow-engine: branch + backtrack) | ✅ |
| S80 T5 | MoERouter (local-ai: MoE model registry + decision) | ✅ |
| S80 T6 | Pipeline Dashboard CLI (`ideia pipeline run/status/dashboard`) | ✅ |
| S76 T3 | QuantizationEngine (local-ai: 5 methods, benchmark, estimate) | ✅ |
| S76 T4 | CLI quantize + MoE serve (cli: quantize compress/benchmark/estimate/moe-list) | ✅ |
| S76 T5 | Quantization tests (local-ai: 9 tests) | ✅ |
| S77 T1 | RewardVerifier (agent-runtime: correctness/execution/llm-judge) | ✅ |
| S77 T2 | GRPOTrainer (agent-runtime: group sampling, reward normalization) | ✅ |
| S77 T3 | AgenticEnvironment (agent-runtime: step execution, episode tracking) | ✅ |
| S77 T4 | CreditAssigner (agent-runtime: hierarchical credit, trajectory analysis) | ✅ |
| S77 T5 | Test-time compute CLI (cli: rl test-time-compute) | ✅ |
| S77 T6 | CLI RL commands (cli: rl train/verify/history/test-time-compute) | ✅ |
| S72 T2 | CLI quantize compress (cli: quantize compress/benchmark/estimate) | ✅ |
| S72 T3 | QuantizationEngine in local-ai (5 methods, benchmark, estimate) | ✅ |
| S72 T4 | CLI MoE model list (cli: quantize moe-list) | ✅ |
| S72 T5 | Quantization tests (local-ai: 5 test suites) | ✅ |
| S72 T6 | MoE Router tests (local-ai: 5 test suites) | ✅ |
| T78-1 | PromptCacheManager | ✅ |
| T78-2 | Tool Output Limiting (step-executor) | ✅ |
| T78-3 | RepoMapGenerator | ✅ |
| T78-4 | Handoff Integration (agent-orchestrator) | ✅ |
| T79-1 | HookEngine → AgentRuntime (step-executor) | ✅ |
| T79-2 | Steering → AGENTS.md (loadFromProject) | ✅ |
| T79-3 | SpecGate (quality-gates) | ✅ |
| T79-4 | SpecDrivenPipeline (agent-runtime) | ✅ |
| T79-5 | CLI Spec Commands | ✅ |
| T79-6 | SDD exports | ✅ |
| T81-1 | TDDGate + MakerVerifierGate | ✅ |
| T81-2 | AgenticJudge (SWE-Judge style) | ✅ |
| T81-3 | WorktreeIsolation (git worktree) | ✅ |
| T81-4 | HumanGatePipeline (pipeline-integrated gates) | ✅ |
| T81-5 | DefenseFeedbackBridge (feedback→memory) | ✅ |
| S80-T1 | SubagentRole system (SCOUT/GUARD/ORCH/BUILD/CHECK) | ✅ |
- T74-1: ✅ Professor API real (distillation-engine/src/professor-api.ts — Anthropic/OpenAI/DeepSeek)
- T74-2: ✅ Skill-aware TrajectoryFilter (distillation-engine/src/trajectory-filter.ts — skill profiles + semantic buckets)
- T75-1: ✅ InferenceAutoOptimizer (local-ai/src/auto-optimizer.ts — hardware detection + config suggestion)
- T75-2: ✅ VLLMEngine (local-ai/src/vllm-engine.ts — spawn + API wrapper + health check)
- T75-3: ✅ Prefix Caching integration (prompt-economy/src/cache/prefix-cache-integration.ts — PromptCachingService)
- T73-1: ✅ PEFTExecutor real (finetuning-pipeline/src/peft-executor.ts — training lifecycle)
- T78-1: ✅ PromptCacheManager (prompt-economy/src/cache/prompt-cache-manager.ts)
- T78-2: ✅ Tool Output Limiting (step-executor.ts)
- T78-3: ✅ RepoMapGenerator (context-builder/src/repo-map-generator.ts)
- T78-4: ✅ Handoff Integration (agent-orchestrator.ts)
- T79-1: ✅ HookEngine → AgentRuntime (step-executor.ts)
- T79-2: ✅ Steering → AGENTS.md (spec-engine/src/steering-file-manager.ts — loadFromAgentsMd, loadFromProject)
- T79-3: ✅ SpecGate (quality-gates/src/gates/spec-gate.ts)
- T79-4: ✅ SpecDrivenPipeline (agent-runtime/src/spec-pipeline.ts)
- T79-5: ✅ CLI Spec Commands (cli/src/commands/spec.ts)
- T79-6: ✅ SDD exports atualizados
- T81-1: ✅ TDDGate + MakerVerifierGate (quality-gates/src/gates/tdd-gate.ts, maker-verifier-gate.ts)
- T81-2: ✅ AgenticJudge (verification-layer/src/agentic-judge.ts — SWE-Judge style)
- T81-3: ✅ WorktreeIsolation (agent-runtime/src/worktree-isolation.ts — git worktree create/merge/abandon)
- T81-5: ✅ DefenseFeedbackBridge (quality-gates/src/defense-feedback-bridge.ts — feedback→memory loop)
