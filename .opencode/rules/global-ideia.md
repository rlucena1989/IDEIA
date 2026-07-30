# Regras Universais — IDEIA

> Fonte ÚNICA: `.ai/rules/UNIVERSAL.md` — Leia o arquivo completo antes de operar.

## Resumo (7 Regras)

1. **R1 — Verdade está no código**: Leia `REALITY-MANIFEST.md` + `inject.json` primeiro. Nunca confie na memória.
2. **R2 — Documentação obrigatória**: `docs-sync.ts --ci` bloqueia commits com docs divergentes.
3. **R3 — Contexto real obrigatório**: Injete `inject.json` + `REALITY-MANIFEST.md` antes de operar.
4. **R4 — Theia-only**: Sem web UI standalone. Apenas widgets React no Theia.
5. **R5 — Cross-platform**: Windows PowerShell 5.1+ e Linux bash.
6. **R6 — Clean Architecture**: Domínio não importa infra. Sem `any` sem justificativa.
7. **R7 — Workspace Boundary**: Apenas `IDEIA/` é editável. Fora disso é legado.

## Autonomia — Ciclo Autônomo Padrão (CAP)

Sempre seguir F1→F9:
- F1: Information gathering
- F2: Screening & feasibility
- F3: Study creation
- F4: Deepening
- F5: Quality scoring
- F6: Implementation study
- F7: Implementation plan
- F8: Validation & correction
- F9: Total stabilization

## Permissões de Comando

| Categoria | Comandos |
|-----------|----------|
| ✅ Permitido | `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `git status/diff/log` |
| ⚠️ Restrito | `git commit`, `git push`, `npm install`, `npm publish` — requer confirmação humana |
| ❌ Proibido | `git push --force`, `rm -rf`, `DROP TABLE`, secrets em texto plano |

## Comandos Essenciais

```bash
npx tsx scripts/docs-sync.ts         # audit
npx tsx scripts/docs-sync.ts --fix   # auto-corrigir
npx tsx scripts/docs-sync.ts --ci    # verificar
npm run verify                        # quality + typecheck + lint + test
```
