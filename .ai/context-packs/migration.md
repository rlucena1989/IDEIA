# Context Pack: Migration — Code & Package Transitions

> **Use when:** Renaming packages, changing APIs, upgrading dependencies, or restructuring modules
> **Estimated tokens saved:** ~75%

## Relevant Files & Directories
- `packages/*/package.json` — package names, exports, dependencies
- `packages/*/tsconfig.json` — path aliases and project references
- `packages/*/src/**/*.ts` — source code with imports to update
- `.github/workflows/` — CI config that may reference old package names
- `docs/governance/REALITY-MANIFEST.md` — truth source to update after migration
- `docs/governance/document-registry.md` — update if docs are affected
- `tsconfig.base.json` — shared compiler options and path mappings
- `scripts/sync-docs.ps1` — auto-sync script to update manifests

## Key Domain Concepts
- **Backward Compatibility:** Deprecate before removing. Mark old APIs with `@deprecated` JSDoc tag and a `migration-guide.md` link. Keep the old API working for at least one minor version.
- **Migration Script:** A codemod (jscodeshift/ts-morph) or shell script that automates the mechanical part of the migration. Must be idempotent and testable.
- **Strangler Fig:** Route consumers to the new implementation gradually. Keep both old and new paths alive until all consumers migrate.
- **Semantic Versioning:** Breaking changes → major (X.0.0), new features → minor (0.Y.0), bugfixes → patch (0.0.Z). Follow this for all packages.

## Common Patterns
- Automate with codemods: write a script that rewrites imports and calls before any manual change
- Run `npm run ai:contract-check` after migration to verify no broken contracts
- Update the Reality Manifest in the same PR as the migration — never in a separate PR
- Test the migration on a copy of the project first — `--dry-run` mode for destructive operations
- Communicate the migration timeline: deprecation notice → migration window → old API removal

## Task-Specific Instructions
1. Define the migration scope: what changes, what stays, what gets removed
2. Write a migration script (codemod or PowerShell/bash script) that automates the mechanical changes
3. Test the script in `--dry-run` mode — verify the diff is correct without applying
4. Apply the migration and verify `npm run build` succeeds
5. Run full test suite: `npm test`
6. Update all documentation that references the old names/paths — check `IDEIA-MASTER.md`, `document-registry.md`, READMEs
7. Update `REALITY-MANIFEST.md` to reflect the new state
8. Run `npm run ai:docs:enforce` and `npm run ai:boundaries` to verify integrity
9. Commit with a descriptive conventional commit message referencing the migration

## Pitfalls
- Forgetting to update path aliases in `tsconfig.json` — imports will silently fail in CI
- Breaking external consumers without notice — always deprecate first, communicate, then remove
- Migrating in place without a rollback plan — keep the old code path until migration is verified
- Skipping the Reality Manifest update — the Oráculo will flag the discrepancy
- Not testing the migration on Windows paths — path separators differ (`\` vs `/`)

## Output Checklist
- [ ] Migration script written and tested (with `--dry-run`)
- [ ] All imports updated — no references to old names remain
- [ ] `npm run build` succeeds for all affected packages
- [ ] Full test suite passes
- [ ] Documentation updated (READMEs, manifests, registries)
- [ ] `REALITY-MANIFEST.md` reflects the new state
- [ ] `npm run ai:docs:enforce` and `npm run ai:boundaries` pass
- [ ] If breaking: deprecation notice published, migration guide written
- [ ] Rollback plan documented (revert the migration commit)
