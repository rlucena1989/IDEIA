# Handoff — ai-devkit

> Cole este arquivo no inicio de qualquer conversa com a IA.
> Atualizado em: 15/07/2026

## O que é este projeto

O **ai-devkit** é o "sistema operacional de governança" para desenvolvimento assistido por IA. Ele fornece CLI, generators, quality gates, security scanning, multi-provider AI orchestration, compliance mapping, contract validation, VSCode extension e 35+ comandos para estruturar, validar e auditar projetos com Clean Architecture + Modular Monolith.

**Stack real:** Node.js ≥18, TypeScript 5.4, npm workspaces (monorepo com 38 packages), Jest 29, ts-jest, ESLint 8.57.

## Comandos Principais (35+ registrados)

`init`, `status`, `verify`, `doctor`, `audit`, `prove`, `sync`, `adapter`, `compile`, `generate` (33 subcomandos), `hook`, `mode`, `detect`, `wizard`, `retrospective`, `mcp`, `ci`, `scorecard`, `timeline`, `learn`, `agents`, `hooks`, `drift`, `plugin`, `attest`, `security`, `compliance`, `rules`, `ai` (11 subcomandos), `contract`, `release`, `pipeline`, `performance`, `feature-flag`, `ecosystem`, `review`, `supply-chain`, `gate`, `knowledge`, `observability`, `prompt`, `stream`, `worktree`, `snapshot`, `feature`.

## Arquitetura

Monorepo npm workspaces: 38 packages em `packages/*` + `apps/*`. CLI em TypeScript compilado com Commander. Core compartilha utilitários entre comandos. 13 adapters suportam multi-linguagem (Python, Go, Java, Kotlin, Scala, Ruby, PHP, Dart, Elixir, Haskell, Swift, Zig, NestJS). .ai/bin/ tem 97+ scripts de governança.

## Estado Atual

- **Épicos 1-15:** Completos (instalador inteligente, agentes, adapters, hardening, transformers, enterprise, IA local, VSCode, 33 generators, functional devkit, multi-formato compiler, quality/security avançados, knowledge base, observability/workflow, visão futura)
- **Pendente:** TSK-1.3 (ai-handoff compacto), TSK-4.2 (audit ↔ prove sync), GAP-16 a 20 (Web UI, RAG, multi-agent, autonomous engineer, PR review)
- **VSCode Extension:** 12 source files, 15 commands, 3 TreeViews, diagnostics, status bar, keybinding Alt+D
- **IA Local:** 5 providers (Ollama, OpenAI, Anthropic, Google, AWS), TF-IDF embeddings, routing, 461 arquivos indexados
- **Knowledge Base:** 46 entradas curadas, 9 categorias, 188 tags
- **Generators:** 33 subcomandos com engine handlebars + dry-run + force
- **Quality Gates:** 6 estágios progressivos (lint→test→security→build→architecture→deploy) com checkpoints resumíveis

## Regras

1. Não alterar arquivos fora do escopo da tarefa
2. Propor plano antes de implementar mudanças complexas
3. Verificar `.ai/knowledge/` e `.ai/errors/error-catalog.md` antes de implementar
4. Rodar `npm run ai:quality:gate` antes de concluir
5. Cobertura mínima de testes: 20% (real: ~20%)
6. Seguir as laws em `.ai/laws.yaml`

## Links Úteis

- **Master Plan:** `.ai/tasks/master-plan.md`
- **CHANGELOG:** `CHANGELOG.md` (histórico completo por épico)
- **Architecture ADRs:** `.ai/architecture/adr/`
- **Knowledge Base:** `ai-devkit knowledge list`
- **Quality Gate:** `npm run ai:quality:gate`