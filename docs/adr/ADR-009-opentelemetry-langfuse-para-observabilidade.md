---
id: ADR-009
title: OpenTelemetry + LangFuse para Observabilidade
status: Approved
date: 2026-07-17
deciders: Arquiteto, DevOps Engineer, Tech Lead
consulted: Equipe de Infraestrutura
---

# ADR-009: OpenTelemetry + LangFuse para Observabilidade

**Status:** Approved

## Contexto

O observability-engine atual do ai-devkit é uma implementação customizada com propagação de traces caseira e logging simples. Não há padrão aberto, não há tracing distribuído entre agentes, não há correlação entre eventos do barramento (NATS) e chamadas de LLM, e não há métricas estruturadas para monitoramento de performance dos agentes. Para uma plataforma multiagente com orquestração complexa, a observabilidade é crítica para debugar falhas, identificar gargalos, medir qualidade e auditar decisões.

O IDEIA precisa de tracing distribuído ponta-a-ponta (do clique do usuário até o deploy), métricas de performance dos agentes (TTFT, TPS, latência por etapa), logging estruturado com correlação via traceId, e monitoramento específico de LLMs (tokens, custo, qualidade das respostas). A solução precisa ser baseada em padrões abertos para evitar vendor lock-in e permitir troca de ferramentas de visualização.

Três opções foram consideradas: (1) OpenTelemetry (CNCF) + LangFuse; (2) Datadog APM + LLM Observability; (3) Grafana Stack (Tempo + Loki + Prometheus) + LangFuse.

## Decisão

Adotar OpenTelemetry (OTel) como camada de instrumentação padrão (CNCF), LangFuse para tracing específico de LLMs e agentes, e Prometheus + Grafana para métricas e dashboards. OpenTelemetry será usado para tracing distribuído entre todos os serviços, eventos NATS e chamadas LLM, com exportação OTLP para LangFuse (AI-specific) e Prometheus (métricas). Logs seguirão formato estruturado JSON com traceId para correlação. A instrumentação será feita via SDK OpenTelemetry JS com auto-instrumentação para NATS, HTTP, e providers LLM.

## Consequências

**Positivas:**
- Padrão aberto (CNCF) — sem vendor lock-in, suportado por todos os principais vendors
- LangFuse oferece observabilidade específica para LLMs: tokens, custo, qualidade, feedback scores, playground
- Tracing distribuído ponta-a-ponta: usuário → NATS → agente → LLM → execução → deploy
- Prometheus + Grafana stack madura e extensível para métricas e alertas
- Possibilidade de trocar LangFuse por qualquer backend OTLP (Datadog, New Relic, Grafana Tempo)
- OpenTelemetry JS SDK com auto-instrumentação reduz esforço manual
- Correlação entre traces LLM e eventos de negócio (avaliação de política, decisões de agente)

**Negativas:**
- LangFuse Cloud tem custo operacional (self-hosted disponível mas complexo)
- Overhead de instrumentação OTel (performance, memória para buffer de spans)
- Complexidade inicial de setup (OTel collector, configuração de exportadores)
- LangFuse é menos maduro que Datadog em observabilidade geral
- Necessidade de gerenciar pipeline de traces (amostragem, taxas de exportação)

## Decision

Adopt OpenTelemetry (OTel) as the standard instrumentation layer (CNCF), LangFuse for LLM and agent-specific tracing, and Prometheus + Grafana for metrics and dashboards. OpenTelemetry provides distributed tracing across all services, NATS events, and LLM calls, with OTLP export to LangFuse (AI-specific) and Prometheus (metrics). Logs follow structured JSON format with traceId for correlation. Instrumentation uses the OpenTelemetry JS SDK with auto-instrumentation for NATS, HTTP, and LLM providers.

## Consequences

**Positive:** Open standard (CNCF) with no vendor lock-in, supported by all major vendors; LangFuse provides LLM-specific observability: tokens, cost, quality, feedback scores, and playground; end-to-end distributed tracing: user -> NATS -> agent -> LLM -> execution -> deploy; mature Prometheus + Grafana stack for metrics and alerts; ability to swap LangFuse for any OTLP backend (Datadog, New Relic, Grafana Tempo); OpenTelemetry JS SDK with auto-instrumentation reduces manual effort; correlation between LLM traces and business events (policy evaluation, agent decisions).

**Negative:** LangFuse Cloud has operational cost (self-hosted available but complex); OTel instrumentation overhead (performance, span buffer memory); complex initial setup (OTel collector, exporter configuration); LangFuse is less mature than Datadog for general observability.

**Risk:** Trace pipeline management (sampling, export rates) adds operational overhead; incorrect sampling configuration may lose critical trace data; LangFuse self-hosted complexity may drive teams to the paid cloud version.

## Opções Consideradas

| Opção | Descrição | Motivo para Rejeição |
|-------|-----------|---------------------|
| Datadog APM + LLM Observability | Solução completa SaaS | Vendor lock-in; custo alto (per-node + ingestão); sem flexibilidade para self-hosted; excessivo para fase inicial |
| Grafana Stack (Tempo + Loki + Prometheus) | Stack open-source completa | Sem observabilidade LLM específica (LangFuse preenche gap); maior complexidade de setup (Tempo + Loki + Prometheus); sem playground para LLMs |
| Manter observability customizado | Expandir engine caseiro | Esforço alto para replicar OTel (tracing distribuído, context propagation, sampling); sem integração com ecossistema de ferramentas; sem suporte a LLM tracing |

## Referências

- `docs/ESTUDOS/PIPELINE-VERIFICACAO-QUALIDADE-ENTREGA.md` — Pipeline de entrega com observabilidade
- `docs/ESTUDOS/MATRIZ-TECNOLOGICA-COMPLETA.md` — Categoria H (Observabilidade)
- `docs/ESTUDOS/IDEIA-MASTER.md` — Camada de Infraestrutura com OTel + LangFuse + Prometheus + Grafana
- OpenTelemetry: https://opentelemetry.io/
- LangFuse: https://langfuse.com/
- Prometheus: https://prometheus.io/
