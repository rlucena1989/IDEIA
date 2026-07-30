# Architecture Decision Records (ADRs)

> **22 ADRs catalogados** — convenção unificada `ADR-NNN-titulo.md`
> Última consolidação: 2026-07-24

## ADRs por Camada

| ADR | Decisão | Status |
|-----|---------|--------|
| **Plataforma** | | |
| ADR-001 | Theia como Plataforma Base da IDE | ✅ Implementado |
| ADR-017 | Monorepo com ~143 Packages | ✅ Implementado |
| **Eventos e Mensageria** | | |
| ADR-002 | NATS JetStream como Barramento de Eventos | ✅ Implementado |
| **Memória e Dados** | | |
| ADR-003 | Mem0 + SQLite + DuckDB como Stack de Memória | ✅ Implementado |
| ADR-015 | Memory & Context Architecture | ✅ Implementado |
| **Agentes e Inteligência** | | |
| ADR-004 | LangGraph para Orquestração Multiagente | ✅ Implementado |
| ADR-008 | ADAPT para Task Decomposition | ✅ Implementado |
| ADR-021 | Prompt Economy System | ✅ Implementado |
| ADR-022 | Capability System (Registry + Matching + Disclosure) | ✅ Implementado |
| **Segurança e Governança** | | |
| ADR-005 | Cedar como Policy Engine | ⏳ Pendente |
| ADR-013 | Control, Safety & IDEIA-IA Synergy | ✅ Implementado |
| ADR-016 | Security Layers Architecture (7 camadas) | ✅ Implementado |
| **CLI e Interface** | | |
| ADR-018 | CLI com ~173 Comandos (V2.1) | ✅ Implementado |
| ADR-019 | Theia IDE com 10 Widgets | ✅ Implementado |
| **Qualidade e Observabilidade** | | |
| ADR-009 | OpenTelemetry + LangFuse para Observabilidade | ✅ Implementado |
| ADR-010 | Estratégia de Qualidade em 4 Gates | ✅ Implementado |
| **Infraestrutura e Deploy** | | |
| ADR-006 | Dagger + GitHub Actions para CI/CD | ⏳ Pendente |
| **LLM e Modelos** | | |
| ADR-007 | Estratégia LLM/SLM Local + API Cloud | ✅ Implementado |
| **Auto-Conhecimento** | | |
| ADR-020 | Self-Awareness System (catalog, tutorial, lifecycle) | ✅ Implementado |
| **Integração e Perfis** | | |
| ADR-011 | Self-Optimization Panel & Autonomous Evolution | ✅ Implementado |
| ADR-012 | Integration Topology & Contract Architecture (C1-C18) | ✅ Implementado |
| ADR-014 | User Profiles & Configuration System (5 perfis) | ✅ Implementado |

## ADRs Pendentes (S66-S68)
| ADR | Decisão | Status |
|-----|---------|--------|
| ADR-023 | AI-Driven Testing Architecture (S66) | ⏳ Pendente |
| ADR-024 | Cost Optimization & FinOps Framework (S67) | ⏳ Pendente |
| ADR-025 | AI-Assisted Code Debugging Architecture (S68) | ⏳ Pendente |
