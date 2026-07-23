# Context Pack: Bugfix — Root Cause Analysis & Code Repair

> **Use when:** Investigating and fixing a bug, regression, or unexpected behavior
> **Estimated tokens saved:** ~75%

## Relevant Files & Directories
- `jest.config.ts` / `vitest.config.ts` — test runner config for running targeted tests
- `packages/*/src/**/*.test.ts` — existing test files to understand expected behavior
- `docs/governance/GAPS-PRODUCAO-IDE.md` — catalog of known gaps and resolved issues
- `.ai/scripts/intensify-helper.js` — auto-fix scripts for common gap patterns
- `packages/reality-sync/src/study-intensifier.ts` — gap detection engine source
- `.ai/errors/error-catalog.md` — catalog of known error codes and resolutions

## Key Domain Concepts
- **Root Cause Analysis (RCA):** Trace from symptom → proximate cause → systemic root cause. Never stop at the first obvious fix.
- **Regression Detection:** Use `git bisect` or changelog comparison to find when the bug was introduced. Check recent commits touching the failing module.
- **Test-First Verification:** Write a failing test that reproduces the bug before changing any code. The test passes only when the bug is truly fixed.
- **Side Effect Awareness:** A bug fix in one module can ripple through the event bus (NATS/in-memory), shared state, or contract boundaries.

## Common Patterns
- Isolate the bug with a minimal reproduction before touching production code
- Use `IDEIA context search <error>` to find related patterns and past fixes
- Check `docs/governance/GAPS-PRODUCAO-IDE.md` to see if the bug is a known gap
- Run the failing test in isolation first: `npx jest --testPathPattern <test-file>`
- Use `node .ai/ideia-tools.mjs diff <fixed> <broken>` to isolate the change

## Task-Specific Instructions
1. Reproduce the bug with a minimal, deterministic test case
2. Search `.ai/errors/error-catalog.md` and past `memory/lessons-learned.md` for similar issues
3. Locate the root cause using binary search on commits or code paths
4. Write a failing test that captures the bug
5. Apply the fix — change the minimum surface area necessary
6. Verify the test passes; run the full test suite for the affected module
7. Run `npm run ai:boundaries` and `npm run ai:contract-check` if the fix crosses module boundaries
8. Add an entry to `memory/lessons-learned.md` documenting the root cause and fix pattern

## Pitfalls
- Fixing symptoms instead of root causes — always ask "why does this happen?" 5 times
- Overcorrecting — a one-line fix is better than a refactor that introduces new bugs
- Ignoring type safety — never use `as any` or `// @ts-ignore` in a bugfix
- Skipping the regression test — without it, the same bug will reappear
- Missing the `GAPS-PRODUCAO-IDE.md` update — if the fix closes a known gap, update the status

## Output Checklist
- [ ] Failing test written before fix (reproduces the bug)
- [ ] Fix applied with minimal diff
- [ ] Full test suite for affected module passes
- [ ] Regression test added to prevent reoccurrence
- [ ] Entry added to `memory/lessons-learned.md`
- [ ] If applicable, gap status updated in `GAPS-PRODUCAO-IDE.md`
- [ ] Run `npm run lint` and `npm run typecheck` on changed files
