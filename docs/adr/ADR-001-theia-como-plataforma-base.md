---
id: ADR-001
title: Theia como Plataforma Base
status: Approved
date: 2026-07-17
deciders: Arquiteto, Tech Lead, Product Owner
consulted: Equipe de Engenharia
---

# ADR-001: Theia como Plataforma Base

**Status:** Approved

## Contexto

O ai-devkit possui atualmente uma interface web própria construída com React + Vite + Monaco Editor, operando como uma aplicação single-page com chat, editor e dashboard. Essa abordagem atende ao MVP, mas impõe limitações à medida que o IDEIA evolui para uma plataforma completa: não há suporte nativo a LSP (Language Server Protocol), o sistema de extensões é caseiro, a arquitetura two-process (frontend/backend) precisa ser reinventada, e a capacidade de rodar tanto em desktop quanto em navegador exige manutenção duplicada de infraestrutura.

A decisão de plataforma afeta diretamente o roadmap: adotar uma plataforma madura como Theia acelera a entrega de funcionalidades complexas (LSP, debug via DAP, terminal, sistema de extensões VS Code), mas aumenta o tamanho da aplicação e a complexidade da migração. Alternativas como manter Electron + React puro ou migrar para Tauri representam caminhos com menos ecossistema integrado.

Três opções foram consideradas: (1) manter a arquitetura atual React + Vite + Electron, reconstruindo manualmente cada peça do ecossistema IDE; (2) migrar para Tauri + React, priorizando leveza e performance; (3) adotar Eclipse Theia como plataforma base.

## Decisão

Usar Eclipse Theia Platform como base da aplicação IDEIA, Electron como shell desktop, e Theia Cloud para versão web. Theia AI será utilizado como framework nativo para integração de agentes de IA (ChatAgents, ToolProviders, AIVariables). A migração será progressiva: Fase 1 (PoC — 4-6 semanas), Fase 2 (migração do core ai-devkit — 8-12 semanas), Fase 3 (experiência IDEIA — 8-12 semanas).

## Consequências

**Positivas:**
- Ecossistema VS Code nativo (Monaco, LSP, DAP, xterm.js, OpenVSX com ~3000 extensões)
- Theia AI como framework de agentes maduro (CODiE Award 2025), eliminando necessidade de construir sistema próprio de chat/tool functions
- Arquitetura two-process (frontend/backend) com JSON-RPC já estabelecida
- Capacidade cloud-ready nativa via Theia Cloud + Kubernetes
- InversifyJS como DI container viabilizando modularidade e testabilidade
- Suporte a white-label e customização profunda sem fork

**Negativas:**
- Tamanho da aplicação ~150MB (Electron), comparável ao VS Code
- Curva de aprendizado elevada (InversifyJS, contribution points, ciclo de vida Theia)
- Dependência de ciclo de release mensal do Theia com possíveis breaking changes
- Comunidade menor que VS Code (~21k stars vs 160k+)
- Migração do código existente (60+ packages) requer esforço significativo

## Decision

Adopt Eclipse Theia Platform as the base IDEIA application, with Electron as the desktop shell and Theia Cloud for web deployment. Theia AI serves as the native agent integration framework. Migration proceeds in 3 phases: PoC (4-6 weeks), core migration (8-12 weeks), and IDEIA experience (8-12 weeks).

## Consequences

**Positive:** Native VS Code ecosystem (Monaco, LSP, DAP, xterm.js, ~3000 extensions via OpenVSX); Theia AI framework (CODiE Award 2025) eliminates custom chat/tool function development; established two-process architecture with JSON-RPC; native cloud-readiness via Theia Cloud + Kubernetes; InversifyJS DI container for modularity and testability; white-label and deep customization without forking.

**Negative:** ~150MB Electron app size comparable to VS Code; steep learning curve (InversifyJS, contribution points, Theia lifecycle); dependency on monthly Theia release cycle with potential breaking changes; smaller community (~21k stars vs VS Code 160k+).

**Risk:** Migration of 60+ existing packages requires significant effort and may introduce regressions; Theia's smaller ecosystem means fewer community resources and third-party extensions.

## Opções Consideradas

| Opção | Descrição | Motivo para Rejeição |
|-------|-----------|---------------------|
| Continuar com React + Vite + Electron | Manter stack atual, reconstruir LSP/DAP/extensões manualmente | Esforço proibitivo para replicar ecossistema VS Code; sem LSP nativo, sem sistema de extensões |
| Tauri + React | Migrar para shell nativo Rust, mantendo React + Monaco | Perda de compatibilidade com VS Code Extensions; Theia depende de Node.js no backend; ganho marginal de performance (~50MB RAM) não justifica perda de ecossistema |
| VS Code + Extension pura | Construir IDEIA como extensão VS Code | Limitado pela API pública do VS Code; sem customização profunda; white-label não permitido; VS Code Marketplace proprietário |

## Referências

- `docs/ESTUDOS/THEIA-IDEIA-RESEARCH.md` — Pesquisa completa sobre Theia como plataforma base
- `docs/ESTUDOS/MATRIZ-TECNOLOGICA-COMPLETA.md` — Categoria A (Editor e IDE), seção A1 (Eclipse Theia)
- `docs/ESTUDOS/IDEIA-MASTER.md` — Diagrama de arquitetura com Theia como camada central
- `docs/ESTUDOS/ESTUDO-EMPILHAMENTO-CONTRATOS-INTEGRACOES.md` — Camada 0 (Theia) e contratos com camadas superiores
- Theia Architecture: https://theia-ide.org/docs/architecture/
- Theia AI Docs: https://theia-ide.org/docs/theia_ai/
