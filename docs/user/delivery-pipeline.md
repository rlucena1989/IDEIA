# Pipeline de Entrega — IDEIA

## Visão Geral

O pipeline de CI/CD da IDEIA é composto por duas camadas:

1. **DeliveryOrchestrator** (biblioteca TypeScript em `packages/delivery-orchestrator/`)
2. **GitHub Actions Workflows** (em `.github/workflows/`)

## Workflows

### CI (`ci.yml`)
- **Trigger:** push para main/develop, PR para main
- **Matrix:** Node 20 + 22 (quality), Ubuntu + Windows (test)
- **Jobs:** quality (typecheck + lint), test (matrix), build, docs-verify

### CD (`cd.yml`)
- **Trigger:** push para main
- **Jobs:** Docker build + push (GHCR), Trivy scan, deploy-staging (kubectl), deploy-production (kubectl)
- **Ambientes:** staging (namespace ideia-staging), production (namespace ideia)

### Deploy por Ambiente (gerados)
| Workflow | Ambiente | Branch | Quality Gates |
|----------|----------|--------|---------------|
| `deploy-development.yml` | development | develop | lint, test, build |
| `deploy-staging.yml` | staging | main | lint, test, build, security |
| `deploy-production.yml` | production | main | lint, test, build, security, architecture |

### Release (`release.yml`)
- **Trigger:** push de tag `v*`
- **Jobs:** release (GitHub Release), npm publish (com proveniência), changelog

### Security (`security.yml`)
- **Trigger:** push, PR, semanal (segunda)
- **Jobs:** CodeQL, npm audit, ESLint security, docs-sync validation, compliance report, threat intel

### Outros
- `auto-audit.yml` — auditoria automática diária
- `canary.yml` — canary deployment
- `codeql-analysis.yml` — análise estática
- `coverage-comment.yml` — comentário de cobertura em PRs
- `docs-verify.yml` — verificação de documentação
- `health-check-schedule.yml` — health check agendado
- `labeler.yml` — label automático de PRs
- `review-gate.yml` — workflow de revisão manual
- `stale.yml` — gerenciamento de issues/PRs stale
- `supply-chain.yml` / `supply-chain-schedule.yml` — supply chain security
- `test-baseline.yml` — baseline de testes
- `version.yml` — versionamento
- `weekly-audit.yml` — auditoria semanal

## DeliveryOrchestrator (Camada de Código)

O `packages/delivery-orchestrator/` fornece:

| Módulo | Função |
|--------|--------|
| `delivery-orchestrator.ts` | Pipeline de deploy (5 estágios), rollback, review gate, incidentes |
| `canary.ts` | Deploy progressivo: verify → 10% → 50% → 100% |
| `auto-rollback.ts` | Monitor de health check + rollback automático por ambiente |
| `webhook.ts` | Dispatch de eventos com retry (3x) |
| `notifications.ts` | 13 templates de notificação, canais registráveis |
| `review-gate.ts` | Approval workflow com timeout (2h) e auto-rejeição |
| `gitops.ts` | Drift detection, manifest apply, auto-sync |
| `gitops-generator.ts` | Geração programática de YAML GitHub Actions |

## Métricas

```bash
# Relatório de métricas do pipeline
npx tsx scripts/pipeline-metrics.ts

# Saída JSON
npx tsx scripts/pipeline-metrics.ts --json

# Modo CI (exit 1 se falhar)
npx tsx scripts/pipeline-metrics.ts --ci
```

## Verificação de Documentação

```bash
# Verificar se docs estão sincronizadas com código
npx tsx scripts/docs-sync.ts

# Auto-corrigir
npx tsx scripts/docs-sync.ts --fix

# Modo CI (bloqueia se divergir)
npx tsx scripts/docs-sync.ts --ci
```

## Como Usar

### Deploy manual via CLI
```bash
# Criar release
npx ideia release prepare --ver 1.2.3

# Publicar
npx ideia release publish
```

### Via GitHub Actions
```bash
# Deploy para staging: push para main
# Deploy para production: workflow_dispatch no cd.yml
# Release: git tag v1.2.3 && git push origin v1.2.3
```
