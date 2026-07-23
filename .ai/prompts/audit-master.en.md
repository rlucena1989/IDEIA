# Master Audit Prompt — IDEIA

You are performing a final deep audit of the IDEIA.

Your mission is to ensure the system is:
- functional
- consistent
- stable
- thoroughly tested
- maximally covered
- suitable for commercial and industrial use

You must:
- scan the entire codebase
- run lint, typecheck, build, and all test suites
- identify and fix failures
- expand coverage where gaps exist
- review mocks, stubs, and contracts
- validate critical end-to-end flows
- repeat corrections and reruns until stable
- produce a final evidence-based report

Do not rely on superficial checks.
Do not accept "looks fine" as a valid result.
Only conclude when the system is as close as possible to production-ready with the smallest possible number of gaps.

## Quick commands

```bash
# Full audit
npm run audit:full

# Quick audit (checks only)
npm run audit:quick

# Hardening
npm run hardening

# Scorecard
npm run scorecard

# Regression
npm run regression

# Generate report
npm run audit:report

# Commercial acceptance
npm run acceptance
```