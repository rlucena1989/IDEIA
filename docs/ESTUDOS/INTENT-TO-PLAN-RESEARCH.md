# Resolução de Intenção do Usuário e Geração de Especificação Executável

> **Data:** 2026-07-17
> **Propósito:** Pesquisa completa sobre metodologias, tecnologias e padrões para evoluir o fluxo "ideia vaga do usuário" → "plano executável com checkpoints" no ai-devkit
> **Base:** Análise do código-fonte do ai-devkit + pesquisa bibliográfica (arxiv, proceedings, papers 2023-2026)

---

## Sumário

1. [Metodologias e Padrões](#1-metodologias-e-padrões)
2. [Tecnologias Maduras vs Inovadoras](#2-da-tecnologia-mais-madura-à-mais-inovadora)
3. [Estudos Técnicos e Ensaios](#3-estudos-técnicos-e-ensaios)
4. [Riscos Técnicos e Mitigações](#4-riscos-técnicos-e-mitigações)
5. [Relevância para o Fluxo Ideia → Entrega](#5-relevância-para-o-fluxo-ideia--entrega)
6. [Reuso no ai-devkit](#6-reuso-no-ai-devkit)
7. [Conclusão e Recomendações](#7-conclusão-e-recomendações)

---

## 1. Metodologias e Padrões

### 1.1 Intent Classification (NLU/NLP)

**Abordagens Clássicas:**
- **Rasa Open Source:** Framework de NLU com pipeline configurável (tokenizer, featurizer, classifier). Usa DIET (Dual Intent and Entity Transformer) para classificação multi-intent. Suporte a few-shot via story-based training. Maturidade: muito alta (produção desde 2017).
- **LUIS (Microsoft) / Dialogflow (Google) / Lex (AWS):** NLU como serviço cloud. Intent + entity extraction. Limited by predefined schemas. Não se adaptam dinamicamente.
- **Descrição-based Zero-shot (Hong et al., 2024):** Usa descrições textuais de intents como entrada para LLMs (FLAN-T5, Llama). Rankeia top-k intents via similaridade semântica (mpnet-base-v2). Reduz input length em ~75% com perda mínima de acurácia.

**Abordagens LLM-based:**
- **Divide-Solve-Combine (DSCP) (Qin et al., 2025):** Decompõe detecção multi-intent em 3 estágios: divisão em sub-sentenças → solução intent-por-intent → combinação. Interpretabilidade explícita. Superior a Zero-CoT em benchmarks MIXATIS e MIXSNIPS.
- **Prompt-based vs Fine-tuning:** Descrições de alta qualidade no *teste* importam mais que no treino. Diversidade de descrições não melhora performance — uma descrição curada é melhor que 7 descrições automáticas.
- **Vozeflow (2024):** 500+ variações de prompt testadas. Conclusão: encoder NLU para top-10 candidatos + LLM para classificação final é o melhor custo-benefício.

**Relevância para ai-devkit:** O projeto não tem intent classifier real. O `inferTaskType()` em `cli/src/planner/task-spec.ts:3-12` é um switch-case de 6 palavras-chave. Para evoluir, precisa de classificação semântica real.

### 1.2 Task Decomposition

**Hierarchical Task Networks (HTN):** Abordagem clássica de planejamento de IA. Decompõe tarefas em sub-tarefas via rede hierárquica de métodos. Determinístico, mas exige domínio modelado manualmente.

**LLM-based Decomposition - Categorias (Liu et al., 2025):**
O estudo "Select-Then-Decompose" propõe 6 eixos de categorização:
1. **Sequência interleaving:** Decomposição antes vs durante a execução
2. **Número de chamadas LLM:** Única vs múltiplas
3. **Topologia:** Chain vs DAG vs Tree vs Graph
4. **Formato:** Texto livre vs JSON estruturado vs código
5. **Alcance da seleção:** Global vs incremental
6. **Uso de ferramentas:** Com vs sem

**Três insights críticos do estudo:**
- **Dilema performance-custo:** Nenhuma abordagem domina todas as tarefas
- **Características da tarefa determinam a abordagem:** CoT para matemática, P&E(DAG) para escrita, ReAct para código
- **Escalar o executor > escalar o decompositor:** Modelo de execução forte compensa mais que modelo de decomposição forte

**ADAPT (Prasad et al., 2024):** Decomposição "as-needed". Só decompõe quando executor falha. Recursivo com profundidade máxima. Operadores lógicos AND/OR entre sub-tarefas. Até 28.3% melhor que ReAct em ALFWorld.

### 1.3 Chain-of-Thought (CoT) Prompting

Wei et al. (2022) - "Let's think step by step". **O padrão mais simples e difundido.**

**Variações:**
- **Zero-shot-CoT (Kojima, 2022):** Apenas adiciona "Let's think step by step" ao prompt
- **Few-shot CoT:** Exemplos de raciocínio passo-a-passo no prompt
- **Self-Consistency (Wang et al., 2023):** Amostra múltiplas chains, marginaliza para resposta mais consistente

**Limitações conhecidas:**
- Cálculo errado, passos faltantes, erro semântico (Wang et al., 2023)
- Perde foco em horizontes longos (Xie et al., 2024)
- Propaga erro inicial (Zhang et al., 2024 - "snowball hallucinations")

### 1.4 Tree-of-Thoughts (ToT)

Yao et al. (2023) / Long (2023). **Generaliza CoT para árvore de exploração.**

**Mecanismo:**
1. Decompõe em estados intermediários (nós da árvore)
2. Gerador de pensamentos cria k candidatos por nó
3. Avaliador (LLM ou humano) pontua cada candidato
4. Algoritmo de busca (BFS/DFS) gerencia a exploração

**Performance:** 74% sucesso vs 4% CoT em tarefas de planejamento (Game of 24).
**Custo:** 7.2× mais tokens que Plan-and-Solve (estudo financeiro, 2026).

**Graph-of-Thoughts (GoT, Besta et al., 2024):** Generaliza ToT para grafos. Permite agregação de múltiplos pensamentos, loops de refinamento.

### 1.5 ReAct (Reasoning + Acting)

Yao et al. (2023). **Intercala raciocínio e ação em loop.**

**Problema fundamental revelado (Verma et al., 2024 - "Brittle Foundations"):**
- Performance NÃO vem do interleaving ou do reasoning trace
- Vem da similaridade entre exemplos few-shot e o query tâsk
- Placebo guidance (texto irrelevante) tem performance comparável
- ReAct é frágil: variações triviais no prompt derrubam performance

**Implicação:** ReAct não é um padrão confiável para planejamento de longo horizonte. Útil para tarefas curtas e interativas.

### 1.6 Plan-and-Execute Pattern

Wang et al. (2023) - Plan-and-Solve (PS) Prompting.

**Abordagem:**
1. **Plan:** "Let's first devise a plan to solve the problem"
2. **Execute:** "Then, let's carry out the plan step by step"

**PS+:** Adiciona "extract relevant variables" e "calculate intermediate results" ao prompt. Reduz erros de cálculo (5%) e passos faltantes (7%).

**Na prática (BestHub, 2026):**
- Plano deve ser um **grafo de dependências**, não lista textual
- Cada nó: task ID, inputs, outputs esperados, dependências, ferramentas, critérios de aceitação, failure handling
- Permite paralelização, recuperação e verificação

**LangChain Plan-and-Execute:** Implementação de referência. Planner → task list → executor que itera sobre ela.

### 1.7 Specification by Example (SBE), Gherkin, BDD

**Specification by Example:** Metodologia onde requisitos são especificados através de exemplos concretos, não descrições abstratas.

**Gherkin:** Linguagem estruturada (Given/When/Then) para especificação executável.

**BDD (Behavior-Driven Development):** Ciclo: especificar comportamento em Gherkin → implementar → verificar.

**Relevância:** O ai-devkit já tem `spec-generator/` com parser Gherkin e gerador de stubs de teste. `gherkin-parser.ts` e `test-stub-generator.ts` existem e funcionam.

### 1.8 Architecture Decision Records (ADRs)

ADRs documentam decisões arquiteturais com formato: Contexto → Decisão → Consequências.

**No fluxo idea→plano:** ADRs devem ser OUTPUT do planejamento, não só documentação. Cada checkpoint do plano pode gerar um ADR anexado.

**No ai-devkit:** Pacote `architecture-adr/` existe. O CLI tem `adr new/index`. Pode ser integrado.

### 1.9 Domain-Driven Design (DDD)

DDD mapeia domínios de negócio em modelos de software. Útil para a fase de "decomposição de domínio" após a classificação da intenção.

**No fluxo idea→plano:** Após identificar "quero um SaaS de assinaturas", DDD ajuda a mapear: Bounded Contexts (Assinaturas, Pagamentos, Notificações), Entidades (Assinante, Plano, Ciclo de Cobrança), Value Objects, Domain Events.

---

## 2. Da Tecnologia Mais Madura à Mais Inovadora

### 2.1 Tecnologias Maduras

| Tecnologia | Maturidade | Uso no Fluxo idea→plano | Prós | Contras |
|-----------|-----------|------------------------|------|---------|
| **Rasa / Dialogflow** | Muito alta (produção 7+ anos) | Intent classification inicial | Robusto, documentado, multi-idioma | Schema fixo, não adaptativo, não gera planos |
| **LangChain** | Alta (3+ anos, 100K+ stars) | Plan-and-Execute chains, agent orchestration | Flexível, muitos integradores, comunidade ativa | Abstração vazada, mudanças frequentes de API |
| **Haystack** | Alta (3+ anos) | Pipeline-based NLP, RAG | Pipelines tipados, components reutilizáveis | Foco em retrieval, não em planejamento |
| **Apache Beam / Airflow** | Muito alta (produção 10+ anos) | DAG-based workflow execution | Testado em escala, resumível, monitorável | Pesado, não projetado para LLM |
| **BDD (Cucumber, SpecFlow, Behat)** | Muito alta (15+ anos) | Especificação executável pós-plano | Padrão maduro, ferramentas maduras | Esforço de escrita dos cenários |
| **OpenAPI / AsyncAPI** | Muito alta | Spec-first development | Ecossistema gigante, codegen | Só cobre API, não o plano completo |

### 2.2 Tecnologias Inovadoras

| Tecnologia | Ano | Inovação | Status | Prós | Contras |
|-----------|-----|---------|--------|------|---------|
| **AutoGPT** | 2023 | Decomposição autônoma com self-prompting | Arquivado (classic) / Reescrito (platform) | Padrão fundacional, modular | Loop infinito, custo alto, critic é o elo fraco |
| **BabyAGI** | 2023-2026 | 9 iterações de task list → function runtime → autonomous assistant | Ativo (v3, 33K linhas) | Evolução clara: task list → DAG → tools → LLM-as-planner | Complexidade cresceu muito |
| **TaskWeaver (Microsoft)** | 2024 | Code-first agents com type-safe plugin system | Ativo | Tipagem forte, geração de código como planejamento | Foco enterprise, menos flexível |
| **MetaGPT** | 2024 | SOPs como prompts multi-agente, assembly line paradigm | Ativo (ICLR 2024) | Especificação completa (PRD→Design→Tasks→Code), roles especializados | Custo alto (5+ agents), cascading hallucinations |
| **ChatDev** | 2024 | Agentes colaborativos via chat estruturado | Ativo | Comunicação via chat, ciclo plan→code→test | Qualidade do código gerado ainda limitada |
| **SWE-Agent** | 2024 | Agent-Computer Interface (ACI) para engenharia de software | Ativo (NeurIPS 2024) | Foco em interface agente-computador, não em modelo | Só SWE-bench tasks |
| **Devin** | 2024-2026 | Planner/Executor split, sandboxed VM, structured plan state | Comercial | Planner pesado e infrequente, executor leve e constante, planos editáveis pelo usuário | Fechado, caro, dependência de cloud |
| **Voyager** | 2023 | Skill discovery + task decomposition em Minecraft | Pesquisa | Currículo automático de habilidades | Específico Minecraft |
| **Generative Agents (Stanford)** | 2023 | Comportamento humano crível com memória e reflexão | Pesquisa | Memória arquitetural (stream→retrieve→reflect→plan) | Não escala para engenharia de software |

### 2.3 Arquitetura de Agentes de Engenharia de Software (Síntese 2026)

O survey "Agentic Software Engineering" (arXiv:2604.26275, 2026) propõe **6 camadas de referência** para sistemas agentes de engenharia de software:

```
L5 - Supervisão Humana  : approval gates, escalation, feedback
L4 - Orquestração        : planner/executor split, memory management
L3 - Ferramentas          : shell, browser, file I/O, git
L2 - Cognitive Scaffolding: CoT, ReAct, self-critique, memory files
L1 - Modelo               : LLM base (GPT-4o, Claude, etc.)
L0 - Infra                : sandbox, runtime, isolamento
```

**Convergência observada:** Todos os programas majoritários expõem:
1. CLI ou IDE-resident agent com shell, file e test-runner
2. Human-in-the-loop approval em ações de alto impacto
3. Alguma forma de memória de longo prazo
4. Execução paralela/multi-agente
5. Narrativa forte de segurança e auditoria

**Curva de performance em SWE-bench Verified:**
- Out 2023: 1.96% (RAG baseline)
- Abr 2026: 78.4% (Claude Opus 4.7)
- **Ganho dominado por scaffolding, não por modelo bruto**

---

## 3. Estudos Técnicos e Ensaios

### 3.1 Plan-and-Solve Prompting (Wang et al., 2023)

**Problema:** Zero-shot-CoT sofre de 3 tipos de erro — cálculo, missing-step, semântico.

**Solução:** Substitui "Let's think step by step" por "Let's first understand the problem and devise a plan to solve the problem. Then, let's carry out the plan and solve the problem step by step."

**PS+:** Adiciona "extract relevant variables" e "calculate intermediate results".

**Resultados:** PS+ supera Zero-shot-CoT em todos os 10 datasets. Comparable a few-shot CoT em raciocínio matemático.

**Limitação:** Sensível ao wording do prompt. Não resolve erro semântico.

### 3.2 Tree of Thoughts (Wei/Yao et al., 2023)

**Proposição:** CoT é muito linear para problemas que exigem exploração e backtracking.

**Mecanismo:** Decomposição em thought states → geração de k candidatos por estado → avaliação (LLM classifier ou votação) → busca (BFS/DFS).

**Resultado chave:** 74% vs 4% CoT em Game of 24. ToT leva vantagem onde decisões iniciais são críticas.

**Custo:** Significativamente maior que CoT (7.2× tokens em estudo financeiro).

### 3.3 Self-Refine (Madaan et al., 2023)

**Ciclo:** Gerar → Feedback → Refinar → (loop).

**Aplicação no planejamento:** O plano gerado inicialmente é avaliado pelo próprio LLM, que identifica falhas e sugere melhorias. O ciclo repete até critério de parada.

**Efetividade:** Melhora consistente em tarefas de diálogo, código e raciocínio. Cada iteração adiciona ~20-40% de tokens.

### 3.4 Generated Knowledge Prompting (Liu et al., 2022)

**Abordagem:** Antes de responder, o LLM gera conhecimento relevante sobre o domínio. Esse conhecimento é então usado como contexto adicional.

**Aplicação no fluxo idea→plano:** Antes de decompor "quero um SaaS de assinaturas", o LLM gera conhecimento sobre modelos de negócio de SaaS, billing cycles, churn management, etc.

### 3.5 Select-Then-Decompose (Liu et al., 2025)

**Framework de 3 estágios:**
1. **Selection:** Escolhe abordagem de decomposição baseada na complexidade da tarefa
2. **Execution:** Aplica a abordagem escolhida
3. **Validation:** Avalia confiança da solução; se < threshold, faz fallback para abordagens mais sofisticadas (IO → CoT/P&S → ReAct/P&E/P&E(DAG))

**Princípio prático chave:** O DGI (Decomposition Granularity Index) ótimo escala como √S (raiz quadrada dos passos mínimos). Para S=10, DGI*=2.7 (~27 sub-tarefas).

### 3.6 Estudo de Granularidade de Decomposição (clawRxiv, 2026)

**Fase diagrama empírica com 1.200 tarefas:**

| Regime | DGI* | Peak Success | Window Width |
|--------|------|-------------|-------------|
| Simples (ex: um commit) | 1.0-1.2 | 0.89 | 0.4 |
| Moderado (ex: uma feature) | 1.8-2.4 | 0.81 | 0.6 |
| Complexo (ex: um módulo) | 3.0-4.5 | 0.64 | 1.7 |

**Descoberta crítica:** A janela ótima ESTREITA com a complexidade. Pequenas variações na granularidade podem empurrar o plano da Fase II (ótima) para Fase I (under-decomposition) ou III (over-decomposition).

**Heurística prática:** `DGI* ≈ 0.85√S`. Para uma task de 10 passos, ~27 sub-tarefas (DGI ≈ 2.7).

### 3.7 Estudo de Erro em Planejamento (PDoctor, Ji et al., 2024)

**Framework PDoctor:** Sintetiza entradas de usuário com Z3 + DSL → detecta planos errôneos por violação de constraints.

**Descobertas:**
- Erros mais comuns: parâmetro errado (data, hora), ordem incorreta, constraints ignoradas
- Modelos tendem a errar mais quando múltiplos tipos de requisito precisam ser simultaneamente atendidos
- O erro inicial propaga (snowball effect)

### 3.8 SWE-bench como Benchmark

**SWE-bench Verified:** 500 issues reais de 12 repositórios Python populares.
**Estado da arte:** 78.4% (Claude Opus 4.7 + scaffolding, Abr 2026).
**HumanEval/MBPP:** Benchmarks de geração de código, não de planejamento.
**Limitação:** SWE-bench testa resolução de bugs, não geração de especificação do zero.

### 3.9 Comparação: Fine-tuning vs In-context Learning vs RLHF

| Dimensão | Fine-tuning | In-context Learning | RLHF |
|---------|------------|-------------------|------|
| Custo inicial | Alto (GPU/dados) | Baixo (prompt design) | Muito alto (RL loop) |
| Flexibilidade | Baixa (modelo fixo) | Alta (troca prompt) | Média |
| Performance | Alta em domínio específico | Média-alta (depende do prompt) | Alta |
| Manutenção | Retreinar | Editar prompt | Retreinar |
| Controle | Alto (pesos ajustados) | Baixo (dependente do modelo) | Médio-alto |

**Recomendação para o fluxo idea→plano:** In-context learning com prompts estruturados é suficiente para a fase atual. Fine-tuning pode ser considerado para domínios específicos (ex: planos para NestJS com Clean Architecture).

---

## 4. Riscos Técnicos e Mitigações

### 4.1 Plan Hallucination

**Problema:** IA gera um plano que parece coerente mas não faz sentido quando executado. Etapas inventadas, dependências irreais, prazos imaginários.

**Pesquisa:** Zhang et al. (2024) - "Hallucinations Can Snowball". LMs produzem alegações incorretas que elas MESMAS reconheceriam como erradas em isolamento (GPT-4 identifica 87% dos próprios erros). O problema é que o erro inicial **contamina** os passos seguintes, gerando uma cascata.

**Mitigações:**
1. **Validation module** no plano (Select-Then-Decompose): após gerar, avaliar confiança. Se < threshold, refazer com abordagem diferente.
2. **Checkpoint de aprovação humana** antes de executar (já existe no ai-devkit como `approval-flow.ts`, mas não integrado ao planner)
3. **Verificação isolada de cada passo:** testar cada sub-tarefa independentemente antes de prosseguir
4. **Digital twin/simulação** do plano antes da execução real (o `cognitive-coprocessor/simulate.ts` já faz simulação)

### 4.2 Over-decomposition

**Problema:** Plano muito granular (30+ sub-tarefas para algo simples). Custo alto de LLM calls, tempo de execução, chance de erro em alguma sub-tarefa.

**Evidência:** Estudo DGI (clawRxiv, 2026) mostra que over-decomposition (Fase III) reduz sucesso de 0.81 para 0.42 no regime moderado.

**Mitigações:**
1. **Decomposição adaptativa** (ADAPT): só decompõe quando o executor falha, não upfront
2. **Limite de granularidade:** DGI* ≈ 0.85√S como heurística de controle
3. **Agrupamento de sub-tarefas:** pós-decomposição, merge de tarefas que podem ser executadas juntas
4. **Parallel groups:** usar DAG para paralelizar sub-tarefas independentes, reduzindo tempo total

### 4.3 Under-decomposition

**Problema:** Plano muito vago ("Implementar feature X"). Ambiguidade leva a execução incorreta (a IA decide SOZINHA o que fazer, com alto risco de alucinação).

**Mitigação:**
1. **Template de especificação mínima:** cada sub-tarefa deve ter: objetivo, critério de aceitação, dependências, riscos, output esperado
2. **Human-in-the-loop:** se o plano tiver sub-tarefas vagas, o planner deve perguntar ao usuário para detalhar
3. **Critic stage:** após gerar plano, LLM avalia se cada sub-tarefa é "executável sem ambiguidade"

### 4.4 Goal Misalignment

**Problema:** O que o usuário quer vs o que a IA interpreta podem ser diferentes. O usuário diz "quero um SaaS de assinaturas" e a IA assume stripe, next.js, PostgreSQL — mas talvez o usuário queira algo simples com PayPal e Firebase.

**Pesquisa:** Xie et al. (2024) - "Revealing the Barriers of Language Agents in Planning". Constraints têm papel limitado no planejamento dos agentes (attribution score < 25 de 100). A influência da pergunta original DIMINUI conforme o plano cresce.

**Mitigações:**
1. **Clarification loop:** antes de gerar plano, fazer perguntas de esclarecimento ao usuário (tecnologia, orçamento, prazo, restrições)
2. **Intents + constraints explícitos:** separar o QUE o usuário quer das RESTRIÇÕES (como fazer)
3. **Re-rank de plano:** gerar múltiplos planos, ranquear por alinhamento com intenção original
4. **ADRs anexados:** cada decisão arquitetural documentada com rationale, permitindo detecção de desalinhamento

### 4.5 Confirmation Bias

**Problema:** A IA tende a confirmar o próprio plano mesmo quando errado — o critic loop usa o MESMO modelo que gerou o plano.

**Evidência:** O loop AutoGPT: `decompose_goal` → `execute_subtask` → `evaluate_progress`. O evaluate_progress é o mesmo LLM. O modelo é enviesado a achar que "está bom".

**Mitigação:**
1. **Critic separado:** usar modelo diferente ou prompt diferente para avaliação (ex: GPT-4o para plano, GPT-4o-mini para crítica)
2. **Human-as-critic obrigatório** em planos de alto risco (já existe approval-flow no ai-devkit)
3. **Testes concretos:** não perguntar "o plano está bom?", mas "dado este teste, o plano passa?"
4. **Adversarial check:** gerador de plano e verificador de plano são roles separados (padrão MetaGPT)

### 4.6 Cascading Errors

**Problema:** Um erro no passo inicial (ex: interpretação errada do requisito) se propaga para todas as sub-tarefas seguintes. O plano inteiro fica comprometido.

**Evidência:** Predictive-Decoding (Ma et al., 2024) mostra que mais da metade dos processos de raciocínio em tarefas de matemática são míopes — o modelo perde consciência global após alguns passos. O erro se acumula e se torna evidente só após vários passos.

**Mitigações:**
1. **Checkpoints de verificação:** após cada N passos, reavaliar o plano contra a intenção original
2. **Foresight durante geração:** Predictive-Decoding usa Model Predictive Control para gerar olhando para frente (foresight trajectories). 7.2% melhora em GSM8K, 25.3% em ALFWorld.
3. **Rollback automático:** se um checkpoint falha, reverter para o último ponto válido (similar ao `checkpoint-manager.ts` existente)
4. **Decomposição com fallback:** Select-Then-Decompose faz fallback progressivo (IO → CoT → ReAct → P&E)

---

## 5. Relevância para o Fluxo Ideia → Entrega

### 5.1 Como transformar "quero um SaaS de assinaturas" em módulos executáveis

Pipeline proposto (baseado na convergência Devin + MetaGPT + Select-Then-Decompose):

```
Fase 0: Esclarecimento
  Entrada: "quero um SaaS de assinaturas"
  SAÍDA: Intents + Constraints (tecnologia, prazo, orçamento, features)
  TÉCNICA: Clarification loop + intent classification via LLM

Fase 1: Decomposição de Domínio
  Entrada: Intents + Constraints
  SAÍDA: Bounded Contexts (Assinaturas, Pagamentos, Usuários, Notificações)
  TÉCNICA: DDD-style decomposition com LLM + templates de domínio

Fase 2: Decomposição Funcional
  Entrada: Bounded Contexts
  SAÍDA: Módulos com especificações Gherkin + critérios de aceitação
  TÉCNICA: MetaGPT-style SOP (Product Manager → Architect → Project Manager)
  
Fase 3: Plano Executável
  Entrada: Módulos com especificações
  SAÍDA: DAG de tarefas com dependências, checkpoints, approval gates
  TÉCNICA: Plan-and-Execute com grafo de dependências

Fase 4: Execução com Verificação
  Entrada: DAG de tarefas
  SAÍDA: Código implementado, testes passando, ADRs documentados
  TÉCNICA: SWE-agent/Devin-style executor loop + test-first verification

Fase 5: Revisão e Iteração
  Entrada: Resultados da execução
  SAÍDA: Feedback para o plano (replan se necessário)
  TÉCNICA: Self-Refine + human review
```

### 5.2 O papel dos checkpoints de aprovação humana no plano

Cada checkpoint representa um **ponto de decisão** que requer validação humana:

| Checkpoint | O que o humano valida | Risco se pular |
|-----------|---------------------|----------------|
| **Intenção** | "É isso mesmo que você quer?" | Goal misalignment total |
| **Domínio** | "Os bounded contexts estão corretos?" | Arquitetura errada |
| **Especificação** | "As features priorizadas são as certas?" | Feature creep |
| **Plano** | "A ordem e granularidade estão boas?" | Over/under-decomposition |
| **PR/Código** | "O código implementa o que foi especificado?" | Bugs e dívida técnica |

**Integração com approval-flow existente:** O `approval-flow.ts` já tem `createApprovalRequest()` e `approveAction()`. Precisa ser estendido para:
- Associar approval a checkpoints específicos do plano
- Suportar approval parcial (aprovar sub-conjunto do plano)
- Persistir approvals (hoje é in-memory)

### 5.3 Como a IA deve apresentar o plano para o usuário validar

**Padrão Devin (estrutura JSON inspecionável):**
```
O plano não deve ser prosa — deve ser uma estrutura de dados que o usuário possa:
1. VER: Navegar pelas fases, módulos, dependências
2. EDITAR: Reordenar, remover, adicionar passos
3. APROVAR: Dar ok em cada checkpoint (não só no plano inteiro)
```

**Apresentação recomendada:**

```
📋 Plano para: "SaaS de Assinaturas"

Fase 1: Autenticação e Usuários
  [✅] Módulo: Cadastro de usuários (login email + Google)
  [⏳] Módulo: Perfil e preferências
  [🔴] Módulo: Convite de membros (RISCO: precisa de email service)

Fase 2: Planos e Precificação
  [✅] Módulo: CRUD de planos (mensal/anual)
  [✅] Módulo: Grade de preços por região

... (cada módulo expansível para ver Gherkin specs)

⚠️ 3 decisões arquiteturais detectadas (clique para ver ADRs)
🔧 5 tarefas paralelizáveis
💰 Estimativa: 2-3 semanas com 1 dev
```

### 5.4 O ciclo: pergunta → plano → aprova → executa → aprende

```
        ┌──────────────────────────────────────────────────────────┐
        │                                                          │
        ▼                                                          │
  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    │
  │ PERGUNTA  │───▶│  PLANO   │───▶│ APROVA   │───▶│ EXECUTA  │───┘
  │ (usuário) │    │  (IA)    │    │ (humano)  │    │  (IA)    │
  └──────────┘    └──────────┘    └──────────┘    └──────────┘
       ▲                                                │
       │                                                ▼
       │                                         ┌──────────┐
       └─────────────────────────────────────────│ APRENDE   │
          (feedback loop)                        │ (sistema) │
                                                 └──────────┘
```

**Cada ciclo gera aprendizado que alimenta o próximo:**
- **Memória:** O que foi aprovado/rejeitado? Quais módulos tiveram mais revisões?
- **Padrões:** O usuário sempre rejeita planos com dependências externas? Prefere granularidade fina?
- **Estimativas:** Prazos estavam corretos? O que surpreendeu o usuário?

**No ai-devkit:** A base existe (`memory/`, `pattern-detector.ts`, `learning-engine.ts`) mas é heurística e in-memory. Precisa de persistência e integração com o ciclo.

---

## 6. Reuso no ai-devkit

### Avaliação de Cada Tecnologia/Padrão

#### 6.1 Intent Classification

| Item | Existe? | Status | Precisa criar? | Complexidade |
|------|---------|--------|---------------|-------------|
| Rasa/Dialogflow | Não | Não existe | Do zero (ou wrapper) | Alta (infra externa) |
| LLM-based intent (descrições) | Parcial | `inferTaskType()` é keyword-matching | Adaptar | Baixa (usar LLM provider já existente) |
| Multi-intent detection (DSCP) | Não | Não existe | Criar | Média (prompt engineering) |
| Descrição-based zero-shot | Não | Não existe | Criar | Média (precisa de ranker) |

**Recomendação:** Usar o provider router existente (`cli/src/local-ai/providers/`) para intent classification via LLM com descrições. Não precisa de Rasa/Dialogflow.

#### 6.2 Task Decomposition

| Item | Existe? | Status | Precisa criar? | Complexidade |
|------|---------|--------|---------------|-------------|
| HTN clássico | Não | Não existe | Do zero | Alta (domínio modelado manualmente) |
| CoT decomposition | Parcial | `task-spec.ts` tem keyword inference | Melhorar | Baixa |
| ADAPT (as-needed) | Não | Não existe | Criar | Média |
| Select-Then-Decompose | Não | Não existe | Criar | Alta (framework novo) |

**Recomendação:** Implementar ADAPT-style: decomposição sob demanda, com fallback progressivo. Reutilizar `workflow-engine.ts` como base para o DAG.

#### 6.3 Prompting Patterns

| Item | Existe? | Status | Precisa criar? | Complexidade |
|------|---------|--------|---------------|-------------|
| Zero-shot-CoT | Não | Prompts existentes são manuais | Adicionar template | Baixa |
| Plan-and-Solve | Parcial | `plan.ts` e `execution-plan.ts` existem mas são estáticos | Evoluir para PS+ | Média |
| Tree-of-Thoughts | Não | Não existe | Criar para casos complexos | Alta |
| Self-Refine | Parcial | `cognitive-coprocessor/validate.ts` existe | Integrar ao planner | Média |
| ReAct | Parcial | `execution-layer.ts` tem circuit breaker + retry | Adaptar para ReAct loop | Média |

**Recomendação:** Migrar `plan.ts` de template estático para Plan-and-Solve dinâmico. Adicionar Self-Refine pós-geração. ToT apenas em pontos de decisão crítica.

#### 6.4 Especificação Executável

| Item | Existe? | Status | Precisa criar? | Complexidade |
|------|---------|--------|---------------|-------------|
| Gherkin parser | ✅ Sim | `spec-generator/gherkin-parser.ts` pronto | Nada | - |
| Test stub generator | ✅ Sim | `spec-generator/test-stub-generator.ts` pronto | Nada | - |
| BDD framework integration | Parcial | Gherkin gerado mas não executado | Integrar com test runner | Média |
| ADR como output | ✅ Sim | `architecture-adr/` existe | Conectar ao planner | Baixa |
| DDD mapping | Não | Não existe | Criar templates de domínio | Média |

**Recomendação:** Conectar spec-generator ao fluxo de planejamento. Cada módulo do plano gera automaticamente Gherkin + test stubs + ADR.

#### 6.5 Orquestração

| Item | Existe? | Status | Precisa criar? | Complexidade |
|------|---------|--------|---------------|-------------|
| Workflow DAG | ✅ Sim | `workflow-engine.ts` com steps + dependências | Conectar ao planner | Média |
| Execution layer | ✅ Sim | `execution-layer.ts` com circuit breaker + retry | Conectar ao workflow | Média |
| Delivery orchestrator | ✅ Sim | `delivery-orchestrator.ts` com review gates | Integrar checkpoints | Média |
| Checkpoint manager | ✅ Sim | `runtime/checkpoint-manager.ts` (390 linhas) | Conectar ao plano | Baixa |
| Phase orchestrator | ✅ Sim | `runtime/phase-orchestrator.ts` (520 linhas) | Adaptar para idea→plano | Média |

**Recomendação:** O ai-devkit já tem TODOS os componentes de orquestração. O gap é a conexão: planner → workflow → execution → checkpoint → delivery. Atualmente são ilhas.

#### 6.6 Cognitive Coprocessor (Hub Central)

| Item | Existe? | Status | Precisa criar? | Complexidade |
|------|---------|--------|---------------|-------------|
| normalize | ✅ Sim | Pronto | Conectar | Baixa |
| metrics | ✅ Sim | Pronto | Conectar | Baixa |
| rank | ✅ Sim | Pronto | Conectar | Baixa |
| simulate | ✅ Sim | Pronto | Conectar | Baixa |
| validate | ✅ Sim | Pronto | Conectar | Baixa |
| hints | ✅ Sim | Pronto | Conectar | Baixa |

**Recomendação:** O Cognitive Coprocessor é o hub ideal. Deve processar a intenção do usuário ANTES de gerar o plano e validar o plano DEPOIS de gerado. Já está documentado como hub na análise `INTELLIGENT-MODULES-ANALYSIS.md`.

#### 6.7 Approval Flow

| Item | Existe? | Status | Precisa criar? | Complexidade |
|------|---------|--------|---------------|-------------|
| Approval request | ✅ Sim | `approval-flow.ts` pronto | Estender para checkpoints | Baixa |
| Approval grant | ✅ Sim | `approve.ts` grant/deny pronto | Estender para parcial | Baixa |
| Persistência | ❌ Não | In-memory | Adicionar persistência | Média |
| Associação a planos | ❌ Não | Não existe | Criar integração | Média |

#### 6.8 Agentes e Autonomia

| Item | Existe? | Status | Precisa criar? | Complexidade |
|------|---------|--------|---------------|-------------|
| Agent registry | ✅ Sim | Pronto | Nada | - |
| Agent coordinator | ✅ Sim | Pronto | Conectar ao planner | Média |
| Multi-agent collab | ✅ Sim | `local-ai/collaboration.ts` (350 linhas) | Adaptar para roles | Alta |
| Autonomous cycles | ✅ Sim | `autonomous/` (8 arquivos) | Conectar a checkpoints | Média |
| Self-correction | ✅ Sim | `self-correction-engine.ts` pronto | Integrar | Média |

#### 6.9 Memória e Aprendizado

| Item | Existe? | Status | Precisa criar? | Complexidade |
|------|---------|--------|---------------|-------------|
| Memory store | ✅ Sim | In-memory | Adicionar persistência | Média |
| Pattern detector | ✅ Sim | Heurístico (frequência) | Substituir por LLM | Média |
| Learning engine | ✅ Sim | Heurístico (threshold) | Substituir por LLM | Média |
| Policy adapter | ✅ Sim | Heurístico (auto-approve) | Substituir por LLM | Alta |

**Recomendação:** Memória e aprendizado são críticos para o ciclo pergunta→plano→aprova→executa→aprende. Sem persistência, o sistema não melhora entre sessões.

#### 6.10 Resumo da Avaliação

| Componente | Existe? | Status | Conectado ao fluxo idea→plano? | Prioridade |
|-----------|---------|--------|-------------------------------|-----------|
| Intent classifier | Parcial | Keyword matching | ❌ Não | 🔴 Alta |
| Task decomposer | Parcial | Template estático | 🟡 Parcial | 🔴 Alta |
| Spec generator | ✅ Sim | Gherkin + stubs | ❌ Não conectado | 🟡 Média |
| Workflow engine | ✅ Sim | DAG com dependências | 🟡 Parcial | 🔴 Alta |
| Execution layer | ✅ Sim | Circuit breaker + retry | 🟡 Parcial | 🟡 Média |
| Checkpoint manager | ✅ Sim | SHA-256, persistente | ❌ Não conectado | 🟡 Média |
| Cognitive coprocessor | ✅ Sim | 8 estágios completo | ❌ Não conectado | 🔴 Alta |
| Approval flow | ✅ Sim | Request/grant/deny | 🟡 Parcial | 🟡 Média |
| ADR manager | ✅ Sim | ADR new/index | ❌ Não conectado | 🟢 Baixa |
| Memory store | ✅ Sim | In-memory | ❌ Não conectado | 🟡 Média |
| Pattern learning | ✅ Sim | Heurístico | ❌ Não conectado | 🟢 Baixa |
| LLM provider router | ✅ Sim | 4 providers + Ollama | ✅ Direto | - |

---

## 7. Conclusão e Recomendações

### 7.1 Abordagem Recomendada

**Fase 1 — Conectar o que já existe (2-3 semanas)**

O maior ganho imediato não é criar nada novo — é **conectar os componentes existentes**:

```
CURRENT STATE:
  planner/ ──❌── workflow-engine/ ──❌── execution-layer/
  spec-generator/ ──❌── approval-flow/
  cognitive-coprocessor/ ──❌── memory/

TARGET STATE:
  [cognitive-coprocessor] → normalize(intent) → validate(plan)
        ↓                          ↓
  [planner] → createExecutionPlan(intent) → TaskSpec[]
        ↓
  [workflow-engine] → Workflow com steps + dependências
        ↓
  [spec-generator] → para cada step, Gherkin + test stub + ADR
        ↓
  [approval-flow] → checkpoint de aprovação por fase
        ↓
  [execution-layer] → executa com circuit breaker + retry
        ↓
  [memory] → persiste resultado + padrões
```

**Ações concretas:**
1. Substituir `inferTaskType()` por LLM-based intent classification usando o provider router existente
2. Conectar `plan.ts` a `workflow-engine.ts` (plano vira workflow)
3. Conectar `workflow-engine.ts` a `execution-layer.ts` (cada step vira execução com retry)
4. Conectar `spec-generator` ao workflow (cada step gera spec Gherkin + stubs + ADR)
5. Integrar `cognitive-coprocessor` como entrada (normaliza intent) e saída (valida plano)
6. Adicionar persistência ao approval-flow

**Fase 2 — Decomposição Adaptativa (2-3 semanas)**

Implementar **ADAPT-style** para decomposição sob demanda:
1. Gera plano inicial de alto nível (3-5 steps)
2. Antes de executar cada step, verifica se é executável diretamente
3. Se não for, decompõe recursivamente (com profundidade máxima)
4. Se falhar, faz fallback para abordagem mais granular

**Por que ADAPT e não outras:**
- Custo menor que decomposição upfront (só decompõe quando precisa)
- Adapta à capacidade do modelo executor (não força granularidade fixa)
- Mais robusto que ReAct (não sofre do "brittle foundations" problem)

**Fase 3 — Loop de Aprendizado (2-3 semanas)**

Fechar o ciclo pergunta→plano→aprova→executa→aprende:
1. Cada plano executado vira `MemoryRecord` em `memory-store.ts`
2. `pattern-detector.ts` identifica padrões: tipos de plano que o usuário mais aprova, granularidade preferida, riscos recorrentes
3. Hints do `cognitive-coprocessor` incorporam aprendizado histórico
4. Calibragem automática: se usuário sempre rejeita planos muito granulares, o DGI* se ajusta

### 7.2 Como Integrar com o Approval Flow Existente

O approval flow atual (`approval-flow.ts` + `approve.ts`) precisa de extensões:

```typescript
// Atual: approval por ação atômica
interface ApprovalRequest {
  approvalId: string;
  action: string;          // "deploy to production"
  requestedBy: string;
  reason: string;
  status: 'pending';
}

// Novo: approval por checkpoint de plano
interface PlanCheckpointApproval {
  checkpointId: string;
  planId: string;
  phase: 'intent' | 'domain' | 'spec' | 'plan' | 'execution';
  summary: string;          // IA gera resumo executivo
  detailsUrl: string;       // link para o plano detalhado
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  options: ApprovalOption[]; // múltiplas alternativas (ToT-style)
}

interface ApprovalOption {
  id: string;
  label: string;
  description: string;
  estimatedEffort: string;
  risks: string[];
  diffs?: string;         // o que muda vs opção anterior
}
```

**Fluxo proposto:**
1. IA gera plano com checkpoints → cria `PlanCheckpointApproval` em `.ai/approvals/`
2. CLI notifica usuário: "Plano pronto para revisão. Fase 1 precisa de aprovação."
3. Usuário: `ai-devkit plan review` (vê resumo) ou `ai-devkit plan approve --phase plan`
4. Cada checkpoint aprovado vira `ApprovalResult` persistido
5. Se rejeitar: `ai-devkit plan replan "menos módulos, foco no MVP"` → IA regenera a partir daquele checkpoint

### 7.3 Métricas para Avaliar Qualidade dos Planos

| Métrica | Definição | Como medir | Meta |
|---------|----------|-----------|------|
| **Taxa de aprovação** | Planos aprovados sem modificação | `aprovados / total` | >70% |
| **Tempo de revisão** | Tempo do usuário entre gerar e aprovar | Timestamp diff | <5min para plano simples |
| **Ciclos de replan** | Nº de vezes que usuário pede replan | Contagem de `plan replan` | <1.5 por plano |
| **Granularidade (DGI)** | Sub-tarefas / passos mínimos estimados | Cálculo pós-decomposição | 1.8-4.5 (depende complexidade) |
| **Precisão de estimativa** | Tempo estimado vs real | `real / estimado` | 0.8-1.2 |
| **Taxa de replan por falha** | Planos que falharam na execução e precisaram replan | Eventos de falha | <10% |
| **Critic score** | Autoavaliação do plano pelo cognitive-coprocessor | Score 0-100 do validate.ts | >80 |
| **Alinhamento com intenção** | O plano atende a intenção original do usuário? | Survey pós-primeira execução | >4.0/5.0 |

**Como implementar no ai-devkit:**
- Adicionar métricas ao `cognitive-coprocessor/metrics.ts` (já calcula média, mediana, stddev)
- Persistir métricas por plano em `memory-store.ts`
- Dashboard: `ai-devkit plan metrics` exibe o histórico

### 7.4 Roadmap Sugerido

```
Semana  1  2  3  4  5  6  7  8  9
        ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
F1      │█████████████████│░░░░░░░░░░░│░░░░░░░░░░░│░░░░░░░░░░░│
        │ Conectar        │            │            │            │
        │ componentes     │            │            │            │
        │ existentes      │            │            │            │
F2      │░░░░░░░░░░░│█████████████████│░░░░░░░░░░░│░░░░░░░░░░░│
        │            │ Decomposição   │            │            │
        │            │ adaptativa     │            │            │
        │            │ (ADAPT-style)   │            │            │
F3      │░░░░░░░░░░░│░░░░░░░░░░░│█████████████████│░░░░░░░░░░░│
        │            │            │ Loop de       │            │
        │            │            │ aprendizado   │            │
F4      │░░░░░░░░░░░│░░░░░░░░░░░│░░░░░░░░░░░│███████████████│
        │            │            │            │ Plano         │
        │            │            │            │ visual + UI   │
        └───────────┴───────────┴───────────┴───────────┘
                         9 semanas ~ 45 dias-homem
```

### 7.5 Decisões Arquiteturais

**ADR-001: Decomposição ADAPT-style sobre decomposição upfront**
- Contexto: Duas abordagens principais para decomposição
- Decisão: ADAPT (recursiva sob demanda) ao invés de upfront
- Consequências: Menos tokens, mais robusta, mas pode ter latência em falhas sucessivas

**ADR-002: Cognitive Coprocessor como hub central do fluxo**
- Contexto: Múltiplos módulos precisam de pré-processamento e validação
- Decisão: Toda intenção passa pelo Cognitive Coprocessor antes do planner
- Consequências: Acoplamento ao coprocessor, mas pipeline consistente

**ADR-003: Planos como estrutura de dados (JSON), não prosa**
- Contexto: Planos em linguagem natural são ambíguos e não editáveis
- Decisão: Plano é JSON estruturado (TaskSpec[]) persistido em `.ai/plans/`
- Consequências: Editável pelo usuário, resumível, versionável

**ADR-004: Approval por checkpoint, não por plano inteiro**
- Contexto: Planos grandes têm alto risco de rejeição total
- Decisão: Cada fase do plano gera checkpoint de aprovação independente
- Consequências: Mais granularidade, mais interações, mas maior alinhamento

---

## Apêndice: Mapa de Arquivos Existentes Relevantes

| Caminho | Relevância | O que fazer |
|---------|-----------|-------------|
| `packages/cli/src/planner/` (5 arquivos) | Core do planner | Evoluir para ADAPT |
| `packages/cli/src/commands/plan.ts` (155 linhas) | CLI de planos | Adicionar sub-comandos (review, approve, replan) |
| `packages/cli/src/commands/approve.ts` (98 linhas) | Approval CLI | Adicionar checkpoint awareness |
| `packages/cli/src/governance/approval-flow.ts` (28 linhas) | Core de approval | Estender para plan checkpoints |
| `packages/workflow-engine/src/` (3 arquivos) | DAG de workflow | Conectar ao planner |
| `packages/execution-layer/src/` (2 arquivos) | Circuit breaker + retry | Conectar ao workflow |
| `packages/spec-generator/src/` (4 arquivos) | Gherkin + stubs | Conectar ao workflow |
| `packages/requirements-engine/src/` (3 arquivos) | Requirements store | Conectar ao cognitive coprocessor |
| `packages/cli/src/cognitive-coprocessor/` (12 arquivos) | Hub de processamento | Integrar como entrada/saída do planner |
| `packages/cli/src/memory/` (8 arquivos) | Memória + padrões | Adicionar persistência |
| `packages/cli/src/local-ai/providers/` | LLM router | Usar para intent classification |
| `packages/cli/src/runtime/checkpoint-manager.ts` | Checkpoints SHA-256 | Conectar ao approval flow |
| `packages/cli/src/runtime/phase-orchestrator.ts` | Orquestrador de fases | Adaptar para pipeline idea→plano |
| `packages/architecture-adr/` | ADR management | Gerar ADRs como output do plano |
