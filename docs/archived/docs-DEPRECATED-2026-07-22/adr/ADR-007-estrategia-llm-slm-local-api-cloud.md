---
id: ADR-007
title: "Estratégia de LLMs: SLM Local + API Cloud"
status: Approved
date: 2026-07-17
deciders: Arquiteto, Engenheiro de IA, Product Owner
consulted: Equipe de Modelos
---

# ADR-007: Estratégia de LLMs — SLM Local + API Cloud

**Status:** Approved

## Contexto

O IDEIA depende de modelos de linguagem para todas as suas capacidades centrais: classificação de intenção, planejamento, geração de código, revisão, teste e deploy. A decisão de quais modelos usar e onde executá-los (local vs cloud) impacta diretamente a privacidade dos dados do usuário, a latência das respostas, o custo operacional, e a disponibilidade offline.

Atualmente o ai-devkit usa exclusivamente Ollama com alguns modelos locais, sem estratégia definida de fallback para APIs cloud. O Provider Router implementa uma cadeia de fallback simples, mas não há roteamento inteligente baseado na tarefa, nem suporte a modelos especializados para diferentes propósitos (raciocínio, código, chat).

Três eixos foram considerados: (1) modelos locais (Phi-4-mini, Qwen2.5-Coder, DeepSeek-R1) via Ollama; (2) APIs cloud (OpenAI GPT-4o, Anthropic Claude, Google Gemini) via Provider Router; (3) gateway multi-provider (OpenRouter, Vercel AI SDK) para fallback e custo. A estratégia precisa balancear qualidade, custo, privacidade e disponibilidade offline.

## Decisão

Adotar estratégia híbrida com três camadas: (1) **SLM Local** — Phi-4-mini (3.8B) para tasks de planejamento e raciocínio local, Qwen2.5-Coder (7B) para geração de código local, via Ollama; (2) **API Cloud** — OpenAI GPT-4o para tarefas complexas de planejamento e geração, Anthropic Claude para revisão de código e raciocínio profundo; (3) **Gateway** — OpenRouter como fallchain entre múltiplos providers cloud com cache e rate limiting. O Provider Router existente será evoluído para rotear tarefas ao modelo mais adequado baseado em: tipo de tarefa, requisito de privacidade, disponibilidade do modelo local, e custo.

## Consequências

**Positivas:**
- Offline-first: tarefas simples e moderadas executam localmente sem dependência de internet
- Privacidade: código e dados sensíveis nunca saem da máquina do usuário em tarefas locais
- Custo reduzido: SLMs locais eliminam custo de API para ~70% das tarefas
- Qualidade sob demanda: tarefas complexas usam modelos cloud de maior capacidade
- Resiliência: fallback automático se cloud estiver indisponível ou local for insuficiente
- Especialização por tarefa: modelo certo para cada tipo de operação (código vs raciocínio vs chat)

**Negativas:**
- Qualidade inferior dos SLMs locais versus GPT-4o/Claude 4 em tarefas complexas
- Gerenciamento de múltiplos modelos (download, RAM, GPU) via Ollama
- Experiência inconsistente entre modo offline e online (qualidade diferente)
- Complexidade do roteador de modelos (Provider Router precisa de lógica de classificação)
- Dependência de hardware do usuário para SLMs locais (CPU/GPU/RAM)
- Custo de API cloud mesmo com uso seletivo (pode acumular em times grandes)

## Decision

Adopt a hybrid strategy with three layers: (1) **SLM Local** — Phi-4-mini (3.8B) for local planning and reasoning tasks, Qwen2.5-Coder (7B) for local code generation, both via Ollama; (2) **API Cloud** — OpenAI GPT-4o for complex planning and generation, Anthropic Claude for code review and deep reasoning; (3) **Gateway** — OpenRouter as a fallback chain between multiple cloud providers with caching and rate limiting. The existing Provider Router evolves to route tasks to the optimal model based on task type, privacy requirements, local model availability, and cost.

## Consequences

**Positive:** Offline-first: simple and moderate tasks run locally without internet dependency; privacy: sensitive code and data never leave the user's machine for local tasks; reduced cost: SLMs eliminate API costs for ~70% of tasks; quality on demand: complex tasks use higher-capacity cloud models; resilience: automatic fallback if cloud is unavailable or local model is insufficient; task specialization: right model for each operation type (code vs reasoning vs chat).

**Negative:** Lower quality of local SLMs versus GPT-4o/Claude 4 on complex tasks; management overhead of multiple models (download, RAM, GPU) via Ollama; inconsistent experience between offline and online modes (different quality); Provider Router complexity requires classification logic; dependency on user hardware for local SLMs (CPU/GPU/RAM); cloud API costs even with selective usage (can accumulate in large teams).

**Risk:** User hardware variability may make local SLM performance unpredictable; cloud API cost can become significant at scale; model quality gap may lead to inconsistent user experience between offline and online modes.

## Opções Consideradas

| Opção | Descrição | Motivo para Rejeição |
|-------|-----------|---------------------|
| 100% Cloud (GPT-4o / Claude apenas) | Toda requisição vai para API cloud | Sem suporte offline; custo alto para todas as operações; dados de código sensíveis trafegam externamente; dependência total de conectividade |
| 100% Local (apenas SLMs via Ollama) | Toda requisição executa localmente | Qualidade insuficiente para tarefas complexas de planejamento e arquitetura; limitações de hardware do usuário; sem fallback se modelo local não atende |
| ONLY Phi-4-mini (3.8B) universal | Modelo único local para todas as tarefas | Phi-4-mini tem qualidade inferior para código comparado a Qwen2.5-Coder; falta especialização por tarefa; limitação de contexto e capacidade de raciocínio |

## Referências

- `docs/ESTUDOS/MATRIZ-TECNOLOGICA-COMPLETA.md` — Categoria B (IA e LLMs) e Categoria C (Modelos)
- `docs/ESTUDOS/IDEIA-MASTER.md` — Camada de Inteligência com Provider Router e modelos
- `docs/ESTUDOS/TECNOLOGIAS-EMERGENTES.md` — S8: SLMs e tecnologias emergentes
- `docs/ESTUDOS/ESTUDO-APRENDIZADO-ADAPTATIVO-FEEDBACK-LOOP-EVOLUCAO-CROSS-PROJETO.md` — Feedback loop para melhoria de modelos
- Phi-4-mini: https://azure.microsoft.com/en-us/blog/phi-4-mini/
- Qwen2.5-Coder: https://qwenlm.github.io/blog/qwen2.5-coder/
- OpenRouter: https://openrouter.ai/
