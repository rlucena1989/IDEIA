---
id: ADR-008
title: ADAPT para Task Decomposition
status: Approved
date: 2026-07-17
deciders: Arquiteto, Engenheiro de IA
consulted: Equipe de Inteligência
---

# ADR-008: ADAPT para Task Decomposition

**Status:** Approved

## Contexto

O Intent Classifier atual do ai-devkit é uma implementação rudimentar baseada em switch-case com aproximadamente 6 palavras-chave (ex: "create", "refactor", "test"). Essa abordagem não generaliza para entradas complexas em linguagem natural, não extrai entidades (tecnologias, escopo, requisitos), e não produz planos de execução estruturados. O resultado é que comandos ambíguos ou pouco específicos frequentemente falham ou produzem resultados incorretos.

Para atingir os níveis N2+ de autonomia, o IDEIA precisa de um sistema de classificação de intenção e decomposição de tarefas que: (1) entenda descrições em linguagem natural de sistemas completos; (2) extraia entidades relevantes (stack tecnológica, domínio, requisitos funcionais); (3) decomponha a ideia em tarefas executáveis por agentes especializados; (4) faça isso sob demanda (apenas quando necessário), não pré-decompondo toda requisição.

O estudo S3 (INTENT-TO-PLAN-RESEARCH.md) analisou MetaGPT, SWE-Agent, ADAPT, Chain-of-Thought, Tree-of-Thought e outras abordagens. ADAPT se destacou por sua abordagem "as-needed" — só decompõe quando o executor falha, evitando overhead de planejamento excessivo para tarefas simples.

Três opções foram consideradas: (1) ADAPT-style decomposition, (2) MetaGPT com papéis fixos, (3) LLM diretamente com Chain-of-Thought.

## Decisão

Adotar ADAPT-style (As-Needed Decomposition and Planning from Tasks) como estratégia de task decomposition. O fluxo será: (1) Cognitive Coprocessor como hub de pré-processamento — recebe a entrada, classifica intenção via LLM (não mais switch-case), extrai entidades (stack, domínio, requisitos), avalia risco via Cedar Policy; (2) Task Decomposition sob demanda — apenas quando o executor falha ou a tarefa excede um limite de complexidade; (3) Plano mestre com checkpoints para aprovação humana. O Intent Classifier será substituído por um classificador baseado em LLM (Phi-4-mini local) com fallback para modelos cloud.

## Consequências

**Positivas:**
- Decomposição sob demanda evita overhead de planejamento para tarefas simples (ex: "refatore esta função")
- Classificador LLM-based entende linguagem natural sem limitação de palavras-chave
- Extração de entidades permite contexto rico para agentes downstream
- Cognitive Coprocessor como hub centraliza pré-processamento e reduz duplicação
- ADAPT comprovado em pesquisa (melhora taxa de sucesso em tarefas complexas)
- Plano mestre com checkpoints permite intervenção humana e rollback

**Negativas:**
- Complexidade de implementação do Cognitive Coprocessor (hub de pré-processamento multi-função)
- ADAPT requer mecanismo de detecção de falha do executor (quando um agente falha, aciona decomposição)
- Qualidade da extração de entidades depende do modelo LLM subjacente
- Latência adicional do pré-processamento (classificação + extração antes de qualquer ação)
- Necessidade de armazenar e versionar planos para reprodutibilidade

## Decision

Adopt ADAPT-style (As-Needed Decomposition and Planning from Tasks) as the task decomposition strategy. The flow: (1) Cognitive Coprocessor as preprocessing hub — receives input, classifies intent via LLM (replacing switch-case), extracts entities (stack, domain, requirements), evaluates risk via Cedar Policy; (2) Task Decomposition on demand — only when the executor fails or the task exceeds a complexity threshold; (3) Master plan with checkpoints for human approval. The Intent Classifier is replaced by an LLM-based classifier (Phi-4-mini local) with fallback to cloud models.

## Consequences

**Positive:** As-needed decomposition avoids planning overhead for simple tasks (e.g., "refactor this function"); LLM-based classifier understands natural language without keyword limitations; entity extraction provides rich context for downstream agents; Cognitive Coprocessor centralizes preprocessing and reduces duplication; ADAPT proven in research (improves success rate on complex tasks); master plan with checkpoints enables human intervention and rollback.

**Negative:** Implementation complexity of the Cognitive Coprocessor (multi-function preprocessing hub); ADAPT requires executor failure detection mechanism (decomposition triggered when an agent fails); entity extraction quality depends on the underlying LLM; preprocessing adds latency (classification + extraction before any action).

**Risk:** Plans must be stored and versioned for reproducibility, adding storage and complexity; failure detection mechanism may produce false positives (triggering unnecessary decomposition) or false negatives (missing needed decomposition).

## Opções Consideradas

| Opção | Descrição | Motivo para Rejeição |
|-------|-----------|---------------------|
| MetaGPT com papéis fixos | Decomposição determinística com papéis predefinidos (PM, Architect, Engineer) | Overhead para tarefas simples (sempre executa pipeline completo); planos longos demais; sem adaptação baseada em falha |
| Chain-of-Thought direto no LLM | Prompt que pede para LLM pensar passo a passo | Sem estrutura formal de plano; sem extração de entidades; sem suporte a intervenção humana; difícil de auditar e versionar |
| Planejamento prévio total (decompõe tudo antes de executar) | Decomposição completa da ideia em tarefas antes de qualquer execução | Overhead para ideias simples; planos podem estar errados e todo o trabalho é perdido; sem feedback loop entre execução e planejamento |

## Referências

- `docs/ESTUDOS/INTENT-TO-PLAN-RESEARCH.md` — Estudo completo de classificação de intenção e planejamento
- `docs/ESTUDOS/IDEIA-MASTER.md` — Camada de Inteligência com Intent Classifier e ADAPT
- `docs/ESTUDOS/MATRIZ-TECNOLOGICA-COMPLETA.md` — Categoria B (IA e LLMs)
- `docs/ESTUDOS/ORQUESTRACAO-MULTIAGENTE-DISTRIBUIDA.md` — Orquestração multiagente
- ADAPT Paper: https://arxiv.org/abs/2403.15498
- MetaGPT: https://arxiv.org/abs/2308.00352
