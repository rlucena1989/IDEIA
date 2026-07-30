---
id: ADR-004
title: LangGraph para Orquestração Multiagente
status: Approved
date: 2026-07-17
deciders: Arquiteto, Tech Lead, Engenheiro de IA
consulted: Equipe de Agentes
---

# ADR-004: LangGraph para Orquestração Multiagente

**Status:** Approved

## Contexto

O IDEIA precisa orquestrar múltiplos agentes especializados (Analyst, Architect, Programmer, Reviewer, Tester, DevOps) que colaboram para transformar uma ideia em sistema completo. Cada agente tem responsabilidades distintas, opera em pipelines com dependências entre etapas, e precisa compartilhar estado e artefatos. A orquestração exige suporte a grafos de execução (DAGs), checkpointing para resumir workflows interrompidos, paralelismo entre agentes independentes, e capacidade de debater/consensuar decisões conflitantes.

O sistema atual não possui orquestração multiagente — o fluxo é linear (chat → LLM → resposta), sem coordenação entre múltiplos agentes ou persistência de estado entre etapas. Para atingir os níveis N2+ de autonomia, é necessário um framework que modele explicitamente o grafo de execução, gerencie estado compartilhado e permita intervenção humana em checkpoints.

Quatro opções foram consideradas: (1) LangGraph, (2) CrewAI, (3) AutoGen/AG2 (Microsoft), (4) Orquestrador caseiro.

## Decisão

Adotar LangGraph como framework primário de orquestração multiagente, com Supervisor Agent coordenando agentes especializados via grafo de estado (StateGraph). Checkpointing será usado para resumir workflows após interrupções (fechamento de IDE, timeout, erro). CrewAI será avaliado como alternativa para definição de papéis de agente se a abstração de LangGraph se mostrar de baixo nível. O Cognitive Coprocessor atuará como hub de pré-processamento antes da orquestração.

## Consequências

**Positivas:**
- LangGraph oferece grafos de estado explícitos (StateGraph) com nodes, edges, conditional edges — modelo natural para pipelines multiagente
- Checkpointing nativo permite resumir workflows após crashes ou pausas
- Suporte a paralelismo (fan-out) e sincronização (fan-in) entre agentes
- LangGraph deploy comprovado em produção (Klarna, Uber, Elastic)
- Integração nativa com LangChain ecosystem (se necessário)
- Suporte a human-in-the-loop (interrupts, aprovação em checkpoints)
- Comunidade grande e ativa (100k+ estrelas LangChain + LangGraph)

**Negativas:**
- LangGraph é predominantemente Python (LangChain ecosystem), pode exigir sidecar ou bridge para Node.js
- Curva de aprendizado para modelagem de grafos de estado
- Overhead de execução comparado a pipelines lineares simples
- Abstração de baixo nível para definição de papéis de agente (CrewAI pode ser mais intuitivo para esse aspecto)
- Dependência de ecossistema LangChain (pode ser excessiva para casos simples)

## Decision

Adopt LangGraph as the primary multi-agent orchestration framework, with a Supervisor Agent coordinating specialized agents via StateGraph. Checkpointing enables workflow resumption after interruptions (IDE close, timeout, error). CrewAI will be evaluated as an alternative for agent role definition if LangGraph's abstraction proves too low-level. The Cognitive Coprocessor acts as a preprocessing hub before orchestration.

## Consequences

**Positive:** Explicit state graphs (StateGraph) with nodes, edges, and conditional edges — a natural model for multi-agent pipelines; native checkpointing for resuming workflows after crashes or pauses; support for parallelism (fan-out) and synchronization (fan-in) between agents; proven production deployment (Klarna, Uber, Elastic); native integration with LangChain ecosystem; human-in-the-loop support (interrupts, checkpoint approval); large active community (100k+ LangChain + LangGraph stars).

**Negative:** LangGraph is predominantly Python (LangChain ecosystem), potentially requiring a sidecar or bridge for Node.js; learning curve for state graph modeling; execution overhead compared to simple linear pipelines; low-level abstraction for agent role definition (CrewAI may be more intuitive for that aspect).

**Risk:** Dependency on the LangChain ecosystem may be excessive for simple use cases and create vendor lock-in risk; Python-dominant nature may complicate integration with the TypeScript/Node.js stack.

## Opções Consideradas

| Opção | Descrição | Motivo para Rejeição |
|-------|-----------|---------------------|
| CrewAI | Framework multi-agente com papéis, objetivos e tarefas | Abstração mais simples mas menos flexível que LangGraph; sem checkpointing nativo; sem suporte a grafos condicionais; ecossistema menor |
| AutoGen/AG2 (Microsoft) | Framework conversacional multi-agente | Foco em conversação entre agentes, não em DAGs de execução; complexidade de configuração de group chats; sem checkpointing para workflows longos |
| Orquestrador caseiro | Implementar próprio sistema de filas + máquina de estados | Esforço de desenvolvimento alto (~3-6 meses) para replicar funcionalidades que LangGraph já oferece; risco de subengenharia |

## Referências

- `docs/ESTUDOS/INTENT-TO-PLAN-RESEARCH.md` — De intenção a plano, ADAPT-style decomposition
- `docs/ESTUDOS/MATRIZ-TECNOLOGICA-COMPLETA.md` — Categoria B (IA e LLMs), seção B6 (LangChain/LangGraph)
- `docs/ESTUDOS/IDEIA-MASTER.md` — Camada de Agentes com Supervisor + LangGraph
- `docs/ESTUDOS/ESTUDO-EMPILHAMENTO-CONTRATOS-INTEGRACOES.md` — Camada 7 (Orquestração de Agentes)
- `docs/ESTUDOS/ORQUESTRACAO-MULTIAGENTE-DISTRIBUIDA.md` — Estudo de orquestração multiagente
- LangGraph Docs: https://langchain-ai.github.io/langgraph/
- CrewAI: https://docs.crewai.com/
