# Context Pack: Refactor — Clean Architecture & Code Improvement

> **Use when:** Restructuring existing code without changing external behavior
> **Estimated tokens saved:** ~80%

## Relevant Files & Directories
- `.ai/architecture/ddd-guidelines.md` — DDD patterns, aggregates, value objects, domain events
- `.ai/architecture/module-boundaries.md` — dependency direction rules and layer separation
- `.ai/architecture/dependency-rules.md` — allowed dependencies between packages
- `docs/ESTUDOS/ESTUDO-EMPILHAMENTO-CONTRATOS-INTEGRACOES-V2-SUPLEMENTO.md` — contract definitions between modules
- `packages/*/src/**/*.ts` — source code to be refactored
- `packages/*/src/**/*.test.ts` — test files that must continue passing
- `docs/governance/REALITY-MANIFEST.md` — truth source for package boundaries and interfaces

## Key Domain Concepts
- **Clean Architecture Layers:** Domain (entities, value objects, domain events) → Application (use cases, ports) → Infrastructure (adapters, persistence, external APIs). Inner layers never import from outer layers.
- **Behavioral Preservation:** The refactored code must produce identical outputs for identical inputs. If behavior changes, it is not a refactor — it is a feature or bugfix.
- **Strangler Pattern:** Replace a module incrementally. Route calls to the new implementation, then remove the old one when nothing depends on it.
- **Contract Stability:** Public APIs (events, ports, DTOs) should remain backward-compatible during refactoring. Use `Contract.pre()` for validation on boundaries.

## Common Patterns
- Extract methods that exceed 20 lines into smaller, named functions
- Replace conditionals with polymorphism or strategy pattern when switch/if chains grow beyond 3 branches
- Move infrastructure concerns (file I/O, HTTP, DB access) out of domain/application layers into adapter packages
- Rename with a deprecation period: mark old names `@deprecated`, redirect internally, remove in next major
- Batch small, independent refactors into separate commits — one concern per commit

## Task-Specific Instructions
1. Understand the current code's behavior — read tests and existing contracts
2. Define the target structure (which layer, which module, which responsibility)
3. Identify the minimum set of changes needed to reach the target structure
4. Before moving code, ensure all existing tests pass: `npm run test:unit`
5. Refactor in small, testable increments — each increment must keep all tests green
6. After each increment, run `npm run ai:boundaries` to verify layer rules
7. Run `npm run ai:contract-check` if the refactor touches module boundaries
8. Remove dead code, deprecated exports, and unused imports after the refactor is complete

## Pitfalls
- Refactoring and adding features in the same commit — never do this
- Breaking public APIs without a deprecation path — always deprecate first, remove later
- Over-abstracting — a simple function is better than a factory-of-factories for a one-off case
- Forgetting to update tests that implicitly depend on internal structure — mock the interface, not the implementation
- Leaving commented-out code — delete it; git history exists for a reason

## Output Checklist
- [ ] All existing tests pass before and after the refactor
- [ ] Behavior is preserved (identical inputs → identical outputs)
- [ ] No `any`, `as any`, `// @ts-ignore` introduced
- [ ] Layer boundaries respected — no inner layer imports outer layer
- [ ] Public APIs backward-compatible (or deprecation notice added)
- [ ] `npm run ai:boundaries` and `npm run ai:contract-check` pass
- [ ] Dead code removed, not commented out
- [ ] Commit message follows conventional commits with `refactor(scope):`
