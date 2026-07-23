# IDEIA

> **IDE que transforma ideias em sistemas completos**
> "Descreva sua ideia, nós entregamos o sistema."

---

## O que é a IDEIA?

A **IDEIA** é uma IDE profissional baseada em [Eclipse Theia](https://theia-ide.org) com **assistência de IA integrada**. Em vez de programar cada linha, você descreve o que precisa em linguagem natural e a IDEIA orquestra agentes especializados para planejar, codificar, testar, revisar e entregar o sistema completo.

Diferente de outras ferramentas de IA para código (Copilot, Cursor, Windsurf), a IDEIA trata o desenvolvimento como um **processo gerenciado**: cada etapa passa por verificação de políticas, análise de segurança, validação de compliance e auditoria imutável.

## Stack

```
Eclipse Theia 1.73  |  TypeScript (strict)  |  React 18  |  Electron 33
Node.js 20          |  NATS JetStream       |  Ollama    |  LangGraph
90+ pacotes         |  Clean Architecture   |  DDD       |  Inversify DI
```

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| **Agentes Multiagente** | 6 agentes (Analyst, Architect, Programmer, Reviewer, Tester, DevOps) orquestrados via LangGraph StateGraph com checkpointing |
| **Chat com IA** | Descreva features em linguagem natural com 3 providers (Ollama, OpenAI, DeepSeek) e fallback automático |
| **Policy Engine** | Cedar adapter com 15+ policies, 27 padrões de segurança (Linux + Windows), 3 níveis de aprovação |
| **Audit Trail** | Chain SHA-256 imutável com verifyChain() |
| **LSP Multi-linguagem** | 8 providers (completion, hover, definition, references, signatureHelp, documentSymbol, codeAction, rename) para 5 linguagens |
| **Debug (DAP)** | Debug full-stack via WebSocket com breakpoints, step, stack, variáveis, REPL |
| **Terminal Integrado** | PTY interativo via xterm.js + node-pty |
| **Compliance** | LGPD, HIPAA, GDPR, SOC2 — checks automáticos com dashboard |
| **Cache Layer** | Cache in-memory (LRU + TTL) e NATS KV com hit ratio tracking |
| **Telemetria** | OpenTelemetry tracing, Prometheus metrics, health checks, SLO monitoring |
| **Monitoramento** | Grafana + Alertmanager + Prometheus stack em Docker Compose |
| **AI Safety** | Jailbreak detector (9 categorias), content filter, bias detection, prompt guard, rate limiting |
| **Human-in-the-Loop** | 3 níveis de aprovação (dev/tech-lead/security) com timeout configurável |
| **CLI Completa** | 51+ comandos (init, generate, audit, verify, drift, policy, compliance, docs, workflow, report, memory, evolution, optimize, coverage, agents) |
| **Multi-Surface** | Router para Electron, Browser, CLI e VS Code |
| **Browser Agent** | Navegação autônoma, gravação/replay de sessões |
| **Desktop Nativo** | Electron com auto-updater, tray icon, deep links, notificações nativas |
| **NATS JetStream** | EventBus persistente com DLQ, consumer groups, KV store, Object Store, Req-Reply |

## Comece Rápido

```bash
# Instalar via CLI
npm install -g @ideia/cli

# Iniciar um projeto
ideia init meu-projeto

# Rodar a IDE
cd meu-projeto
ideia start

# Abrir o chat e descrever uma funcionalidade
# Ex: "Crie um CRUD de usuários com autenticação JWT"
```

## Documentação

| Documento | Descrição |
|---|---|
| [Instalação](docs/user/instalacao.md) | Requisitos, instalação e configuração |
| [Primeiros Passos](docs/user/primeiros-passos.md) | Tutorial de 10 minutos |
| [API Reference](docs/user/api-reference/) | Referência completa da CLI e serviços |
| [Delivery Pipeline](docs/user/delivery-pipeline.md) | Pipeline de entrega e CI/CD |
| [AI Safety](docs/user/ai-safety.md) | Jailbreak detection, bias, content filtering |
| [Arquitetura](docs/architecture/README.md) | Diagramas C4 e decisões arquiteturais |
| [Troubleshooting](docs/user/troubleshooting.md) | Problemas comuns e soluções |
| [Exemplos](examples/) | Projetos de exemplo |
| [Contribuição](CONTRIBUTING.md) | Como contribuir com o projeto |

## Qualidade

| Dimensão | Score | Gate |
|---|---|---|
| Código | 70/100 | PR |
| Segurança | 90/100 | PR |
| Performance | 80/100 | Release |
| UX | 50/100 | Sprint |
| Integração | 85/100 | PR |
| Resiliência | 80/100 | Release |
| Dados | 75/100 | Sprint |

Gates: Commit (lint+types+testes) → PR (CodeQL+snyk+contratos) → Release (E2E+perf+resiliência)

## Status das Fases

| Fase | Descrição | Status |
|---|---|---|
| F1 | NATS JetStream — EventBus persistente | ✅ |
| F2 | LangGraph — Orquestração multiagente | ✅ |
| F3 | Deploy/GitOps — Pipeline de entrega | ✅ |
| F4 | PostgreSQL+pgvector — Data layer | 🔶 Parcial |
| F5 | Desktop — Auto-updater, instalador | 🔶 Parcial |
| F6 | Segurança — Cedar, red teaming, compliance | ✅ |
| F7 | Performance — Benchmarks, cache, otimização | ✅ |
| F8 | Observabilidade — Tracing, métricas, logging | ✅ |
| F9 | AI Safety — Jailbreak, bias, alignment | ✅ |
| F10 | Documentação — README, exemplos, C4 | ✅ |

## Licença

MIT © 2026 Anomalyco
