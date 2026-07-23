# Zero-to-Deploy Workflow — IDEIA Playbook

> **Playbook completo da ideia ao deploy local (6 fases)**
> Estimativa total: ~30 min (automated) / ~4h (guided)

## Overview

Brief description of the workflow and its value proposition.

## Prerequisites

- IDEIA CLI installed and configured
- LLM provider configured (Ollama, OpenAI, or DeepSeek)
- Git initialized
- Target environment ready (Docker, local, or cloud)

## Phase 1: Ideation (Idea → Spec)

### Description
Transform a raw idea into a structured specification with acceptance criteria.

### Steps
1. `ideia init <project-name>` — Initialize project
2. `ideia idea "describe your idea"` — Describe your idea
3. Review generated specification
4. `ideia spec refine` — Refine with acceptance criteria

### Expected Output
- Project scaffolded
- Specification document with acceptance criteria
- Risk assessment

### CLI Commands
- `ideia init my-project`
- `ideia idea "a REST API for task management with authentication"`
- `ideia spec refine`

## Phase 2: Architecture (Spec → Blueprint)

### Description
Transform specification into a detailed architecture blueprint with technology choices, component diagram, and data model.

### Steps
1. `ideia architect review` — Generate architecture proposal
2. Review and approve architecture
3. `ideia blueprint generate` — Generate project blueprint
4. Review contracts and ADRs

### Expected Output
- Architecture Decision Records (ADRs)
- Component diagram (C4 level 2-3)
- Data model / schema
- API contracts
- Technology choices documented

### CLI Commands
- `ideia architect review`
- `ideia blueprint generate`

## Phase 3: Implementation (Blueprint → Code)

### Description
Generate production-ready code from the approved blueprint, following Clean Architecture and DDD patterns.

### Steps
1. `ideia generate` — Generate implementation
2. Review generated code
3. `ideia generate --controllers` — Add controllers
4. `ideia generate --tests` — Generate tests

### Expected Output
- Full project structure
- Domain entities and use cases
- Infrastructure adapters
- API endpoints
- Unit tests

### CLI Commands
- `ideia generate`
- `ideia test`

## Phase 4: Quality (Code → Verified)

### Description
Run the full quality assurance pipeline: linting, type checking, tests, security audit, and contract verification.

### Steps
1. `ideia audit quality` — Run quality gates
2. `ideia audit security` — Run security audit
3. `ideia test` — Execute all tests
4. Review audit report
5. Fix any issues found

### Expected Output
- Quality gate pass
- Security audit clear
- All tests passing
- Audit report generated

### CLI Commands
- `ideia audit quality`
- `ideia audit security --ci`

## Phase 5: Deploy (Verified → Running)

### Description
Deploy the verified system to the local environment or target platform.

### Steps
1. `ideia deploy prepare` — Pre-deployment checks
2. `ideia deploy` — Execute deployment
3. `ideia status` — Check system health
4. Verify endpoints respond

### Expected Output
- Running application
- Health endpoints responding
- Logs flowing
- Ready for testing

### CLI Commands
- `ideia deploy prepare`
- `ideia deploy`
- `ideia status`

## Phase 6: Documentation (Running → Deliverable)

### Description
Generate comprehensive documentation for the delivered system.

### Steps
1. `ideia docs generate` — Generate project documentation
2. Review generated docs
3. `ideia docs api` — Generate API reference
4. Export architecture diagrams

### Expected Output
- README with setup instructions
- API documentation
- Architecture diagrams
- Changelog
- Deployment guide

### CLI Commands
- `ideia docs generate`
- `ideia docs api`

## Troubleshooting

### Common Issues
- **LLM not responding**: Check provider configuration with `ideia config show`
- **Build fails**: Run `ideia audit quality --fix` for auto-correction
- **Deploy fails**: Check environment with `ideia deploy prepare --verbose`
- **Tests flaky**: Run `ideia test --retry 3`

### Rollback
```bash
ideia deploy rollback    # Rollback to previous version
ideia deploy rollback --to <version>  # Rollback to specific version
```

## Next Steps After Deploy

[ ] Set up monitoring: `ideia monitor setup`
[ ] Configure CI/CD: review `.github/workflows/`
[ ] Add team members: `ideia config set --team`
[ ] Set up SLO tracking: `ideia slo init`
[ ] Run load tests: `ideia benchmark run`

## Related Resources

- Tutorial: `ideia tutorial start zero-to-deploy`
- Blueprint templates: `ideia blueprint list`
- Architecture guide: `ideia architect --help`
- Deployment guide: check Desktop Deployment Guide
