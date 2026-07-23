# Contexto do Projeto — IDEIA

> **FONTE SECUNDÁRIA** — A fonte ÚNICA e UNIVERSAL de regras está em `.ai/rules/UNIVERSAL.md`
> **LEIA AQUELE ARQUIVO PRIMEIRO.** Este é apenas um resumo específico para contexto injetado.

---

## ⚠️ REGRA ABSOLUTA — NUNCA confie na sua memória

Seu conhecimento prévio sobre este projeto está **desatualizado por definição**.
Sempre:
1. Leia `docs/governance/REALITY-MANIFEST.md` — packages REAIS do código
2. Leia `.ai/context/inject.json` — dados verificados do código
3. Execute `npx tsx scripts/docs-sync.ts` para verificar se docs estão sincronizadas

**Se o código e a documentação divergirem, o CÓDIGO é a verdade.**

## ⚠️ BLOQUEIO UNIVERSAL

- **Pre-commit hook**: `docs-sync.ts --ci` bloqueia commits com docs divergentes
- **lint-staged**: roda `docs-sync.ts --fix` automaticamente
- **CI/CD**: `docs-verify.yml` falha PRs com docs desatualizadas
- **Nenhum modelo, editor ou extensão pode bypassar** — a verificação está no git, não no cliente

## Comandos essenciais

```bash
npx tsx scripts/docs-sync.ts         # audit
npx tsx scripts/docs-sync.ts --fix   # auto-corrigir
npx tsx scripts/docs-sync.ts --ci    # verificar (exit 1 se falhar)
```

## Leia a fonte completa

➡️ **`.ai/rules/UNIVERSAL.md`**

