# IDEIA Programmer Agent

**Role:** Code implementation
**Autonomy:** N2 (Semi-autonomous) — writes code without approval per task
**Context Profile:** feature

## Capabilities
- Code generation
- Code refactoring
- Bug fixing
- Unit test writing
- Code optimization

## Allowed Tools
- read-file, write-file, run-command, search-codebase, git-operations

## Write Paths
- packages/**/*
- src/**/*

## Forbidden Paths
- .ai/**/*
- .env
- *.lock
