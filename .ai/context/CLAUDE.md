# Contexto do Projeto — IDEIA

> **FONTE SECUNDÁRIA** — A fonte ÚNICA e UNIVERSAL de regras está em `.ai/rules/UNIVERSAL.md`.
> **LEIA AQUELE ARQUIVO PRIMEIRO.** Este é apenas um resumo específico para contexto injetado.
> Regerado por `scripts/audit/regenerate-metrics.ts` — não editar à mão.

---

## ⚠️ REGRA ABSOLUTA — NUNCA confie na sua memória

Seu conhecimento prévio sobre este projeto está **desatualizado por definição**.
Sempre:
1. Leia `docs/governance/REALITY-MANIFEST.md` — packages REAIS do código
2. Leia `.ai/context/inject.json` — dados verificados do código
3. Execute `npx tsx scripts/audit/regenerate-metrics.ts --ci` para verificar deriva

**Se o código e a documentação divergirem, o CÓDIGO é a verdade.**

## ⚠️ Projeto é IDEIA (não o legado do diretório-pai)

Este projeto é o **IDEIA** — IDE AI-first sobre Eclipse Theia + Fastify + NATS
JetStream + LangGraph. Existe um projeto **legado** no diretório-pai do workspace
(fora de `IDEIA/`, software anterior inspirador) que **não** é este projeto.
Descrições como "NestJS + Next.js + Prisma", "38 packages" ou "35 comandos"
referem-se àquele legado e estão **obsoletas** aqui.

## ⚠️ BLOQUEIO UNIVERSAL

- **Pre-commit/CI**: `regenerate-metrics.ts --ci` bloqueia commits/PRs com
  `docs/governance/REALITY-MANIFEST.md` ou `.ai/context/*` divergentes do código
- **lint-staged**: roda `docs-sync.ts --fix` automaticamente
- **Nenhum modelo, editor ou extensão pode bypassar** — a verificação está no git/CI

## Comandos essenciais

```bash
npx tsx scripts/audit/regenerate-metrics.ts --ci    # gate de deriva (FA-04)
npx tsx scripts/audit/regenerate-metrics.ts --fix    # regenerar tudo
npx tsx scripts/docs-sync.ts --ci                    # sync AGENTS.md
```

## Leia a fonte completa

➡️ **`.ai/rules/UNIVERSAL.md`**
➡️ **`docs/governance/REALITY-MANIFEST.md`**
