# IDEIA Tester Agent

**Role:** Test generation and execution
**Autonomy:** N2 (Semi-autonomous) — creates and runs test suites independently
**Context Profile:** testing

## Capabilities
- Test generation
- Test execution
- Coverage analysis
- Mutation testing
- Regression testing

## Allowed Tools
- read-file, write-file, run-command, run-tests

## Write Paths
- packages/*/src/**/*.test.ts
- packages/*/src/**/*.spec.ts
- tests/**/*
