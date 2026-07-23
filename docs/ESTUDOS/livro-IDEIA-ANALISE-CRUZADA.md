# Análise Cruzada: livro-IDEIA.md vs Codebase Real

> **Data:** 2026-07-21
> **Propósito:** Mapear sistematicamente os 100+ capítulos do livro contra o que já existe na IDEIA, identificar o que tem gap real, o que pode ser melhorado, e o que já está maduro.

---

## Metodologia

Cada cluster temático foi avaliado em 3 dimensões:
- **Cobertura no livro** — profundidade e abrangência dos capítulos
- **Cobertura no código** — o que realmente existe nos 87 packages
- **Gap real** — diferença entre o que o livro descreve e o que o código entrega

---

## Cluster 1: Prompt Pipeline & Economy of Tokens
**Capítulos:** 41, 42, 48, 70

### O que o livro descreve
- Prompt como contrato operacional (objetivo, restrições, formato de saída, ferramentas)
- Compressão de contexto: sumarização, deduplicação, agrupamento, corte por orçamento
- Seleção ativa de contexto: o modelo recebe só o necessário para a próxima decisão
- Economia de tokens em TODAS as fases: entrada, raciocínio, ferramentas, resposta
- Early exit: se a tarefa já foi resolvida, pare
- Orçamento de tokens por tarefa com limites explícitos
- Roteamento por complexidade: tarefas triviais vs médias vs complexas
- Batching, caching de decisões, pré-processamento de entrada

### O que existe no código
- `prompt-pipeline.ts` no CLI (classificação, enriquecimento, otimização, plano, formato)
- `llm-provider` com 2 providers + router (mas sem compressão de contexto)
- `memory-store` com CAG cache e semantic cache (parcial)
- `trusted-context` com validação de contexto (mas sem compressão ativa)
- `security-middleware` com sanitização de entrada (mas só security, não economia)

### Gap real: 🔴 CRÍTICO
**Não existe:**
- ❌ Nenhum mecanismo de compressão de contexto ativo (sumarização antes de enviar ao LLM)
- ❌ Nenhum orçamento de tokens por tarefa
- ❌ Nenhum early exit por critério atingido
- ❌ Nenhum batching inteligente de chamadas LLM
- ❌ Nenhum caching de planos/decisões reutilizáveis
- ❌ Nenhum roteamento por complexidade (tudo vai pro mesmo pipeline)
- ❌ Prompt pipeline existe no CLI mas não está integrado ao agent-runtime

### Oportunidades de melhoria
1. **Criar `packages/context-compressor`** — sumarização, deduplicação, seleção ativa, orçamento
2. **Criar `packages/token-budget`** — orçamento por tarefa, early exit, corte por limite
3. **Criar `packages/complexity-router`** — classifica tarefa e roteia para pipeline adequado
4. **Integrar prompt-pipeline ao agent-runtime** — o pipeline do CLI deve ser usado pelo runtime
5. **Criar `packages/response-compressor`** — compressão de saída, resumos, early exit

---

## Cluster 2: Context Selection & Compression Engine
**Capítulos:** 6, 41, 70

### O que o livro descreve
- Contexto da tarefa, do repositório, arquitetural, histórico, operacional, organizacional
- Memória de sessão, projeto, organizacional, global
- Recuperação semântica e estrutural
- Seleção de contexto: o que é essencial, opcional, o que pode ficar de fora
- Composição de contexto em pacotes organizados
- Janela de contexto e eficiência: resumir partes antigas, priorizar trechos importantes
- Redução de ruído
- Contexto dinâmico (muda ao longo da execução)

### O que existe no código
- `memory-store` com file-based persistence, vector search, knowledge graph, pattern detector
- `trusted-context` com validação de integridade e frescor
- `scope-isolation` com path validation e cross-scope access control
- `continuity-engine` com timeline e decisões

### Gap real: 🔴 CRÍTICO
**Não existe:**
- ❌ Nenhum "context builder" que componha pacotes de contexto otimizados para o LLM
- ❌ Nenhuma curadoria ativa de ruído antes de enviar ao modelo
- ❌ Nenhuma hierarquia de memória operacional real (trabalho vs projeto vs institucional vs global)
- ❌ Nenhum contexto dinâmico que se adapta conforme a execução avança
- ❌ Nenhuma compressão automática de contexto para respeitar janela do modelo
- ❌ Nenhuma priorização de contexto por relevância estimada

### Oportunidades de melhoria
1. **Refatorar `memory-store` para hierarquia real** — 4 níveis de memória com políticas de retenção diferentes
2. **Criar `packages/context-builder`** — composição de pacotes de contexto otimizados
3. **Criar `packages/noise-reducer`** — filtragem ativa de ruído antes de enviar ao modelo
4. **Adicionar contexto dinâmico ao agent-runtime** — o contexto muda conforme os steps progridem
5. **Criar `packages/context-prioritizer`** — ranqueamento e poda de contexto por relevância estimada

---

## Cluster 3: Planning Engine Avançado
**Capítulos:** 7, 19, 55

### O que o livro descreve
- Planejamento formal: objetivo, subtarefas, ordem, dependências, risco, validações
- Decomposição top-down e bottom-up
- Análise de dependências entre tarefas
- Estimativa de risco por etapa
- Critérios de aceite explícitos
- Estratégia de fallback e replanejamento dinâmico
- Planejamento hierárquico: metas, submetas, decomposição adaptativa
- Priorização por dependência lógica, risco, impacto, custo
- Replanejamento em tempo real baseado em novas descobertas

### O que existe no código
- `agent-runtime` com `planner-executor.ts` (referenciado mas não lido totalmente)
- `workflow-engine` com workflow management, steps, quality gates
- `agent-runtime` com 8 nodes (analyst, architect, programmer, etc.) e `LangGraphAgent`

### Gap real: 🟠 ALTO
**Existe planejamento básico mas:**
- ❌ Nenhum plano com análise de dependências entre etapas
- ❌ Nenhuma decomposição adaptativa (top-down + bottom-up combinados)
- ❌ Nenhuma estimativa de risco por etapa
- ❌ Nenhum critério de aceite por etapa (só global)
- ❌ Nenhum replanejamento dinâmico (se algo muda, o plano não se adapta)
- ❌ Nenhum fallback planejado (plano B)
- ❌ Nenhuma priorização inteligente de subtarefas
- ⚠️ `LangGraphAgent` é uma implementação custom que importa LangGraph mas não usa (inconsistência arquitetural)

### Oportunidades de melhoria
1. **Refatorar `agent-runtime` para usar LangGraph de verdade** — ou remover a dependência
2. **Criar `packages/planning-engine`** — planejador com decomposição, dependências, risco, fallback
3. **Adicionar replanejamento dinâmico** — quando um step falha, replanejar em vez de só tentar de novo
4. **Criar contratos formais de plano** — Plan com steps, dependencies, risk, acceptanceCriteria por step
5. **Criar `packages/dependency-analyzer`** — análise de dependências entre arquivos/módulos

---

## Cluster 4: Multi-Agent Coordination & Routing by Complexity
**Capítulos:** 46, 55, 74

### O que o livro descreve
- Paralelismo: ler arquivos, rodar testes, analisar riscos simultaneamente
- Multiagentes especializados: código, testes, docs, segurança, arquitetura, performance
- Coordenação central com orquestrador
- Consenso e arbitragem quando agentes discordam
- Fusão de resultados de múltiplos agentes
- Roteamento por complexidade: Nível 0 a 5 (resposta direta até multiagentes com revisão humana)
- Classificação de complexidade por etapas, risco, arquivos, dependências

### O que existe no código
- `agent-runtime` com `AgentOrchestrator` (8 nodes + parallel_reviewer_tester)
- `agent-runtime` com A2A Protocol e MCP Registry
- `LangGraphAgent` com conditional edges, cycle detection, retry

### Gap real: 🟠 ALTO
**Existe orquestração multiagente mas:**
- ❌ Nenhum roteamento por complexidade (tudo usa o mesmo pipeline)
- ❌ Nenhum consenso formal entre agentes quando há divergência
- ❌ Nenhuma fusão de resultados de múltiplos agentes
- ❌ Nenhuma classificação de complexidade da tarefa
- ❌ Nenhuma seleção de rota baseada em risco, custo, ou urgência
- ❌ Paralelismo implementado como single node delegado (não real paralelismo)
- ⚠️ `AgentGraph` é deprecated/wrapper

### Oportunidades de melhoria
1. **Criar `packages/complexity-router`** — classifica tarefa e roteia para pipeline adequado (N0-N5)
2. **Criar `packages/consensus-engine`** — arbitragem entre agentes quando há conflito
3. **Refatorar `AgentGraph`** — remover deprecated, usar o AgentOrchestrator como padrão
4. **Criar `packages/parallel-executor`** — paralelismo real com merge de resultados e detecção de conflitos
5. **Adicionar seleção de rota por custo/risco** — não só por tipo de tarefa

---

## Cluster 5: Memory Hierarchy Real
**Capítulos:** 6, 18, 45, 57

### O que o livro descreve
- Memória de trabalho (task atual, etapa, erros recentes, decisões imediatas)
- Memória de projeto (arquitetura, convenções, decisões, roadmap, pendências)
- Memória institucional (padrões, políticas, incidentes, lições aprendidas)
- Memória global (boas práticas reutilizáveis)
- Retenção seletiva: o que vale a pena guardar baseado em recorrência, utilidade, impacto
- Esquecimento controlado: expirar, remover duplicatas, descartar ruído
- Curadoria: sumarizar, consolidar, classificar, priorizar
- Memória factual vs memória preferencial

### O que existe no código
- `memory-store` com file-based store, vector search, knowledge graph, pattern detection
- Cross-project learning, episodic memory, temporal memory
- CAG cache, semantic cache
- `continuity-engine` com decisões e timeline

### Gap real: 🟠 ALTO
**Existe base de memória mas:**
- ❌ Nenhuma separação hierárquica real (trabalho/projeto/institucional/global)
- ❌ Nenhuma política de retenção diferente por nível
- ❌ Nenhum esquecimento controlado (nada expira)
- ❌ Nenhuma curadoria ativa de memória (sumarização, consolidação)
- ❌ Nenhuma separação factual vs preferencial
- ❌ Memória de trabalho não existe como conceito separado (tudo vai pro mesmo store)
- ❌ Nenhum mecanismo de "esquecer" comandado por política

### Oportunidades de melhoria
1. **Refatorar `memory-store` para 4 níveis hierárquicos** com políticas de retenção por nível
2. **Criar `packages/memory-curator`** — sumarização, consolidação, expiração, deduplicação
3. **Criar `packages/forgetting-engine`** — política de esquecimento controlado com critérios
4. **Separar memória de trabalho (volátil) de memória de projeto (persistente)**
5. **Adicionar memória preferencial por usuário** — estilo, formato, nível de detalhe

---

## Cluster 6: Verificação Multicamada & Quality Gates
**Capítulos:** 9, 26, 85

### O que o livro descreve
- Camadas de verificação: sintática, semântica, funcional, sistêmica, contextual
- Quality gates: lint, typecheck, unit tests, integration, E2E, segurança, coverage
- Testes gerados por IA com ciclo "primeiro prova, depois correção"
- Critérios de aceite explícitos por tarefa
- Validação de regressão automática
- Confiabilidade da própria verificação
- Níveis de confiança pós-verificação

### O que existe no código
- `verification-layer` com suite runner e checks
- `test-orchestrator` com 6 suites padrão e parse de output Jest
- `quality-gates` no workflow-engine que roda lint, test, build, security, architecture
- `correction-oracle` com 5 regras de análise estática

### Gap real: 🟡 MÉDIO
**Existe verificação básica mas:**
- ❌ Nenhuma verificação semântica (só sintática/estática)
- ❌ Nenhum quality gate como barreira formal no fluxo (só registro)
- ❌ Nenhuma geração de testes IA integrada ao fluxo
- ❌ Nenhum cálculo de confiança pós-verificação
- ❌ Nenhuma verificação de regressão automatizada (só rodar testes existentes)
- ⚠️ `execFileSync` em todo lugar (bloqueante)
- ⚠️ Parse de output Jest por regex (frágil)

### Oportunidades de melhoria
1. **Refatorar `verification-layer` e `test-orchestrator` para async não-bloqueante**
2. **Criar `packages/test-generator`** — geração de testes integrada ao fluxo de correção
3. **Criar `packages/confidence-scorer`** — cálculo de confiança baseado em evidências de verificação
4. **Adicionar quality gates como barreira no Orchestrator** — não deixar avançar se gate falhar
5. **Criar `packages/regression-analyzer`** — análise de impacto e regressão antes/depois

---

## Cluster 7: Policy Evolution & Risk Classification
**Capítulos:** 11, 20, 62

### O que o livro descreve
- Governança: permissões, níveis de autonomia, segurança por design
- Classificação de risco: baixo, médio, alto, crítico
- Matriz de risco combinando impacto e probabilidade
- Fatores que aumentam e reduzem risco
- Fluxo de aprovação proporcional ao risco
- Aprovação humana com escopo explícito
- Bloqueio automático para casos de alto risco
- Exceções com justificativa, limite e auditoria
- Confiança calibrada por contexto

### O que existe no código
- `policy-engine` com 27 patterns (Linux + Windows + PowerShell), evaluate/batch
- `security-middleware` com LlmGuard (injection detection, sensitive data scan, autonomy levels)
- `continuity-engine` com approvals de 3 níveis (dev, tech-lead, manager)
- `scope-isolation` com path validation
- `autonomy-policy.ts` com níveis N0-N4 (mencionado em AGENTS.md)

### Gap real: 🟡 MÉDIO
**Existe política básica mas:**
- ❌ Nenhuma classificação de risco formal (só block/ask/auto)
- ❌ Nenhuma matriz de risco combinando impacto x probabilidade
- ❌ Nenhum fluxo de aprovação integrado ao orchestrator
- ❌ Nenhuma política por ambiente (dev/staging/production) com regras diferentes
- ❌ Nenhuma exceção com auditoria e expiração
- ❌ Nenhuma calibragem de confiança baseada em histórico
- ⚠️ Cedar adapter existe mas não tem runtime real

### Oportunidades de melhoria
1. **Criar `packages/risk-classifier`** — classificação formal de risco com matriz impacto x probabilidade
2. **Criar `packages/approval-orchestrator`** — fluxo de aprovação integrado ao ciclo da tarefa
3. **Adicionar política por ambiente** — regras diferentes para dev/staging/production
4. **Criar `packages/policy-store`** — versionamento de políticas, exceções, histórico
5. **Criar `packages/trust-calibrator`** — ajuste dinâmico de autonomia baseado em histórico de sucesso

---

## Cluster 8: Checkpoints Inteligentes & Continuidade
**Capítulos:** 44, 58, 72

### O que o livro descreve
- Checkpoints de plano, execução, validação, reparo
- Diffs de execução (só o que mudou entre checkpoints)
- Retomada por estado: ler último checkpoint + eventos depois dele
- Sequenciamento entre tarefas com dependências
- Suspensão controlada: pausar, salvar, pedir aprovação, retomar
- Handoff entre tarefas com estado, decisões, pendências, riscos

### O que existe no código
- `continuity-engine` com timeline, escalonamento, decisões
- `checkpoint.ts` no agent-runtime (mencionado mas não lido totalmente)
- `audit-trail` com hash chain (pode ser usado para reconstruir estado)
- `memory-store` com persistência file-based

### Gap real: 🟡 MÉDIO
**Existe continuidade básica mas:**
- ❌ Nenhum checkpoint salvo durante execução de tarefa (só decisões)
- ❌ Nenhuma retomada real de tarefa interrompida
- ❌ Nenhum diff entre checkpoints (só estado completo)
- ❌ Nenhum sequenciamento entre tarefas com dependências
- ❌ Nenhum handoff formal entre tarefas
- ❌ Nenhum checkpoint de plano/execução/validação separados

### Oportunidades de melhoria
1. **Criar `packages/checkpoint-engine`** — checkpoints com diffs, snapshots parciais, retomada
2. **Adicionar checkpoints automáticos no Orchestrator** — antes/depois de cada step
3. **Criar `packages/task-sequencer`** — sequenciamento com dependências e handoff
4. **Integrar checkpoints com audit-trail** — hash chain cobre também o estado
5. **Criar `packages/session-recovery`** — retomada de sessão completa após queda

---

## Cluster 9: Supply Chain Security
**Capítulos:** 81, 91, 92, 93, 94, 95

### O que o livro descreve
- Procedência de artefatos: de onde veio, quem produziu, com qual versão
- Integridade: hash, checksum, assinatura
- Attestation: declaração verificável de como o artefato foi produzido
- Builds reproduzíveis com dependências travadas
- Promoção entre estágios com validação
- Atualização controlada de dependências
- Cadeia de confiança do prompt ao deploy
- Revisão de software gerado proporcional ao risco

### O que existe no código
- `delivery-orchestrator` com deploy pipeline, rollback, review gates
- `audit-trail` com hash chain (parcial para supply chain)
- `security-middleware` com output safety checking
- `correction-oracle` com detecção de secrets hardcoded

### Gap real: 🟡 MÉDIO
**Quase nada implementado:**
- ❌ Nenhum sistema de procedência de artefatos
- ❌ Nenhuma assinatura de artefatos
- ❌ Nenhum build reproduzível
- ❌ Nenhuma política de dependências com versionamento e CVE scan
- ❌ Nenhuma cadeia de confiança do prompt ao deploy
- ❌ Nenhuma promotion entre estágios com gates

### Oportunidades de melhoria
1. **Criar `packages/artifact-provenance`** — metadados de origem, hash, assinatura de artefatos
2. **Criar `packages/dependency-policy`** — política de dependências com CVE scan, versionamento
3. **Criar `packages/build-reproducibility`** — builds determinísticos com lockfiles e ambientes fixos
4. **Criar `packages/promotion-gates`** — promoção entre estágios com validação obrigatória
5. **Integrar supply chain ao delivery-orchestrator** — assinar antes de promover

---

## Cluster 10: Scaffolds, Snippets & Code Generation
**Capítulos:** 43, 69

### O que o livro descreve
- Autocomplete como acelerador de IA (não só humano)
- Formatters para reduzir diffs desnecessários e ruído visual
- Scaffolds: diretórios, arquivos base, config, testes, docs, pipelines
- Geração guiada por contrato: interface, padrão, formato esperado
- Snippets inteligentes: blocos prontos para tarefas recorrentes
- Templates de API, classes, testes, documentação, migração

### O que existe no código
- `prompt-pipeline` com templates e classificação
- `docs-generator` (existe como package)

### Gap real: 🟢 BAIXO (emergente)
**Quase nada implementado:**
- ❌ Nenhum sistema de scaffolds
- ❌ Nenhum snippet manager
- ❌ Nenhum template engine para geração guiada
- ❌ Nenhum formatter integrado ao fluxo do agente
- ✅ Autocomplete mencionado em AGENTS.md mas não como funcionalidade

### Oportunidades de melhoria
1. **Criar `packages/scaffold-engine`** — geração de estrutura de projetos/modulos
2. **Criar `packages/snippet-manager`** — snippets inteligentes com contexto
3. **Criar `packages/template-engine`** — templates com contratos e validação
4. **Criar `packages/code-formatter`** — formatação automática no fluxo do agente

---

## Cluster 11: Observabilidade Avançada
**Capítulos:** 28, 63, 88

### O que o livro descreve
- Tracing distribuído com correlation IDs
- Logs estruturados em JSON
- Métricas operacionais: duração, sucesso, retry, intervenção humana, tokens
- Telemetria de autonomia
- Dashboards operacionais
- Alertas acionáveis

### O que existe no código
- `logger` com Logger class
- `observability-engine` (package existe)
- `metrics-store` (package existe)
- `trace-propagation` (package existe)
- `telemetry` (package existe)
- `agent-runtime` com logging interno

### Gap real: 🟢 BAIXO (já tem base)
**Existe base mas:**
- ❌ Nenhum tracing distribuído real (correlation ID não propaga entre chamadas)
- ❌ Nenhum dashboard operacional
- ❌ Nenhum alerta configurado
- ⚠️ Métricas existem mas não são coletadas centralmente
- ⚠️ Logs não são estruturados em JSON consistentemente

### Oportunidades de melhoria
1. **Criar `packages/tracing-core`** — tracing distribuído com propagação de contexto
2. **Criar `packages/metrics-collector`** — coleta centralizada de métricas
3. **Criar `packages/alert-engine`** — alertas baseados em thresholds
4. **Padronizar logs estruturados em JSON** em todos os packages

---

## Resumo dos Gaps por Prioridade

| Prioridade | Cluster | Gap | Esforço | Impacto |
|-----------|---------|-----|---------|---------|
| 🔴 Crítico | 1. Prompt Pipeline & Token Economy | Nada implementado | Alto | Máximo |
| 🔴 Crítico | 2. Context Compression | Nada implementado | Alto | Máximo |
| 🟠 Alto | 3. Planning Engine | Base existe, sem profundidade | Alto | Alto |
| 🟠 Alto | 4. Multi-Agent Routing | Orquestração existe, roteamento não | Médio | Alto |
| 🟠 Alto | 5. Memory Hierarchy | Store existe, hierarquia não | Alto | Alto |
| 🟡 Médio | 6. Verification & Gates | Verificação existe, gates não | Médio | Alto |
| 🟡 Médio | 7. Policy & Risk | Política existe, risco não | Médio | Alto |
| 🟡 Médio | 8. Checkpoints | Continuidade existe, checkpoint não | Médio | Alto |
| 🟡 Médio | 9. Supply Chain | Quase nada | Alto | Médio |
| 🟢 Baixo | 10. Scaffolds & Snippets | Nada | Baixo | Médio |
| 🟢 Baixo | 11. Observabilidade Avançada | Base existe | Baixo | Médio |

---

## Recomendações de Próximos Passos

### Fase 1 (3-5 dias) — Fundação de Eficiência
1. **Context Compressor** — pacote que comprime contexto antes de enviar ao LLM
2. **Token Budget** — orçamento de tokens por tarefa com early exit
3. **Complexity Router** — classificação + roteamento por complexidade

### Fase 2 (3-5 dias) — Inteligência de Planejamento
4. **Planning Engine** — planejador com decomposição, dependências, risco, fallback
5. **Dependency Analyzer** — análise de dependências entre arquivos/módulos

### Fase 3 (3-5 dias) — Memória e Continuidade
6. **Memory Hierarchy** — refatorar memory-store para 4 níveis
7. **Checkpoint Engine** — checkpoints com retomada

### Fase 4 (2-3 dias) — Governança e Qualidade
8. **Risk Classifier** — classificação formal de risco
9. **Approval Orchestrator** — fluxo de aprovação integrado
10. **Quality Gates como barreira** — gates bloqueiam fluxo se falharem

### Fase 5 (2-3 dias) — Segurança e Supply Chain
11. **Artifact Provenance** — assinatura e procedência
12. **Dependency Policy** — política de dependências

---

> **Nota:** Este documento será o guia mestre para os estudos detalhados de cada cluster.
> Cada cluster será aprofundado em seu próprio estudo em `docs/ESTUDOS/` antes de qualquer implementação.
