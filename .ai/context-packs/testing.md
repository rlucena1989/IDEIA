# Context Pack: Testing — Writing & Maintaining Tests

> **Use when:** Writing unit tests, integration tests, contract tests, mutation tests, or E2E tests
> **Estimated tokens saved:** ~80%

## Relevant Files & Directories
- `jest.config.ts` / `vitest.config.ts` — test runner configuration
- `packages/*/src/**/*.test.ts` — existing test files for patterns and conventions
- `.ai/testing/testing-strategy.md` — overall testing strategy and pyramid definitions
- `.ai/testing/mock-patterns.md` — mock and stub patterns used across the project
- `.ai/testing/test-data-guide.md` — test data factories and fixtures
- `.ai/quality/mutation-testing.md` — mutation testing with StrykerJS
- `.ai/quality/contract-testing.md` — contract testing with Pact
- `.ai/quality/golden-path-tests.md` — golden path/happy path test patterns
- `.ai/quality/ci-gate.md` — quality gates that include test thresholds
- `packages/*/stryker.conf.js` — StrykerJS configuration for mutation testing

## Key Domain Concepts
- **Testing Pyramid:** Unit (fast, many) → Integration (medium) → Contract (few, critical) → E2E (slow, few). Prioritize unit tests; use E2E sparingly.
- **Coverage Targets:** Minimum 30% (current) → 50% (Phase 0) → 80% (v1.0) → 90% (v2.0). Focus on meaningful coverage, not line-count chasing.
- **Property-Based Testing:** Use `fast-check` to generate random inputs and verify invariants. Critical for data transformation and validation logic.
- **Mutation Testing (StrykerJS):** Tests are only as good as their ability to catch mutations. Target >70% mutation score. Run with `npm run test:mutation`.
- **Contract Testing (Pact):** Every API boundary between services must have a Pact contract test. Consumer-driven contracts prevent integration surprises.

## Common Patterns
- One `describe` block per class/function, one `it` per behavior
- Use `Contract.pre()` in test setup to validate DTOs
- Mock at the boundary, not the implementation — mock the port, not the adapter
- Use test data factories (`buildFoo()`, `buildBar()`) instead of inline objects
- Write the test before the fix (regression test) or before the feature (TDD)
- Run mutation tests on changed files: `npx stryker run --mutate "packages/<scope>/src/**/*.ts"`

## Task-Specific Instructions
1. Identify the test type needed: unit (isolated logic), integration (module boundaries), contract (API compatibility), or E2E (user workflow)
2. For unit tests: test the public API only — avoid testing private methods directly
3. For integration: test with real dependencies where feasible, mock external services
4. For contract: write consumer tests first, then verify provider compatibility with `npm run test:contract`
5. For mutation: run StrykerJS on the target module, review survivors, and strengthen tests for any that should have been killed
6. Verify all tests pass: `npm test`
7. Check coverage: `npm run cov:track` — ensure the change improves or maintains coverage
8. Run `npm run test:mutation` for critical modules with business logic

## Pitfalls
- Testing implementation details — refactoring will break tests that shouldn't break
- Over-mocking — if every test mocks everything, nothing is actually tested
- Flaky tests — never add a test that fails intermittently; fix the flake first
- Snapshot tests without manual review — a snapshot that's accepted without verification is worthless
- Ignoring mutation score — 100% line coverage with 0% mutation score means tests don't test anything meaningful
- Skipping contract tests for internal APIs — internal boundaries break just as easily as external ones

## Output Checklist
- [ ] Correct test type selected (unit/integration/contract/E2E)
- [ ] Tests focus on public API, not implementation details
- [ ] No flaky tests (deterministic, no shared mutable state)
- [ ] Regression test added for bugfixes
- [ ] Coverage maintained or improved
- [ ] Mutation score >70% for the target module (if applicable)
- [ ] Contract tests pass (if API boundaries changed)
- [ ] `npm test` passes for the entire project
- [ ] Test data factories used instead of inline fixtures (where factories exist)
