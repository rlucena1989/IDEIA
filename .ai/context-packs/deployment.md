# Context Pack: Deployment — Release & Environment Promotion

> **Use when:** Deploying to an environment, promoting between environments, or rolling back a release
> **Estimated tokens saved:** ~75%

## Relevant Files & Directories
- `.github/workflows/` — CI/CD pipeline definitions
- `.ai/quality/quality-gates.md` — quality gates for each environment (dev → staging → production)
- `.ai/quality/ci-gate.md` — CI gate definitions
- `.ai/checklists/release-readiness-checklist.md` — release readiness checks
- `scripts/reality-check.ps1` — verification script that must pass before deploy
- `scripts/pre-flight.ps1` — blocks deploy if context is dirty
- `docs/ESTUDOS/DEPLOY-ENTREGA-CONTINUA.md` — deployment and CI/CD strategy
- `docs/governance/GAPS-PRODUCAO-IDE.md` — known gaps that may block deployment
- `.env.*` — environment-specific configuration files (not committed)

## Key Domain Concepts
- **Environment Promotion:** Dev (unstable, all branches) → Staging (stable, release candidates) → Production (stable, releases only). Each gate is stricter than the last.
- **Quality Gates at Each Stage:**
  - Dev: `npm run build` + unit tests pass
  - Staging: full test suite + contract tests + integration tests + security scan
  - Production: all staging gates + performance benchmarks + chaos tests + manual approval
- **Canary Deploy:** Roll out to a percentage of traffic (5% → 25% → 100%). Monitor error rates and latency. Roll back automatically if thresholds exceed.
- **Rollback Strategy:** Quick rollback via git revert or image tag pinning. Database migrations must be backward-compatible for one version to allow safe rollback.
- **SBOM (Software Bill of Materials):** Generated with `npm run sbom` or `cyclonedx-bom`. Required for production releases.

## Common Patterns
- Tag releases with semantic versioning: `vX.Y.Z` + `git tag -a vX.Y.Z -m "release: description"`
- Generate changelog from conventional commits: `git log --oneline vPrevTag..HEAD`
- Run `reality-check.ps1 -Full` before any staging or production deploy
- Use feature flags for risky deployments — toggle off to disable without re-deploy
- Monitor deployment with dashboards: error rate, latency (p50/p95/p99), throughput

## Task-Specific Instructions
1. Verify the code is ready: check quality gates for the target environment
2. Run `scripts/pre-flight.ps1` and `scripts/reality-check.ps1 -Full` — both must pass
3. Ensure `REALITY-MANIFEST.md` reflects the current state of all packages and endpoints
4. For production: verify SBOM is generated, changelog is up to date, and release notes are written
5. Execute the deploy: CI/CD pipeline or manual steps per the environment's runbook
6. Monitor post-deploy: check error rates, latency, and key business metrics for 15 minutes
7. If errors spike: trigger rollback procedure immediately (don't "wait and see")
8. Document the deployment outcome in the release log

## Pitfalls
- Deploying on a Friday — deployments without a full business day for monitoring are risky
- Database migrations that aren't backward-compatible — rollback becomes impossible without data loss
- Skipping the staging environment — bugs that only appear in production-like settings will be caught too late
- Ignoring the Reality Manifest check — stale docs mean stale understanding of what's deployed
- Forgetting to update environment-specific configurations (`API_URL`, feature flags, secrets)

## Output Checklist
- [ ] Quality gates passed for the target environment
- [ ] `pre-flight.ps1` and `reality-check.ps1 -Full` pass
- [ ] `REALITY-MANIFEST.md` is up to date
- [ ] Changelog generated and release notes written (production only)
- [ ] SBOM generated (production only)
- [ ] Database migrations verified backward-compatible
- [ ] Post-deploy monitoring active and thresholds configured
- [ ] Rollback plan documented and tested
- [ ] Deployment outcome logged
