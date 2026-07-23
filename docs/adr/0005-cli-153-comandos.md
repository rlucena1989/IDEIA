# ADR-0005: CLI with 153 Commands

**Status:** Approved  
**Date:** 2026-07-22  
**Author:** Architecture Team

## Context

The IDEIA CLI exposes functionality through a command-line interface built on Commander.js. As the system grew, the command surface expanded from 36 to 153 commands covering init, generate, audit, verify, drift, policy, compliance, docs, workflow, memory, catalog, tutorial, lifecycle, and more.

## Decision

Organize commands as follows:

- **Entry point:** `packages/cli/src/index.ts` — registers 139 top-level commands via `program.addCommand()`
- **Command files:** One file per command in `packages/cli/src/commands/` — 153 files total
- **Sub-commands:** Grouped under parent `ideia` command (catalog, tutorial, lifecycle, etc.)
- **Output:** Every command supports `--json` for structured output and `--verbose` for debug
- **Audit trail:** CLI execution is logged via `AuditTrail` with SHA-256 chain

## Consequences

- Positive: Discoverable via `IDEIA --help` — all commands listed
- Positive: Consistent `--json`/`--verbose` flags across all commands
- Negative: 356 test files needed to cover the full surface (~100K LOC)
- Negative: Adding a new command requires creating a file + registering in index.ts
