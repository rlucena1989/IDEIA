# Pesquisa: Orquestração Multiagente e Cognição Distribuída

> **Projeto:** ai-devkit — Evolução para modelo multiagente colaborativo  
> **Data:** 2026-07-17  
> **Tipo:** Pesquisa Tecnológica / Análise de Arquitetura  
> **Contexto:** agent-runtime ✅, agent-identity ✅, agent-registry 🔴, agent-collaboration 🔴

---

## Sumário Executivo

O campo de sistemas multiagente baseados em LLM amadureceu rapidamente entre 2023 e 2026. Três padrões arquiteturais dominam: **grafos de estado explícitos** (LangGraph), **times com papéis** (CrewAI) e **conversas entre agentes** (AutoGen/AG2). A pesquisa acadêmica converge para uma conclusão central: quando modelos convergem em capacidade, **a topologia de orquestração torna-se o principal diferencial de performance** (AdaptOrch, 2026). O ai-devkit está posicionado para adotar uma arquitetura híbrida **supervisor + DAG-based**, com agentes especializados comunicando-se via artefatos estruturados e blackboard compartilhado.

---

## 1. Metodologias e Padrões

### 1.1 Arquiteturas Multiagente

| Arquitetura | Descrição | Aplicação em SWE | Maturidade |
|---|---|---|---|
| **BDI (Crença-Desejo-Intenção)** | Agente raciocina sobre crenças, deseja estados futuros, intenciona planos | Útil para agentes que precisam explicar decisões; integração com LLMs via ChatBDI (2025) e MOSAICO (2025) | Acadêmica madura, renascendo com LLMs |
| **Reativa** | Agente mapeia estímulo→resposta, sem estado interno | Útil para agentes de baixa latência (validação, formatação) | Madura, bem compreendida |
| **Híbrida (BDI+Reativa+LLM)** | Camada deliberativa (BDI/LLM) + camada reativa (regras) | Padrão recomendado para agentes de engenharia: LLM para planejamento, regras para execução segura | Estado-da-arte 2025-2026 |

### 1.2 Role-Based Agent Design

O padrão mais bem-sucedido em sistemas multiagente para engenharia de software é a **atribuição de papéis especializados** (role-based design). Cada agente recebe:

- **Identidade** (role, goal, backstory) — influencia o comportamento do LLM
- **Ferramentas** (tool palette) — conjunto de capacidades acessíveis
- **Artefatos de entrada/saída** — contratos tipados do que produz e consome
- **Critérios de qualidade** — o que constitui sucesso para aquele papel

Papéis identificados na literatura e benchmarks:

| Papel | Função | Referência |
|---|---|---|
| Product Manager | Análise de requisitos, PRD, user stories | MetaGPT |
| Architect | Definição de arquitetura, tech stack, interfaces | MetaGPT, RTADev |
| Project Manager | Decomposição de tarefas, alocação, cronograma | MetaGPT, ChatDev |
| Programmer | Implementação de código | ChatDev, SWE-Agent |
| Reviewer | Revisão estática, detecção de bugs | ChatDev, DebateCoder |
| Tester/QA | Geração de testes, validação dinâmica | MetaGPT, RTADev |
| DevOps | Deploy, infraestrutura, CI/CD | SPOQ |
| Investigator | Exploração de codebase, diagnóstico | SPOQ, SWE-Debate |

### 1.3 Protocolos de Comunicação entre Agentes

| Protocolo | Tipo | Uso | Status |
|---|---|---|---|
| **FIPA-ACL** | Padrão IEEE para MAS | Agentes BDI (JADE, SPADE) | Legado, muito verboso |
| **KQML** | Knowledge Query and Manipulation Language | Agentes BDI + LLM (ChatBDI, 2025) | Acadêmico |
| **A2A (Agent-to-Agent)** | Google 2025, REST-based | Descoberta de capacidades, task-oriented | Novo, promissor |
| **MCP (Model Context Protocol)** | Anthropic 2025, cliente-servidor | Ferramentas, contextos, recursos | Adoção crescente |
| **TEA (Tool-Environment-Agent)** | Lifecycle-aware, versionado | AgentOrchestra (2025) | Experimental |
| **Artefatos estruturados** | Documentos tipados em message pool | MetaGPT, SPOQ | Mais eficiente que chat livre |

### 1.4 Padrões de Coordenação

| Padrão | Descrição | Prós | Contras |
|---|---|---|---|
| **Shared Message Pool** | Agentes publicam/subscribem em pool global | Baixo acoplamento, auditável | Overload de informação sem subscription filter |
| **Blackboard** | Memória compartilhada estruturada (artefatos) | Rastreabilidade, consistência | Gargalo de escrita concorrente |
| **Message Passing** | Agentes enviam mensagens diretas | Flexível, natural | Topologia complexa, difícil debug |
| **Event-Driven** | Agentes reagem a eventos (pub-sub assíncrono) | Escalável, desacoplado | Estado eventualmente consistente |
| **Wave Dispatch** | Execução em ondas paralelas a partir de DAG de dependências | SPOQ: speedup 14.3x | Requer decomposition precisa |

### 1.5 Organização de Agentes

| Modelo | Descrição | Quando usar |
|---|---|---|
| **Supervisor (Manager)** | Um agente coordena, divide tarefas, consolida resultados | Tarefas complexas com múltiplos sub-passos |
| **Peer-to-Peer** | Agentes conversam simetricamente | Debate, revisão por pares, consenso |
| **Hierárquico** | Múltiplos níveis de supervisão | SPOQ: Opus→Sonnet→Haiku; escalas grandes |
| **Swarm** | Muitos agentes simples, comportamento emergente | Exploratório, sem critério de sucesso claro |
| **DAG-based** | Grafo acíclico dirigido de tarefas/agentes | Workflows previsíveis com dependências |

### 1.6 Swarm Intelligence e Emergent Behavior

- **Generative Agents** (Park et al., 2023): 25 agentes em sandbox estilo Sims — comportamentos sociais emergentes (organizar festa, espalhar convites) sem programação explícita.
- **ChatDev**: Fase de design usa linguagem natural (melhor para criatividade), fase de codificação usa linguagem de programação (melhor para precisão) — comportamento emerge da alternância.
- **Lição para ai-devkit**: Comportamento emergente é imprevisível e caro. Para entrega comercial, **estrutura > emergência**.

### 1.7 Debate e Consenso entre Agentes (Multi-Agent Debate)

MAD (Multi-Agent Debate) é uma das áreas mais ativas de pesquisa (2024-2026):

- **SWE-Debate** (2025): Debate competitivo entre 3 agentes especializados → fault localization + MCTS patch → SOTA em SWE-bench Verified (6.7% improvement).
- **DebateCoder** (2025): Dois LLMs debatem usando **test cases como meio de debate** — cada modelo gera testes para desafiar o outro. Convergência determinada por execução de testes, não por moderador.
- **ConsensAgent** (2025): Detecta **sycophancy** (agentes concordando sem criticar) e otimiza prompts em tempo real.
- **Voting vs Consensus** (2025): Voting é 13.2% melhor em raciocínio; Consensus é 2.8% melhor em conhecimento. Aumentar número de agentes melhora performance; aumentar rodadas antes de votar piora.

**Recomendação**: Usar debate apenas para **revisão e consenso em decisões críticas** (arquitetura, aceite). Evitar debate em tarefas produtivas (codificação, teste) — o custo não compensa.

### 1.8 Tool-Use e Function Calling

O padrão **ReAct** (Reasoning + Acting) consolidou-se como base para agentes com ferramentas:

- **Thought → Action → Observation** loop
- Function calling nativo em GPT-4, Claude, Gemini
- **MCP** (Model Context Protocol) padroniza ferramentas como recursos endereçáveis

### 1.9 Agent-as-a-Service / Orchestration Layers

- **DisCo (Distributed Cognition)**: Desacopla Cognition do Control. Agentes são Workers long-lived, comunicação assíncrona via Event Service, estado durável em State Tracker.
- **SPOQ** (2026): Três tiers (Opus/worker, Sonnet/reviewer, Haiku/investigator) com dual validation gates.
- **Context Kubernetes** (2026): Orquestração de conhecimento no nível organizacional — análogo ao K8s para containers.

---

## 2. Da Tecnologia Mais Madura à Mais Inovadora

### 2.1 Frameworks Maduros (2023-2025)

| Framework | Arquitetura | Estado em 2026 | Produção | Licença |
|---|---|---|---|---|
| **LangGraph** | Grafos de estado (StateGraph + reducers) | v1.0 out/2025, 540 releases | Klarna, Uber, Replit, Linkedin | MIT |
| **CrewAI** | Role-based (Agent + Task + Crew) | v1.14, 52k stars | Anonymized (fintech, healthcare) | MIT |
| **AutoGen (AG2)** | Conversacional (GroupChat) | Manutenção MS → fork AG2 | Pesquisa, prototipação | MIT/Apache 2.0 |
| **Semantic Kernel** | Plugins + Planners + Personas | Microsoft Agent Framework (MAF) | Azure Foundry | MIT |
| **JADE** | FIPA-compliant, Java | Legado acadêmico | Telecom, manufatura | LGPL |
| **SPADE** | XMPP-based, Python | Manutenção | Acadêmico | MIT |

#### LangGraph (Recomendado para ai-devkit)

- **Prós**: State persistence embutido (Postgres/SQLite checkpointing); HITL nativo com interrupt(); time travel (replay de qualquer checkpoint); certificado por empresas reais.
- **Contras**: Curva de aprendizado íngreme; boilerplate para fluxos simples; dependência do ecossistema LangChain.
- **Performance**: 62% complex task completion vs 54-58% concorrentes; ~8% token overhead (menor).

#### CrewAI

- **Prós**: Mais rápido para prototipar; legível por não-técnicos; Pydantic-based.
- **Contras**: Sem persistence nativa; debugging opaco (controle em prompts); bottleneck do manager.
- **Melhor para**: Prototipagem rápida, validação de conceito.

#### AutoGen / AG2

- **Prós**: Flexível para pesquisa; debate/conversa natural; completamente gratuito.
- **Contras**: Mode manutenção (original); debugging difícil; sem persistence built-in.
- **Status**: Fork AG2 ativo, mas beta instável.

### 2.2 Frameworks Inovadores (2024-2026)

| Framework | Diferencial | Destaque |
|---|---|---|
| **MetaGPT** | SOPs codificados + assembly line de papéis | PRD → Design → Code → Test, message pool |
| **ChatDev 2.0** | Plataforma Zero-Code multiagente | Drag-and-drop workflow, YAML config |
| **SPOQ** (2026) | Wave dispatch + dual validation gates | 14.3x speedup, 99.87% test pass rate |
| **SWE-Agent** | Agent-Computer Interface (ACI) | SOTA em SWE-bench (open source) |
| **OpenDevin** | CodeAct agents, sandboxed exec | Alternativa open-source ao Devin |
| **AgentOrchestra** | Protocolo TEA, hierárquico com planner | 89% no GAIA benchmark |
| **AdaptOrch** (2026) | Topologia adaptativa via DAG | 12-23% improvement sobre topologia fixa |
| **LEMON** (2026) | RL para otimizar orquestração | SOTA em 6 benchmarks |

---

## 3. Estudos Técnicos e Ensaios

### 3.1 Artigos Seminais

| Artigo | Ano | Contribuição Central |
|---|---|---|
| **Generative Agents** (Park et al.) | 2023 | Memory stream + reflection + planning para agentes críveis |
| **MetaGPT** (Hong et al.) | 2023/2024 | SOPs em prompts, message pool, subscription mechanism |
| **ChatDev** (Qian et al.) | 2023 | Chat chain + communicative dehallucination |
| **SWE-bench** (Jimenez et al.) | 2024 | Benchmark para engenharia de software com LLMs |
| **SWE-Agent** (Yang et al.) | 2024 | ACI: Agent-Computer Interface Design |
| **Multi-Agent Debate** (Du et al.) | 2024 | Debate improves factuality and reasoning |
| **RTADev** (Liu et al.) | 2025 | Real-Time Alignment via shared certified repository |
| **SPOQ** (Carbowitz, Kumar) | 2026 | Specialist Orchestrated Queuing + wave dispatch |
| **AdaptOrch** (Yu) | 2026 | Topology over model selection when models converge |
| **SWE-Debate** (Li et al.) | 2025 | Competitive debate + MCTS for fault localization |
| **LEMON** (Chen et al.) | 2026 | Counterfactual RL para gerar orquestração executável |

### 3.2 Benchmarks Relevantes

| Benchmark | Foco | Status 2026 |
|---|---|---|
| **SWE-bench Verified** | 500 issues GitHub | OpenAI afirma contaminação e testes quebrados (~59%) |
| **SWE-bench Pro** | 731 tasks, 8 meses de evolução | Substituiu Verified, mas ~30% tasks quebradas |
| **SWE-bench Multimodal** | Issues com elementos visuais | Novo, promissor |
| **SWE-bench-Live** | Atualização automática mensal, multi-linguagem | Multi-lang (6) + Windows support |
| **GAIA** | Tarefas de nível expert para agentes | AgentOrchestra lidera com 89% |
| **AgentBench** | Multi-domínio (OS, web, code, game) | Referência para capacidades gerais |
| **HumanEval** | Geração de código funcional | Standard, mas limitado |

---

## 4. Riscos Técnicos e Mitigações

| Risco | Descrição | Mitigação |
|---|---|---|
| **Custo multiplicado** | N agentes = N x custo de inferência | Stratify por dificuldade (SPOQ: Opus caro só para planejamento, Haiku barato para exploração). Usar modelos menores para agentes não-críticos |
| **Inconsistência entre agentes** | Visões conflitantes sobre requisitos/arquitetura | Shared Certified Repository (RTADev). Artefatos aprovados por consenso são fonte única da verdade |
| **Deadlock em coordenação** | Agente A espera B que espera A | Máximo de iterações configurável. Timeout por agente. Supervisor detecta ciclos |
| **Propagação de erros** | Um erro no início contamina todo o pipeline | Validation gates duais (SPOQ): antes e depois da execução. Checkpoint-based verification (RTADev) |
| **Perda de contexto** | Contexto se perde em handoffs longos | Artefatos estruturados e schemas tipados (MetaGPT). Memory stream com retrieval (Generative Agents) |
| **Complexidade de debug** | "Quem fez o quê e por quê?" | Audit trail por ação. LangGraph: checkpoint replay para reproduzir estado exato |
| **Segurança** | Agente mal configurado executa ações perigosas | Policy engine + RBAC (já existe no ai-devkit: agent-identity). Approval gates human-in-the-loop |
| **Sycophancy** | Agentes concordam sem criticar | ConsensAgent: trigger-based prompt optimization. Debate competitivo vs colaborativo |
| **Conversation drift** | Agentes perdem foco da tarefa original | Task reminders periódicos. Max message termination |

---

## 5. Relevância para o Fluxo Ideação → Entrega

### 5.1 Pipeline de Agentes Proposto

`
IDEA → [Analista] → ESPEC → [Arquiteto] → ARQ → [Programador] → CÓDIGO → [Revisor] → [Testador] → [DevOps] → ENTREGA
         ↓              ↓                  ↓                   ↓           ↓           ↓
    Plano de       Stack +        Código fonte      Relatório de   Testes      Deploy/
    Requisitos     Módulos        + Testes unit.     Qualidade      e2e         Release
`

### 5.2 Papéis Detalhados

#### Agente Analista
- **Input**: Ideia em linguagem natural, contexto do projeto
- **Output**: Documento de requisitos estruturado (PRD), critérios de aceite
- **Ferramentas**: Chat com usuário, análise de código existente, templates de PRD
- **Padrão**: Single-agent com RAG (contexto do projeto)

#### Agente Arquiteto
- **Input**: PRD, restrições técnicas (tech stack, políticas)
- **Output**: Diagrama de arquitetura, lista de arquivos, interfaces, decisões (ADR)
- **Ferramentas**: Mermaid, análise de dependências, ADR generator
- **Padrão**: Single-agent + ferramentas de visualização

#### Agente Programador
- **Input**: PRD + Arquitetura + Plano de tarefas
- **Output**: Código fonte implementado
- **Ferramentas**: Editor de arquivos, shell, linter
- **Padrão**: Pode ser sub-agente especializado (frontend, backend, banco)

#### Agente Revisor
- **Input**: Código gerado + PRD + Arquitetura
- **Output**: Revisão com problemas encontrados + sugestões
- **Ferramentas**: Análise estática, diff engine, policy engine
- **Padrão**: Debate com Programador em caso de discordância

#### Agente Testador
- **Input**: Código + Especificação + Critérios de aceite
- **Output**: Testes (unitários, integração, e2e) + Relatório de cobertura
- **Ferramentas**: Test runner, sandbox, cobertura
- **Padrão**: Geração de testes via test cases (DebateCoder-style)

#### Agente DevOps
- **Input**: Artefatos de build + Configuração de infra
- **Output**: Deploy realizado + Monitoramento
- **Ferramentas**: Docker, CI/CD, cloud providers
- **Padrão**: Sequencial, altamente estruturado

### 5.3 Compartilhamento de Contexto

O padrão recomendado (MetaGPT-style + RTADev alignment):

1. **Shared Message Pool**: Cada agente publica seus artefatos (PRD, arquitetura, código, testes) em um pool central
2. **Subscription Filters**: Cada agente só recebe artefatos relevantes ao seu papel
3. **Shared Certified Repository (SCR)**: Artefatos passam por verificação de alinhamento antes de serem considerados fonte da verdade
4. **Trace Registry**: Links entre requisição → PRD → código → teste → deploy

---

## 6. Reuso no ai-devkit (Avaliação Detalhada)

### 6.1 Pacotes Existentes

| Pacote | Existe? | Status | O que faz |
|---|---|---|---|
| **agent-runtime** | ✅ | Implementado | Runtime single-agent: interpreta intenção, avalia política, executa plano. ~160 linhas |
| **agent-identity** | ✅ | Implementado | RBAC: 5 roles (admin, dev, reviewer, ai-agent, observer), permission check. ~135 linhas |
| **agent-registry** | ❌ | Não existe | Deve ser criado do zero |
| **agent-collaboration** | ❌ | Não existe | Deve ser criado do zero |

### 6.2 Avaliação por Tecnologia/Padrão

#### Padrões Arquiteturais

| Padrão | Existe? | Status | Precisa adaptar? | Complexidade |
|---|---|---|---|---|
| BDI com LLM | ❌ | Não existe | Criar integração BDI-like via prompts | Média |
| Role-based design | ❌ | Não existe (só RBAC security) | Criar sistema de papéis funcionais | Média |
| SOP-encoded workflow | ❌ | Não existe | Workflow-engine pode ser base | Média |
| Shared Message Pool | ❌ | Não existe | Criar message bus com subscription | Alta |
| Blackboard (SCR) | ❌ | Não existe | Memory-store pode ser adaptado | Média |
| Event-Driven | Parcial | event-bus package existe? | Verificar pacote | Média |
| Debate/Consenso | ❌ | Não existe | Criar módulo MAD específico | Alta |
| Tool-use / Function Calling | Parcial | MCP tools (14) existem | Estender para agentes multi-papéis | Baixa |

#### Frameworks

| Framework | Relevância | Deve integrar? | Como |
|---|---|---|---|
| **LangGraph** | Alta — state persistence, HITL, checkpointing | Sim, como runtime de orquestração | Adaptar agent-runtime para delegar a LangGraph |
| **CrewAI** | Média — prototipagem rápida | Não diretamente | Inspirar role definitions e task decomposition |
| **MetaGPT** | Alta — SOPs, message pool, papéis | Inspirar arquitetura | Copiar padrão de artefatos estruturados |
| **SWE-Agent** | Alta — ACI design para codificação | Inspirar ferramentas do Programador | Adotar design agent-computer interface |
| **AG2 (AutoGen)** | Média-baixa | Não | Padrão conversational é frágil para produção |
| **Semantic Kernel** | Baixa | Não | Ecossistema Microsoft, pouco valor adicional |

#### Infraestrutura Necessária

| Componente | Existe? | Ação |
|---|---|---|
| Message bus / Event bus | 🔴 | Criar ou verificar event-bus package |
| Shared state / Blackboard | 🟡 Memory store | Adaptar memory-store para SCR |
| Task decomposition | 🟡 Workflow engine | Workflow-engine já existe, integrar com agentes |
| A2A protocol | 🔴 | Criar protocolo de comunicação entre agentes |
| Agent registry + discovery | 🔴 | Criar para descoberta dinâmica de capacidades |
| Trace registry | 🔴 | Criar (já identificado como gap no blueprint) |
| Checkpointing / State persistence | 🔴 | LangGraph oferece; adaptar ou integrar |
| HITL / Approval gates | 🟡 Policy engine + Approval flow | Já existe, estender para multiagente |
| Agent isolation (worktree/sandbox) | 🟡 Terminal sandbox | Adaptar para execução isolada de agentes |

---

## 7. Conclusão e Recomendações

### 7.1 Arquitetura Recomendada: Híbrida (Supervisor + DAG + Eventos)

`
                    ┌─────────────────────────────────┐
                    │      ORCHESTRATOR (Supervisor)   │
                    │  - Decomposição de tarefas        │
                    │  - Alocação de agentes            │
                    │  - Consolidação de resultados     │
                    │  - HITL (human approval gates)    │
                    └──────────┬──────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Agent Pool   │    │  Agent Pool   │    │  Agent Pool   │
│ (Analista)    │    │ (Arquiteto)   │    │ (Programador) │
│               │    │               │    │               │
│ Ferramentas:  │    │ Ferramentas:  │    │ Ferramentas:  │
│ - Chat        │    │ - Mermaid     │    │ - Editor      │
│ - RAG         │    │ - ADR         │    │ - Shell       │
│ - Templates   │    │ - Dep. Graph  │    │ - Linter      │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Shared Context     │
                    │   (Message Pool +    │
                    │    State Tracker +   │
                    │    Trace Registry)   │
                    └─────────────────────┘
`

### 7.2 Roadmap de Implementação

#### Fase 1 — Fundação Multiagente (Sprint 1-2)
1. **Criar agent-registry**: Registro de agentes com nome, papel, capacidades, ferramentas
2. **Criar agent-collaboration**: Orquestrador base com task decomposition (inspirado em LangGraph + MetaGPT)
3. **Adaptar agent-runtime**: Suporte a sub-agentes e delegação
4. **Adaptar agent-identity**: Estender RBAC para papéis funcionais (analista, arquiteto, etc.)

#### Fase 2 — Comunicação e Estado (Sprint 3-4)
5. **Criar Shared Message Pool**: Publicação/subscrição de artefatos entre agentes
6. **Implementar artefatos estruturados**: Schemas para PRD, arquitetura, código, testes
7. **Adaptar memory-store**: Suporte a blackboard/SCR com versionamento
8. **Criar Trace Registry**: Links entre artefatos (requisito→código→teste)

#### Fase 3 — Pipeline Completo (Sprint 5-6)
9. **Implementar pipeline Analista→Arquiteto→Programador**
10. **Implementar Revisor + Testador** com validação dual (SPOQ-style)
11. **Adicionar suporte a debate** para decisões críticas (arquitetura, aceite)
12. **HITL com approval gates** no orquestrador

#### Fase 4 — Otimização e Produção (Sprint 7-8)
13. **Checkpointing e resumo de falhas** (LangGraph-style)
14. **Observabilidade multiagente**: tracing por agente, custo por chamada
15. **Caching inteligente**: evitar reexecução de agentes quando inputs não mudaram
16. **Model routing**: agente simples (Haiku) vs complexo (Opus) por dificuldade

### 7.3 Trade-offs: Single-Agent vs Multi-Agent

| Dimensão | Single-Agent Complexo | Multi-Agent (N agentes simples) |
|---|---|---|
| **Custo de inferência** | 1 chamada LLM (grande) | N chamadas (menores, mas N vezes) |
| **Qualidade** | Limitada por contexto único | Especialização → maior precisão |
| **Custo de contexto** | Contexto grande (perde detalhes) | Contexto menor por agente (mais foco) |
| **Debug** | Mais simples (1 agente) | Complexo (N agentes, N conversas) |
| **Manutenção** | Prompt gigante e frágil | Prompts menores e modulares |
| **Escalabilidade** | Limitada ao contexto do modelo | Paralelizável (spawn agents) |
| **Resiliência** | 1 ponto de falha | Degradação gradual |
| **Auditabilidade** | Traça 1 decisão | Traça contribuição de cada agente |

**Decisão**: Adotar multi-agente para o pipeline ideação→entrega (onde especialização importa). Manter single-agent para tarefas exploratórias (pesquisa, análise de código existente) onde o custo extra não se justifica.

### 7.4 Recomendações Finais

1. **Não reinventar a roda**: LangGraph é o runtime de orquestração mais maduro para produção. Avaliar integração vs implementação própria do padrão de grafos de estado.

2. **Priorizar artefatos sobre chat**: O padrão MetaGPT de comunicação via documentos estruturados (PRD, design doc) é mais escalável e auditável que chat livre entre agentes.

3. **Adotar SPOQ para controle de qualidade**: Validation gates duais (antes e depois da execução) reduzem defeitos em 41% (0.34→0.20 por tarefa).

4. **Usar debate com moderação**: Reservar MAD para revisão de arquitetura e aceite de requisitos. Evitar em codificação — o custo não compensa.

5. **Implementar Shared Certified Repository (RTADev-style)**: Artefatos só entram no contexto compartilhado após verificação de alinhamento. Previne propagação de erros.

6. **Planejar para custo**: Stratify agentes por capacidade do modelo (Opus para planejamento, Sonnet para implementação, Haiku para exploração). SPOQ demonstrou ganhos replicáveis com Qwen3.6-35B.

7. **Manter HITL como primeira classe**: Approval gates no orquestrador (já existem no policy engine). Nenhuma ação destrutiva sem confirmação humana.

---

## Referências

1. Park et al. (2023). "Generative Agents: Interactive Simulacra of Human Behavior." UIST '23.
2. Hong et al. (2023/2024). "MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework." ICLR 2024.
3. Qian et al. (2023). "ChatDev: Communicative Agents for Software Development." ACL 2024.
4. Wu et al. (2023). "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation."
5. Jimenez et al. (2024). "SWE-bench: Can Language Models Resolve Real-world GitHub Issues?" ICLR 2024.
6. Yang et al. (2024). "SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering." NeurIPS 2024.
7. Liu et al. (2025). "RTADev: Intention Aligned Multi-Agent Framework for Software Development." ACL 2025.
8. Du et al. (2024). "Multi-Agent Debate: Improving Factuality and Reasoning in LLMs."
9. Li et al. (2025). "SWE-Debate: Competitive Multi-Agent Debate for Software Issue Resolution."
10. Carbowitz & Kumar (2026). "SPOQ: Specialist Orchestrated Queuing for Multi-Agent Software Engineering." arXiv.
11. Yu (2026). "AdaptOrch: Task-Adaptive Multi-Agent Orchestration." arXiv.
12. Chen et al. (2026). "LEMON: Learning Executable Multi-Agent Orchestration via Counterfactual RL." arXiv.
13. Zhang et al. (2025). "AgentOrchestra: Orchestrating Multi-Agent Intelligence with TEA Protocol." arXiv.
14. Pitre et al. (2025). "ConsensAgent: Towards Efficient Consensus in Multi-Agent LLM Interactions." ACL Findings.
15. Gatti (2025). "ChatBDI: Think BDI, Talk LLM." AAMAS 2025.
16. Cognition (2026). "Multi-Agents: What's Actually Working." cognition.com/blog.
17. LangGraph vs CrewAI vs AutoGen (2026). Multiple benchmarks odsea.com, tacavar.com, pickaxe.co.
