
# AI-Caused Incidents

## AI-INC-20260705-001 — Hardcoded installer path
### Summary
Installer contained absolute paths.
### Cause
AI generated local-environment-specific shell commands.
### Impact
Installer works only in one environment.
### Detection
Manual audit and portability scan.
### Prevention Rule
No absolute local paths in installers.
### Automated Check
.ai/bin/check-portability.js
### Status
Prevented


## AI-INC-20260705-002 — Build script updated without required file
### Summary
The build command was changed from shell copy to `node scripts/copy-templates.js`, but the referenced script was not included in the package.
### Cause
AI applied the package.json change without verifying the existence of the new script.
### Impact
Clean CLI builds fail.
### Detection
Dynamic audit running `npm run build`.
### Prevention Rule
Any package.json script that references a local file must be validated by a filesystem existence check.
### Automated Check
.ai/bin/check-installer.js
### Status
Prevented.

## AI-INC-20260705-003 — CLI status audited the wrong directory
### Summary
The `status` command used relative paths tightly coupled to the CLI installation path instead of `process.cwd()`.
### Cause
CLI implementation coupled project health checks to CLI installation path.
### Impact
False negatives in status, audit failures.
### Detection
Dynamic test after `init .` showed files existed but status reported them missing.
### Prevention Rule
Project audit commands must resolve project files from `process.cwd()`.
### Automated Check
.ai/bin/check-installer.js and .ai/bin/check-health-consistency.js
### Status
Prevented.

## AI-INC-20260705-006 — Command UX Crash
### Summary
Commands without subcommands (`ai-devkit context`) threw stack traces or exited silently instead of showing help.
### Cause
Incomplete commander.js configuration inside generated TS wrappers.
### Impact
Bad developer experience.
### Detection
Manual audit.
### Prevention Rule
Root commands with subcommands must trigger `cmd.help()` by default on empty calls.
### Automated Check
None (Structural setup).
### Status
Prevented.

## AI-INC-20260705-007 — Hollow Sync Action
### Summary
The sync command was just printing "Sync concluída" without altering any files or mapping data.
### Cause
MOCK generation by LLM.
### Impact
Users trusted an empty system.
### Detection
Code review against Hollow Structures policy.
### Prevention Rule
All CLI commands must perform active and testable system changes.
### Automated Check
.ai/bin/check-placeholder-policy.js (Preventive Code Scan)
### Status
Prevented.
