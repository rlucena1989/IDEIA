# ADR-0004: Monorepo with 100 Packages

**Status:** Approved  
**Date:** 2026-07-22  
**Author:** Architecture Team

## Context

The IDEIA project grew from a monolith to a modular architecture spanning 100+ packages. Each package has a distinct responsibility and compiles independently under strict TypeScript mode. The monorepo must remain buildable, testable, and publishable as a cohesive unit.

## Decision

Use a flat monorepo structure under `packages/` with the following conventions:

- **Naming:** `kebab-case`, prefixed with `@ideia/` for public packages
- **Compilation:** Each package has its own `tsconfig.json` extending `tsconfig.base.json` — all 100 packages compile with `strict: true`
- **Testing:** Jest with `ts-jest` per package; `forceExit` and `detectOpenHandles` enabled globally
- **Linting:** Single root `.eslintrc.json` with 10 active rules; `no-explicit-any: warn`
- **Quality:** `scripts/quality-check.mjs` validates all packages in CI

## Consequences

- Positive: Clear boundaries, independent versioning, parallel builds
- Positive: Strict mode prevents type regressions in 96/96 packages
- Negative: Root `tsc -b` takes ~30s across all packages
- Negative: Cross-package refactoring requires updating multiple `tsconfig.json` references
