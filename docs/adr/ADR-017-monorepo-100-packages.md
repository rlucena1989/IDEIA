# ADR-017: Monorepo with ~143 Packages

- **Status:** Implementado
- **Data:** 2026-07-24 (convertido de 0004-monorepo para ADR-XXX)
- **Decisão:** Monorepo gerenciado com TypeScript project references (~143 packages)

## Contexto
IDEIA e um monorepo com ~143 packages de codigo real (~212K LOC). A estrutura de monorepo permite:
- Compartilhamento de tipos e contratos entre packages
- Build incremental com `tsc -b`
- Dependencias claras via `tsconfig.json` references
- Versionamento sincronizado (todos `0.0.0`)

## Decisao
- Usar TypeScript project references para compilacao incremental
- `tsconfig.base.json` como configuracao base (shared)
- Cada package tem seu proprio `tsconfig.json` com `extends`
- ESLint + Prettier para consistencia
- Husky + lint-staged para pre-commit hooks
