# Handoff — IDEIA

> **Projeto:** IDEIA — IDE que transforma ideias em sistemas completos.
> **Tagline:** "Dê a ideia, nós entregamos a solução."
> **Regerado por:** `scripts/audit/regenerate-metrics.ts` em 2026-07-29 §ts§
> **Fonte única da verdade:** `docs/governance/REALITY-MANIFEST.md`

---

## O que é o IDEIA

Plataforma IDE AI-first construída sobre **Eclipse Theia** + **NATS JetStream** +
**LangGraph** + **Ollama**, com 6 agentes especializados (Analyst, Architect,
Programmer, Reviewer, Tester, DevOps), 15 camadas arquiteturais e orquestração
multiagente event-driven. O shell é Theia-only; frontend são widgets React, never
SPA standalone.

## Stack verificada no código

- **Linguagem:** TypeScript 5.x · Node.js 20
- **Shell:** Eclipse Theia Platform (+ Monaco + Inversify DI)
- **Backend HTTP:** **Fastify** (ver `packages/api-server` — `fastify@^5.0.0`,
  `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`)
- **Frontend (widgets):** React 18
- **Mensageria:** NATS JetStream (Pub/Sub, Req/Rep, KV, DLQ)
- **Multiagente:** LangGraph + LangChain
- **LLM:** Ollama local (com routing para OpenAI/Anthropic)
- **Memória:** PostgreSQL+pgvector, SQLite+FTS5, DuckDB, Redis
- **Build:** `tsc -b` (project references)
- **Testes:** Jest + ts-jest

> ⚠️ **Não confundir:** existe um projeto **legado** no diretório-pai do workspace
> (software anterior inspirador, fora de `IDEIA/`), que **não é** este projeto.
> Descrições como "NestJS + Next.js + Prisma", "38 packages" ou "35 comandos"
> referem-se àquele legado e estão **obsoletas** aqui. Para o estado real consulte
> `docs/governance/REALITY-MANIFEST.md`.

## Métricas reais (recalculadas por script)

| Métrica | Valor |
|---------|-------|
| Packages com `src/` | 292 |
| Arquivos de teste | 1565 |
| LOC (`src/`) | ~440083 |
| TODO/FIXME/HACK | 49/14/10 |
| `console.log` em `src/` | 184 |
| ADRs (únicos/duplicados) | 29/5 |
| Comandos CLI (subcomandos) | 345 |
| Arquivos >500 linhas | 33 |

## Regras obrigatórias (fonte: `.ai/rules/UNIVERSAL.md`)

1. **R1 — Verdade está no código**: leia `REALITY-MANIFEST.md` + este `ai-handoff`
   + `inject.json` antes de operar. Nunca confie na memória.
2. **R2 — Docs verificada**: `docs-sync.ts --ci` e `regenerate-metrics.ts --ci`
   bloqueiam commits/PRs com deriva.
3. **R4 — Theia-only**: sem web UI standalone. Widgets React no Theia.
4. **R6 — Clean Architecture**: domínio não importa infra. Sem `any` sem justificativa.
5. **R7 — Workspace Boundary**: somente `IDEIA/` é editável.

## Próxima sessão

Consulte `docs/governance/HANDOFF-NEXT-SESSION.md` para continuidade entre sessões.
Lista de pendências ativa em `docs/governance/GAPS-PRODUCAO-IDE.md` (gaps abertos
GS141-GS147, FA-03..FA-05 em andamento).

## Comandos de verificação

```bash
npx tsx scripts/audit/regenerate-metrics.ts --ci   # gate de deriva (CI)
npx tsx scripts/audit/regenerate-metrics.ts --fix   # regenerar
npx tsx scripts/docs-sync.ts --ci                   # sync de AGENTS.md
```
