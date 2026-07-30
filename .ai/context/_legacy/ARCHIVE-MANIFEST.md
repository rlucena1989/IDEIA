# Archive Manifest — FA-03

> Arquivados por FA-03 em 2026-07-27.
> Reason: conteúdo descrevia o projeto errado (`ai-devkit`, 38 packages, NestJS+Next.js+Prisma,
> 35 comandos, "express" em vez de fastify). Cada sessão de IA começava envenenada (regra R3).
>
> Action: arquivar (não apagar) e regenerar a partir de
> `scripts/audit/regenerate-metrics.ts` (FA-04), que produz contexto determinístico
> derivado do REALITY-MANIFEST verdadeiro.
>
> Backup imutável adicional: `.ai/context/_legacy_20260727-151634/` e `.ai/_legacy_20260727-151634/`.

## Arquivos arquivados (conteúdo legado — NÃO injetar em IAs)

| Original (em `IDEIA/`) | Razão específica |
|---|---|
| `.ai/context/ai-handoff.md` | Dizia "# Handoff — ai-devkit" · "38 packages" · "35 comandos" · enumera GAP-16..20 inexistentes |
| `.ai/context/ai-handoff-compact.md` | Mesma poluição em forma compacta |
| `.ai/context/project-state.md` | Listava "bloqueadores P0: ai-devkit prove falha" — comando legado inexistente |
| `.ai/context/project-summary.md` | Dizia "Projeto recem-iniciado" (estado obsoleto desde muitas sessões) |
| `.ai/context/communication-protocol.md` | Referia-se 2x ao "ai-devkit" como sujeito ativo |
| `.ai/context/README.md` | Descrito como Contexto Indexado genérico, sem origem determinística |
| `.ai/context/CLAUDE.md` | Apontava apenas para `docs-sync.ts` (FA-04 ainda não existia) |
| `.ai/context/arena-ai-development-instructions.md` | Dogfooding do legado "AI-DevKit" — não aplicável |
| `.ai/context/inject.json` | Schema antigo sem métricas determinísticas (regenerado) |
| `.ai/project-manifest.yaml` | Declara stack "NestJS + Next.js + Prisma" — inexistente no código |
| `.ai/stack.json` | Frameworks 🔴 `express` (código usa fastify) |
| `.ai/session-mode.json` | Campos obsoletos (`status, packages, gapsResolved, studiesPublished, tscErrors`) — `mode.ts` usa só `mode/updatedAt`, `snapshot.ts` usa `timestamp/mode/summary` |

## DoD FA-03 (verificado após regeneração)

- [x] Nenhum arquivo em `.ai/context/` fora deste `_legacy/` descreve "ai-devkit"
- [x] Stack corrige `express` → `fastify`
- [x] Estado reflete realidade (sem "bloqueadores P0 de ai-devkit prove")
- [x] Contexto é regenerável por `scripts/audit/regenerate-metrics.ts` (FA-04)

## Como usar este diretório

Consulta histórica apenas. **Nunca** injetar em um prompt de IA nem navegar
como fonte atual. Para o estado atual leia:

- `docs/governance/REALITY-MANIFEST.md` (fonte mestra)
- `.ai/context/ai-handoff.md` (regenerado, aponta para o REALITY-MANIFEST)
- `.ai/context/project-state.md` (regenerado)