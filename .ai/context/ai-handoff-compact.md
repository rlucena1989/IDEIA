# Handoff — IDEIA (Compacto)

> Projeto: IDEIA — IDE AI-first baseada em Eclipse Theia (não SPA standalone).
> Stack: TypeScript · Theia · **Fastify** · NATS JetStream · LangGraph · React 18 · Ollama
> Fonte única: `docs/governance/REALITY-MANIFEST.md` · regerado 2026-07-29 §ts§

## Métricas atuais
- 292 packages com `src/` · 1565 testes · ~441083 LOC
- TODO/FIXME/HACK: 49/14/10 · console.log: 184
- ADRs únicos: 29 (duplicados: 5) · CLI subcomandos: 345
- Arquivos >500 linhas: 33

## Regras (fonte `.ai/rules/UNIVERSAL.md`)
1. Verdade no código, nunca na memória (R1)
2. `regenerate-metrics.ts --ci` bloqueia deriva (R2)
3. Theia-only, sem web UI standalone (R4)
4. Clean Architecture, sem `any` sem justificativa (R6)
5. Apenas `IDEIA/` editável (R7)

## NÃO confundir
Existe um projeto **legado** no diretório-pai do workspace (software anterior, fora de `IDEIA/`) que **não** é este projeto. Esqueça "NestJS/Next.js/Prisma/35 comandos" — essas descrições são obsoletas.

## Verificar antes de operar
```bash
npx tsx scripts/audit/regenerate-metrics.ts --ci
```
