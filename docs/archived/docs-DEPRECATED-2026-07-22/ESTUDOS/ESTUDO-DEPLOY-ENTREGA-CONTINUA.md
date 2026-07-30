# Estudo: Deploy e Entrega Contínua para IDEIA

> **Data:** 2026-07-18
> **Propósito:** Definir pipeline de CI/CD, GitOps, progressive delivery, build de artefatos, release management, publicação e observabilidade de deploy para o ecossistema IDEIA — do commit ao deploy em produção com máxima confiabilidade.
> **Base:** ADR-006 (Dagger + GitHub Actions), ADR existente de CI/CD, análise do monorepo ai-devkit, práticas estado-da-arte 2025-2026

---

## Sumário

1. [Pipeline CI/CD](#1-pipeline-cicd)
2. [GitOps](#2-gitops)
3. [Progressive Delivery](#3-progressive-delivery)
4. [Build e Artefatos](#4-build-e-artefatos)
5. [Release Management](#5-release-management)
6. [Publicação](#6-publicação)
7. [Observabilidade em Deploy](#7-observabilidade-em-deploy)
8. [Pipeline Completo IDEIA](#8-pipeline-completo-ideia)

---

## 1. Pipeline CI/CD

### 1.1 Visão Geral do Pipeline

```
                        Quality Gates
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Commit  │──▶│  Commit  │──▶│  Testes  │──▶│  Build   │──▶│  Staging │
│  Local   │   │   CI     │   │ (Todas)  │   │ Artefato │   │  Deploy  │
│  Hooks   │   │          │   │          │   │          │   │          │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └─────┬────┘
     │                                                Gate 3      │
     ▼                                                             ▼
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Pre-    │   │  Lint    │   │  Unit    │   │  Build   │   │  Canary  │
│  commit  │   │  Type    │   │  Integ   │   │  Docker  │   │  Deploy  │
│  hook    │   │  Sec     │   │  Contr   │   │  SBOM    │   │  3% →50% │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └─────┬────┘
                                                       Gate 4     │
                                                                   ▼
                                                            ┌──────────┐
                                                            │  PROD    │
                                                            │  100%    │
                                                            └──────────┘
```

### 1.2 GitHub Actions (Atual, Recomendado)

**Workflow principal IDEIA:**

```yaml
# .github/workflows/ideia-pipeline.yml
name: IDEIA CI/CD Pipeline

on:
  push:
    branches: [main, 'release/*']
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  gate1-commit:
    name: Gate 1 — Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm audit --prod
    
  gate2-tests:
    name: Gate 2 — Tests
    needs: [gate1-commit]
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - name: Run tests (shard ${{ matrix.shard }})
        run: pnpm test -- --shard=${{ matrix.shard }}/3
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.shard }}
          path: coverage/
      
      - name: Contract check
        run: pnpm ai:contract-check
    
  gate3-build:
    name: Gate 3 — Build & Publish
    needs: [gate2-tests]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      
      - name: Generate SBOM
        run: |
          pnpm sbom:generate
          pnpm sbom:validate
      
      - name: Build Docker image
        run: |
          docker build -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} .
          docker tag ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
      
      - name: Push to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
  
  gate4-deploy-staging:
    name: Gate 4 — Deploy Staging
    needs: [gate3-build]
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Deploy via Dagger
        uses: dagger/dagger-action@v1
        with:
          module: ./dagger
          args: |
            call deploy \
              --image ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
              --environment staging
      - name: Smoke test
        run: |
          sleep 10
          curl -f https://staging.ideia.dev/health || exit 1
  
  gate5-deploy-production:
    name: Gate 5 — Deploy Production (Canary)
    needs: [gate4-deploy-staging]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Canary 3%
        uses: dagger/dagger-action@v1
        with:
          module: ./dagger
          args: |
            call deploy \
              --image ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
              --environment production \
              --canary 3
      
      - name: Wait & monitor (5 min)
        run: sleep 300
      
      - name: Promote to 50%
        uses: dagger/dagger-action@v1
        with:
          module: ./dagger
          args: |
            call promote \
              --percentage 50
      
      - name: Wait & monitor (5 min)
        run: sleep 300
      
      - name: Promote to 100%
        uses: dagger/dagger-action@v1
        with:
          module: ./dagger
          args: |
            call promote \
              --percentage 100
      
      - name: Notify
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": "🚀 Deploy `${{ github.sha }}` em produção concluído!"
            }
```

### 1.3 GitLab CI

```yaml
# .gitlab-ci.yml (alternativa)
image: node:20-slim

variables:
  PNPM_VERSION: "9"
  IMAGE_TAG: $CI_COMMIT_SHORT_SHA

stages:
  - quality
  - test
  - build
  - deploy

quality:
  stage: quality
  script:
    - corepack enable && pnpm install --frozen-lockfile
    - pnpm lint
    - pnpm typecheck
    - pnpm ai:boundaries
  artifacts:
    reports:
      eslint: eslint-report.json

test:
  stage: test
  parallel: 3
  script:
    - corepack enable && pnpm install --frozen-lockfile
    - pnpm test -- --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL

build:
  stage: build
  script:
    - corepack enable && pnpm install --frozen-lockfile
    - pnpm build
    - pnpm sbom:generate
    - docker build -t $CI_REGISTRY_IMAGE:$IMAGE_TAG .
    - docker push $CI_REGISTRY_IMAGE:$IMAGE_TAG

deploy:
  stage: deploy
  script:
    - dagger call deploy --image $CI_REGISTRY_IMAGE:$IMAGE_TAG --environment production
  environment: production
```

### 1.4 Jenkins (Enterprise)

Para organizações que já têm Jenkins como padrão:

```groovy
// Jenkinsfile — IDEIA
pipeline {
    agent any
    
    triggers {
        pollSCM('* * * * *')
    }
    
    environment {
        PNPM_VERSION = '9'
        REGISTRY = 'ghcr.io'
    }
    
    stages {
        stage('Checkout') {
            steps { checkout scm }
        }
        stage('Quality') {
            parallel {
                stage('Lint') {
                    steps { sh 'pnpm lint' }
                }
                stage('TypeCheck') {
                    steps { sh 'pnpm typecheck' }
                }
                stage('Security') {
                    steps { sh 'pnpm audit --prod' }
                }
            }
        }
        stage('Test') {
            steps { sh 'pnpm test -- --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL' }
            post {
                always { junit 'reports/**/*.xml' }
            }
        }
        stage('Build & Publish') {
            steps {
                sh 'pnpm build'
                sh 'docker build -t $REGISTRY/ideia:$BUILD_NUMBER .'
                sh 'docker push $REGISTRY/ideia:$BUILD_NUMBER'
            }
        }
        stage('Deploy') {
            steps {
                sh 'dagger call deploy --image $REGISTRY/ideia:$BUILD_NUMBER --environment production'
            }
        }
    }
    
    post {
        failure {
            slackSend(
                channel: '#deploy',
                message: "❌ Pipeline falhou: ${env.BUILD_URL}"
            )
        }
        success {
            slackSend(
                channel: '#deploy',
                message: "✅ Deploy ${env.BUILD_NUMBER} em produção!"
            )
        }
    }
}
```

### 1.5 Dagger — Pipeline as Code

Dagger é a ferramenta central de pipeline escolhida (ADR-006). Exemplo de módulo IDEIA:

```typescript
// dagger/src/pipeline.ts
import { dag, func, object, Container, Directory } from '@dagger.io/dagger';

@object()
class IdeiaPipeline {
  @func()
  async test(src: Directory): Promise<string> {
    return this.base(src)
      .withExec(['pnpm', 'test'])
      .stdout();
  }

  @func()
  async lint(src: Directory): Promise<string> {
    return this.base(src)
      .withExec(['pnpm', 'lint'])
      .stdout();
  }

  @func()
  async build(src: Directory): Promise<string> {
    return this.base(src)
      .withExec(['pnpm', 'build'])
      .stdout();
  }

  @func()
  async sbomGenerate(src: Directory): Promise<string> {
    return this.base(src)
      .withExec(['pnpm', 'sbom:generate'])
      .stdout();
  }

  @func()
  async validateBoundaries(src: Directory): Promise<string> {
    return this.base(src)
      .withExec(['pnpm', 'ai:boundaries'])
      .stdout();
  }

  private base(src: Directory): Container {
    return dag.container()
      .from('node:20-slim')
      .withMountedCache('/pnpm-store', 
        dag.cacheVolume('pnpm-store'))
      .withMountedDirectory('/src', src)
      .withWorkdir('/src')
      .withExec(['corepack', 'enable'])
      .withExec(['pnpm', 'install', '--frozen-lockfile']);
  }
}
```

### 1.6 Comparação

| Plataforma | Custo (5 devs) | Self-hosted | Cache | Matrix | Dagger suporte | Recomendação |
|-----------|---------------|-------------|-------|--------|----------------|-------------|
| **GitHub Actions** | $0 (público), ~$20/mês (privado) | ❌ (só GHES) | Sim | Nativo | ✅ Ação oficial | **Padrão IDEIA** |
| **GitLab CI** | $0 (SaaS), ~$30/mês (premium) | ✅ | Sim | Nativo | ✅ CLI | Alternativa |
| **Jenkins** | $0 (open source) + servidor | ✅ Nativo | Manual | Plugins | ⚠️ Plugin/CLI | Enterprise legado |
| **CircleCI** | $0 (6k min/mês), ~$50/mês | ❌ | Sim | Nativo | ⚠️ Plugins | Alternativa |
| **Buildkite** | $0 (Agentes self-hosted) | ✅ Híbrido | Sim | Nativo | ⚠️ CLI | Opcional |
| **Dagger** | $0 (open source) + Cloud $0 | ✅ Nativo | Cache Dagger | Módulos | ✅ Nativo | **Dagger core** |

**Recomendação final:** GitHub Actions como trigger + Dagger como engine de pipeline. Isso permite portabilidade (muda trigger, mantém pipeline) e testabilidade local.

---

## 2. GitOps

### 2.1 Princípios GitOps

GitOps trata o repositório git como única fonte da verdade para o estado desejado da infraestrutura:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Git Repo      │     │   GitOps        │     │   Cluster       │
│   (Estado       │────▶│   Operator      │────▶│   (Estado      │
│    Desejado)    │     │   (Reconciler)  │     │    Real)        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                        │
        │                       │                        │
        ▼                       ▼                        ▼
   ┌────────────┐         ┌────────────┐          ┌────────────┐
   │ main.yaml  │         │ "Diff"     │          │ Pods       │
   │ service    │         │ detecta    │          │ Services   │
   │ ingress    │         │ drift"     │          │ Configs    │
   └────────────┘         └────────────┘          └────────────┘
```

**Vantagens:**
- Toda mudança é via PR (auditável, revisável)
- Rollback é `git revert` (simples, conhecido)
- Estado real vs desejado é continuamente reconciliado
- CI e CD separados (CI build + test, CD sync)

### 2.2 ArgoCD

ArgoCD é a ferramenta GitOps padrão para Kubernetes:

```yaml
# argocd/application-ideia.yaml — App of Apps pattern
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ideia
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/ideia/ideia
    path: charts/ideia
    targetRevision: HEAD
    helm:
      valueFiles:
        - values-production.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: ideia
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true
```

**Arquitetura App of Apps:**

```
argocd/
├── applicationset.yaml              # ApplicationSet (multi-cluster)
├── apps/
│   ├── ideia-core.yaml              # Theia + agents
│   ├── ideia-infra.yaml             # NATS, Redis, MinIO
│   ├── ideia-database.yaml          # PostgreSQL operator
│   ├── ideia-monitoring.yaml        # Prometheus + Grafana
│   ├── ideia-ingress.yaml           # Ingress + cert-manager
│   └── ideia-backup.yaml            # Velero
├── clusters/
│   ├── production-us-east.yaml
│   └── staging-us-east.yaml
└── projects/
    └── ideia-project.yaml
```

**Rollback com ArgoCD:**

```bash
# Reverter via git
git revert HEAD~3
git push

# Reverter via ArgoCD CLI
argocd app rollback ideia --prune

# Ou via UI
argocd app get ideia
# → Rollback button in UI
```

### 2.3 Flux CD

Alternativa ao ArgoCD, mais integrada com o ecossistema GitOps Toolkit:

```yaml
# flux/ideia-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ideia
  namespace: flux-system
spec:
  interval: 5m
  path: ./charts/ideia/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: ideia
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: theia
      namespace: ideia
  postBuild:
    substitute:
      ENVIRONMENT: production
```

### 2.4 Comparação ArgoCD vs Flux

| Aspecto | ArgoCD | Flux CD |
|---------|--------|---------|
| **Curva** | Média | Média-alta |
| **UI** | Nativa (Web UI excelente) | UI separada (Grafana ou Weave) |
| **Multi-cluster** | ApplicationSet nativo | Cross-cluster via Kustomize |
| **SSO** | Dex, OIDC, GitHub | OIDC via CLI |
| **Health assessment** | Nativo (resource status) | Health checks custom |
| **Rollback** | Nativo + git revert | git revert |
| **Prune** | Automático | Automático |
| **Promote** | ArgoCD Rollout (Blue/Green, Canary) | Flux Image Automation |
| **Comunidade** | Muito grande | Grande |
| **Veredito** | **Recomendado** | Alternativa |

### 2.5 PR-Driven Deployments

Fluxo de deploy via PR:

```
Criação de PR
    │
    ├── CI valida (lint, test, build, contract check)
    ├── Deploy automático em staging (PR environment)
    │       └─ URL temporária: pr-123.ideia.dev
    ├── Revisão de código (owner + reviewer)
    ├── Testes manuais em staging
    └── Merge na main
            │
            ├── CI dispara novamente
            ├── Deploy em canary (3%)
            ├── Monitoramento automático (5 min)
            ├── Promoção progressiva (50% → 100%)
            └── Post-deploy validation
```

**Preview environments com K8s + ArgoCD:**

```yaml
# argocd/appset-preview.yaml — ApplicationSet para PRs
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: ideia-preview
spec:
  generators:
    - pullRequest:
        github:
          owner: ideia
          repo: ideia
          labels: [preview-deploy]
  template:
    metadata:
      name: 'ideia-pr-{{ number }}'
    spec:
      source:
        repoURL: https://github.com/ideia/ideia
        targetRevision: '{{ head_sha }}'
        path: charts/ideia
        helm:
          values: |
            ingress:
              host: 'pr-{{ number }}.ideia.dev'
            image:
              tag: '{{ head_sha }}'
      destination:
        namespace: 'preview-pr-{{ number }}'
      syncPolicy:
        automated:
          prune: true
```

---

## 3. Progressive Delivery

### 3.1 Feature Flags

**Plataformas de Feature Flag:**

| Produto | Open Source | Self-hosted | Target | Custo Free | Custo Pro |
|---------|------------|-------------|--------|-----------|-----------|
| **LaunchDarkly** | ❌ | ❌ | Enterprise | 500 flags, 50k MAU | $200+/mês |
| **Flagsmith** | ✅ | ✅ | Geral | 50k requests/mês | $99/mês |
| **Unleash** | ✅ | ✅ | Mid-market | 5 users, 2 flags | $80/mês |
| **OpenFeature** | ✅ (padrão) | SDK integrado | Multi-plataforma | $0 padrão | — |
| **GrowthBook** | ✅ | ✅ | Estatística | 3 users free | $60/mês |
| **own IDEIA** | Custom | NATS KV | Totalmente integrado | $0 | $0 |

**OpenFeature — Recomendada por ser padrão CNCF:**

```typescript
// packages/feature-flags/src/index.ts
import { OpenFeature } from '@openfeature/server-sdk';
import { UnleashProvider } from './providers/unleash';
import { InMemoryProvider } from './providers/in-memory';

// Provider pode ser trocado sem mudar código
const provider = process.env.FF_PROVIDER === 'unleash'
  ? new UnleashProvider({ url: 'http://unleash:4242' })
  : new InMemoryProvider({});

await OpenFeature.setProviderAndWait(provider);
const client = OpenFeature.getClient('ideia');

// Uso nos serviços
const isEnabled = await client.getBooleanValue(
  'agent-self-heal',
  false,
  { user: userId, environment: env }
);

if (isEnabled) {
  await agent.enableSelfHeal();
}
```

**Feature flags críticas para IDEIA:**

| Flag | Descrição | Owner | Rollout |
|------|-----------|-------|---------|
| `agent-self-heal` | Auto-recuperação de agentes com falha | Agent team | 5% → 25% → 100% |
| `llm-v2-router` | Novo roteador de LLM (otimização custo) | AI team | Canary 10% |
| `theia-ai-chat` | Chat IA integrado ao Theia | Theia team | Beta interno → 100% |
| `langfuse-tracing` | Novo tracing de agentes via LangFuse | Observability team | 1% → 50% |
| `multi-region-cache` | Cache distribuído multi-região | Infra team | Feature flip por região |
| `new-onboarding` | Fluxo de onboarding redesenhado | Product | A/B test 50% |

### 3.2 Canary Deployments

**Implementação com Argo Rollouts:**

```yaml
# canary/rollout-theia.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: theia-rollout
spec:
  replicas: 10
  revisionHistoryLimit: 2
  selector:
    matchLabels:
      app: theia
  template:
    metadata:
      labels:
        app: theia
    spec:
      containers:
        - name: theia
          image: ghcr.io/ideia/theia:latest
  strategy:
    canary:
      maxSurge: 2
      maxUnavailable: 0
      steps:
        - setWeight: 3
        - pause: { duration: 5m }  # 3% por 5 min
        - setWeight: 10
        - pause: { duration: 3m }  # 10% por 3 min
        - setWeight: 50
        - pause: { duration: 3m }  # 50% por 3 min
        - setWeight: 100           # 100%
      analysis:
        templates:
          - templateName: success-rate
        args:
          - name: service-name
            value: theia-svc
```

**Análise automática para rollback:**

```yaml
# canary/analysis-success-rate.yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      successCondition: result >= 0.99
      failureCondition: result < 0.95
      provider:
        prometheus:
          query: |
            sum(rate(http_requests_total{
              service="{{args.service-name}}",
              status=~"2.."
            }[5m]))
            /
            sum(rate(http_requests_total{
              service="{{args.service-name}}"
            }[5m]))
      count: 3
      interval: 1m
      failureLimit: 2
```

### 3.3 Blue/Green Deployments

**Para componentes stateful (NATS, banco):**

```yaml
# blue-green/blue-green.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: nats-rollout
spec:
  replicas: 3
  strategy:
    blueGreen:
      activeService: nats-service
      previewService: nats-preview
      autoPromotionEnabled: false
      scaleDownDelaySeconds: 600
  template:
    metadata:
      labels:
        app: nats
    spec:
      containers:
        - name: nats
          image: nats:2.11-alpine
```

### 3.4 A/B Testing

Para experimentos de produto (UX, agent behavior, prompt engineering):

```typescript
// packages/ab-test/src/index.ts
import { ABTest } from './core';

const test = new ABTest({
  experimentName: 'prompt-style-v2',
  variants: [
    { id: 'control', weight: 50 },
    { id: 'concise', weight: 25 },
    { id: 'detailed', weight: 25 },
  ],
});

// No fluxo do agente
const variant = test.assign(userId, sessionId);

const prompt = variant === 'concise'
  ? concisePrompt(task)
  : variant === 'detailed'
    ? detailedPrompt(task)
    : defaultPrompt(task);

const result = await agent.execute(prompt);

// Registrar resultado
await test.track(userId, sessionId, variant, {
  completed: result.success,
  duration: result.durationMs,
  tokens: result.totalTokens,
  userSatisfaction: result.feedback,
});
```

### 3.5 Gradual Rollout com Rollback Automático

```
Pipeline de Rollout Automatizado:

1. Deploy Canary 3%
   └── Monitor: error rate, latency P99, CPU
       ├── Tudo OK → Promote to 50%
       └── Erro > 5% → Rollback automático + alerta

2. Deploy 50%
   └── Monitor: todos os SLOs
       ├── Tudo OK → Promote to 100%
       └── Violação de SLO → Rollback automático

3. Deploy 100%
   └── Monitor por 30 min
       ├── Estável → Marcação verde
       └── Problema → Rollback automático
```

**Script de rollback automático via Dagger:**

```typescript
// dagger/src/rollback.ts
import { dag, func, object } from '@dagger.io/dagger';

@object()
class RollbackManager {
  @func()
  async monitorAndRollback(
    environment: string,
    deployment: string,
    errorThreshold: number
  ): Promise<string> {
    // Monitorar métricas de erro
    const errorRate = await this.getErrorRate(environment, deployment);
    
    if (errorRate > errorThreshold) {
      console.log(`⚠️ Error rate ${errorRate}% > threshold ${errorThreshold}%. Initiating rollback...`);
      
      // Rollback via ArgoCD
      const result = await dag.container()
        .from('argoproj/argocd:latest')
        .withEnvVariable('ARGOCD_SERVER', `argocd.${environment}.svc.cluster.local`)
        .withExec(['argocd', 'app', 'rollback', `ideia-${deployment}`, '--prune'])
        .stdout();
      
      // Notificar
      await dag.container()
        .from('curlimages/curl:latest')
        .withExec([
          'curl', '-X', 'POST',
          '-H', 'Content-Type: application/json',
          '-d', JSON.stringify({
            text: `🔴 Rollback automático: ${deployment} em ${environment}` +
                  ` (error rate: ${errorRate}%)`
          }),
          process.env.SLACK_WEBHOOK_URL!
        ])
        .stdout();
      
      return `Rollback concluído: ${result}`;
    }
    
    return `OK: error rate ${errorRate}% abaixo de ${errorThreshold}%`;
  }
}
```

---

## 4. Build e Artefatos

### 4.1 Monorepo Build

**Turborepo + pnpm (recomendado para IDEIA):**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["tsconfig.base.json", ".eslintrc.js"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "cache": {
        "type": "remote",
        "url": "https://turbo.ideia.dev"
      }
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": [],
      "inputs": ["src/**/*.ts", "test/**/*.ts"]
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "outputs": [],
      "dependsOn": ["^build"]
    }
  }
}
```

**Cache remoto do Turborepo:**

```yaml
# .github/workflows/build-cache.yml — Cross-workflow caching
- name: Turborepo cache
  uses: actions/cache@v4
  with:
    path: |
      node_modules/.cache/turbo
      .turbo
    key: turbo-${{ runner.os }}-${{ github.sha }}
    restore-keys: |
      turbo-${{ runner.os }}-
```

**Vantagens do Turborepo para IDEIA:**
- Cache de build granular (bypassa rebuild de pacotes inalterados)
- Paralelismo inteligente (DAG de dependências)
- `turbo run build --filter=packages/agent-runtime` — build só um pacote
- Cache remoto opcional (compartilhado entre devs)

### 4.2 Nx vs Turborepo

| Aspecto | Turborepo | Nx |
|---------|-----------|-----|
| **Setup** | Simples (json) | Complexo (generators, plugins) |
| **Cache** | Local + remoto (Vercel) | Local + remoto (Nx Cloud) |
| **Paralelismo** | DAG automático | DAG automático + task orchestration |
| **Graph visualization** | `turbo run build --graph` | `nx graph` integrado |
| **Generators** | Não | Sim (scaffolding) |
| **Distributed task** | Não nativo | Sim (Nx Cloud) |
| **Performance** | Excelente | Excelente |
| **Complexidade** | Baixa | Média-alta |
| **Veredito** | **Recomendado** | Overkill para IDEIA |

### 4.3 pnpm Workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - 'theia-plugins/*'
  - 'infra/*'
```

```bash
# Comandos pnpm essenciais para IDEIA
pnpm install --frozen-lockfile      # CI install
pnpm build --filter="packages/*"    # Build só libs
pnpm test --filter="packages/agent-runtime"  # Teste específico
pnpm -r exec -- npx depcruise src  # Análise de dependências
pnpm list --depth=10 --recursive   # Árvore de dependências
pnpm outdated -r                   # Dependências desatualizadas
pnpm audit --prod                  # Segurança
```

### 4.4 Bundle: esbuild, Vite, tsc

| Ferramenta | Uso | Tipo | Velocidade | Bundle Size | Recomendação |
|-----------|-----|------|------------|-------------|-------------|
| **esbuild** | Bibliotecas node | Bundle + minify | 10-100x | Bom | **Node.js libs** |
| **Vite** | Frontend Theia | Dev server + build | 10x | Excelente | **Frontend** |
| **tsc** | Typecheck | Compilador | 1x | Raw | **Typecheck** |

**Config esbuild para agent-runtime:**

```javascript
// packages/agent-runtime/esbuild.config.js
const esbuild = require('esbuild');

esbuild.buildSync({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  minify: true,
  sourcemap: true,
  external: ['@opentelemetry/*', 'nats', 'pg-native'],
  alias: {
    '@ideia/core': '../core/src',
  },
});
```

### 4.5 Docker Image Build

**Multi-stage build com cache:**

```dockerfile
# Dockerfile — IDEIA Agent Runtime
FROM node:20-slim AS deps
WORKDIR /app
RUN corepack enable

COPY pnpm-lock.yaml package.json ./
COPY packages/core/package.json packages/core/
COPY packages/agent-runtime/package.json packages/agent-runtime/

RUN pnpm install --frozen-lockfile --filter="packages/agent-runtime..."

FROM deps AS build
COPY . .
RUN pnpm build --filter="packages/agent-runtime"
RUN pnpm prune --prod

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 ideia && \
    adduser --system --uid 1001 ideia

COPY --from=build /app/packages/agent-runtime/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/agent-runtime/package.json .

USER ideia
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', r => process.exit(r.statusCode !== 200))"

CMD ["node", "dist/index.js"]
```

### 4.6 SBOM (Software Bill of Materials)

SBOM é mandatório para release (mencionado nos GAPS-PRODUCAO):

```bash
# Geração de SBOM com CycloneDX
pnpm add -D @cyclonedx/bom

# scripts/sbom-generate.js
const { generateBom } = require('@cyclonedx/bom');

generateBom({
  specVersion: '1.5',
  outputPath: 'sbom/sbom-cyclonedx.json',
  includeDev: false,
  includeLicenses: true,
  validate: true,
})
.then(() => console.log('✅ SBOM gerado'))
.catch(err => console.error('❌ Erro SBOM:', err));
```

**SBOM validation check:**

```bash
# Verificar SBOM contra políticas
pnpm sbom:validate

# Exemplo de saída:
# ✅ SBOM válido: 142 componentes, 3 licenças restritivas (MIT, Apache-2.0, BSD-3)
# ⚠️ 2 dependências com vulnerabilidades conhecidas (CVE-2024-XXXX)
# ❌ Nenhum componente com licença GPL (não permitido)
```

---

## 5. Release Management

### 5.1 Semantic Versioning (SemVer)

```
IDEIA Version Schema:

v{major}.{minor}.{patch}-{pre-release}


Exemplos:
v0.1.0          → MVP inicial
v0.2.0          → Segunda entrega
v1.0.0          → Primeira versão estável
v1.1.0          → Nova funcionalidade (backward compatible)
v1.1.1          → Hotfix
v2.0.0          → Breaking change
v1.2.0-alpha.1  → Alpha pre-release
v1.2.0-beta.1   → Beta pre-release
v1.2.0-rc.1     → Release candidate
```

**Política de versionamento IDEIA:**

| Mudança | Exemplo | Versão |
|---------|---------|--------|
| Breaking change na API de agentes | Remover parâmetro obrigatório | Major |
| Nova funcionalidade Theia Cloud | Workspace sharing | Minor |
| Bug fix sem breaking change | Corrigir timeout de agente | Patch |
| Mudança em prompt LLM | Prompt de planejamento | Patch |
| Breaking no contrato NATS | Formato de evento mudou | Major |
| Nova ferramenta de agente | tool de análise de código | Minor |

### 5.2 Conventional Commits + Changelog

**Semantic Release automatizado:**

```javascript
// .releaserc.js
module.exports = {
  branches: ['main', { name: 'next', prerelease: true }],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/github',
    ['@semantic-release/git', {
      assets: ['package.json', 'changelog.md', 'packages/*/package.json'],
      message: 'chore(release): ${nextRelease.version} [skip ci]',
    }],
  ],
  preset: 'angular',
  releaseRules: [
    { type: 'feat', release: 'minor' },
    { type: 'fix', release: 'patch' },
    { type: 'perf', release: 'patch' },
    { type: 'docs', release: 'patch' },
    { type: 'chore', release: false },
    { type: 'refactor', release: false },
    { type: 'test', release: false },
    { type: 'ci', release: false },
  ],
};
```

**Gerando changelog:**

```bash
# Via semantic-release (automatizado)
pnpm semantic-release --dry-run

# Manual com conventional-changelog
pnpx conventional-changelog -p angular -i CHANGELOG.md -s

# Exemplo de saída:
# # Changelog
#
# ## [1.2.0] - 2026-07-18
#
# ### Features
# - **agents:** adicionado auto-healing para agentes com falha (#142)
# - **theia:** workspace sharing via WebDAV (#138)
# - **nats:** suporte a JetStream mirror multi-região (#135)
#
# ### Bug Fixes
# - **agent-runtime:** corrigido timeout em tarefas longas (#140)
# - **theia:** websocket reconnect após idle timeout (#136)
#
# ### Performance
# - **llm:** cache de embeddings reduz latência P95 em 40% (#139)
```

### 5.3 Changesets (Já existe no ai-devkit)

```bash
# Adicionar changeset
pnpm changeset
# → Select packages modified
# → Describe changes (summary)
# → Enter major/minor/patch

# Versionar packages
pnpm changeset version
# → Bump versions based on changesets
# → Update changelogs

# Publicar
pnpm changeset publish
# → Publicar todos os packages versionados
```

### 5.4 Release Branches vs Trunk-Based

| Aspecto | Release Branches | Trunk-Based |
|---------|-----------------|-------------|
| **Branches** | main + release/vX.Y | main (curta duração) |
| **Feature branches** | Longas (dias/semanas) | Curtas (horas/dias) |
| **Merge frequency** | Baixa (semanal) | Alta (múltiplos/dia) |
| **Hotfix** | Branch separada + cherry-pick | Branch curta + merge rápido |
| **Complexidade** | Média | Baixa |
| **CI load** | Baixa | Alta |
| **Deploy frequency** | Semanal/quinzenal | Diário/múltiplos |
| **Recomendação** | Manter por enquanto | **Meta futura** |

**Recomendação para IDEIA:** Começar com **trunk-based** + feature flags para desacoplar deploy de release. Isso permite deploy contínuo sem expor funcionalidades inacabadas.

### 5.5 Hotfix Workflow

```
1. Bug crítico em produção
       │
       ▼
2. Branch hotfix/hf-{desc}
  git checkout -b hotfix/critical-auth-fix
       │
       ▼
3. Fix + Test + PR
  └── CI roda sem deploy
       │
       ▼
4. Merge direto na main
  └── CI dispara pipeline completa
       │
       ▼
5. Canary 3% → 50% → 100% (acelerado)
  └── Monitor: erro, latência, throughput
       │
       ▼
6. Post-mortem (até 24h depois)
  └── Análise de causa + prevenção
```

**Automação de hotfix no Dagger:**

```typescript
// dagger/src/hotfix.ts
@func()
async function hotfixPipeline(
  fixBranch: string,
  jiraTicket: string
): Promise<string> {
  // 1. Validar fix
  await test(src);
  await lint(src);
  
  // 2. Merge automático na main
  const merged = await git.merge({
    source: fixBranch,
    target: 'main',
    message: `fix(${jiraTicket}): hotfix automático`,
  });
  
  // 3. Deploy acelerado (ignora canary long)
  await deploy(src, 'production', {
    canaryPercent: 3,
    canaryWaitMs: 60_000, // 1 min (vs 5 min normal)
    promoteTo100Ms: 120_000, // 2 min (vs 10 min normal)
  });
  
  return `Hotfix ${fixBranch} completo: ${merged.sha}`;
}
```

---

## 6. Publicação

### 6.1 npm Registry (@ideia org)

**Configuração:**

```json
// .npmrc
@ideia:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

**Publicação automática:**

```bash
# CI step
pnpm changeset publish
# Publica: @ideia/core, @ideia/agent-runtime, @ideia/llm-router, etc.
```

### 6.2 GitHub Releases

```yaml
# .github/workflows/release.yml
name: Release IDEIA

on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Build all packages
        run: pnpm install && pnpm build
      
      - name: Generate release notes
        run: npx conventional-changelog -p angular > release-notes.md
      
      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          body_path: release-notes.md
          files: |
            packages/*/dist/*.js
            packages/*/dist/*.map
            sbom/sbom-cyclonedx.json
          draft: false
          prerelease: ${{ contains(github.ref_name, 'alpha') || contains(github.ref_name, 'beta') }}
```

### 6.3 Docker Images

| Registry | Público | Pulls | Custo | Integração |
|----------|---------|-------|-------|-----------|
| **Docker Hub** | Sim | Limitado (200 pulls/6h free) | $5/mês (pro) | ArgoCD, K3s |
| **GitHub Container Registry** | Sim | Ilimitado | $0 com GH | Actions, K8s GHCR |
| **GitLab Registry** | Sim | Ilimitado | $0 com GL | GitLab CI |
| **AWS ECR** | Privado | Ilimitado | $0.10/GB/mês | EKS |
| **GCP Artifact Registry** | Privado | Ilimitado | $0.10/GB/mês | GKE |

**Recomendação:** Docker Hub (público para comunidade) + GHCR (principal, integração Actions).

### 6.4 OpenVSX (Extensões)

Extensões Theia/IDEIA publicadas no OpenVSX Registry:

```bash
# Publicar extensão
npx ovsx publish extension.vsix \
  -p $OPEN_VSX_TOKEN

# Verificar no marketplace
# https://open-vsx.org/extension/ideia/theia-ai
```

### 6.5 Package Managers Desktop

Para distribuição do IDEIA Shell Desktop (Electron/Tauri):

| Gerenciador | Formato | Comando | Público | Manutenção |
|------------|---------|---------|---------|-----------|
| **Chocolatey** | `.nupkg` | `choco install ideia` | Windows admins | Média |
| **Homebrew** | `.rb` | `brew install ideia` | Mac devs | Baixa |
| **Scoop** | `.json` | `scoop install ideia` | Windows devs | Baixa |
| **Winget** | `.yaml` | `winget install ideia` | Windows 11 | Automática |
| **Snap** | `.snap` | `snap install ideia` | Linux | Média |
| **Flatpak** | `.flatpak` | `flatpak install ideia` | Linux | Média |

**Estratégia:** Automatizar publicação em todos os gerenciadores via CI semanal (não a cada release).

---

## 7. Observabilidade em Deploy

### 7.1 Deploy Notifications

```yaml
# .github/workflows/slack-notify.yml
name: Deploy Notifications

on:
  deployment_status:
    environments: [staging, production]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Slack notification
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "{{#if deployment_status.environment == 'production'}}{{#if deployment_status.state == 'success'}}🚀 *Deploy em produção concluído!*: `${{ github.sha }}`{{else}}🔴 *Deploy em produção FALHOU*: ${{ github.sha }}{{/if}}{{else}}🟡 *Deploy em staging*: ${{ deployment_status.environment }}{{/if}}"
                  }
                },
                {
                  "type": "context",
                  "elements": [
                    { "type": "mrkdwn", "text": "📦 ${{ github.repository }} @ ${{ github.ref_name }}" },
                    { "type": "mrkdwn", "text": "👤 ${{ github.actor }}" },
                    { "type": "mrkdwn", "text": "<${{ github.server_url }}/${{ github.repository }}/commit/${{ github.sha }}/checks|Ver detalhes>" }
                  ]
                }
              ]
            }
```

### 7.2 Rollback Triggers

**Rollback automático baseado em métricas:**

```
┌────────────────────────────────────────────┐
│           Prometheus + Alertmanager         │
│                                             │
│  Regras de Rollback:                        │
│  ┌──────────────────────────────────────┐   │
│  │  ALERT DeployErrorRate                │   │
│  │  IF rate(http_errors_total[5m])      │   │
│  │     / rate(http_requests_total[5m])  │   │
│  │     > 0.05 AND                       │   │
│  │     deploy_timestamp > 5m            │   │
│  │  → Rollback automático               │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  ALERT DeployLatencyP99              │   │
│  │  IF histogram_quantile(0.99,         │   │
│  │     rate(http_duration_seconds[5m])) │   │
│  │     > 2.0 AND                        │   │
│  │     deploy_timestamp < 30m           │   │
│  │  → Rollback automático               │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  ALERT DeployAgentFailure            │   │
│  │  IF rate(agent_tasks_failed_total[5m])│   │
│  │     / rate(agent_tasks_total[5m])    │   │
│  │     > 0.10                           │   │
│  │  → Rollback automático (canary)      │   │
│  └──────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

**Webhook receiver para rollback:**

```typescript
// packages/rollback-webhook/src/handler.ts
import { WebhookEvent } from './types';

export async function handleRollbackAlert(event: WebhookEvent): Promise<void> {
  const { alertName, labels, status } = event;
  
  if (status !== 'firing') return;
  
  // Verificar se é alerta de deploy
  if (!labels.deployment) return;
  
  console.log(`🔴 Rollback trigger: ${alertName}`, labels);
  
  // Executar rollback via ArgoCD API
  await fetch(`https://argocd.${labels.environment}.svc/api/v1/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app: labels.deployment,
      prune: true,
    }),
  });
  
  // Notificar
  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    body: JSON.stringify({
      text: `🔴 Rollback automático disparado por ${alertName}` +
            ` | Deployment: ${labels.deployment}` +
            ` | Ambiente: ${labels.environment}`,
    }),
  });
}
```

### 7.3 Deploy Dashboard

Dashboard Grafana com visão de deploys:

```json
{
  "dashboard": {
    "title": "IDEIA Deploy Dashboard",
    "panels": [
      {
        "title": "Deploy Timeline",
        "type": "state-timeline",
        "datasource": "Prometheus",
        "targets": [{
          "expr": "deploy_status{namespace='ideia'}",
          "legendFormat": "{{deployment}}"
        }]
      },
      {
        "title": "Current Deployments",
        "type": "table",
        "datasource": "Prometheus",
        "targets": [{
          "expr": "deploy_info",
          "format": "table",
          "instant": true
        }]
      },
      {
        "title": "Error Rate (last 30 min)",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [{
          "expr": "rate(http_errors_total[5m]) / rate(http_requests_total[5m])",
          "legendFormat": "Error Rate"
        }]
      },
      {
        "title": "Deploy Frequency",
        "type": "stat",
        "datasource": "Prometheus",
        "targets": [{
          "expr": "count(deploy_status) / 7",
          "legendFormat": "Deploys/week"
        }]
      }
    ]
  }
}
```

### 7.4 Post-Mortem Automation

Template de post-mortem automático via CI:

```markdown
# Post-Mortem: {TITLE}

**Data:** {DATE}
**Incidente ID:** INC-{NUMBER}
**Severidade:** P0/P1/P2
**Duração:** {DURATION}
**Deploy relacionado:** {DEPLOY_SHA}
**Rollback realizado:** Sim/Não

## Timeline
{auto-generated from deploy logs + alerts}

## Root Cause
{analysis}

## Impacto
- Usuários afetados: {NUMBER}
- Tasks perdidas: {NUMBER}
- Downtime: {DURATION}

## Ações
- [ ] Ação corretiva 1
- [ ] Ação preventiva 1
- [ ] Teste de regressão
- [ ] Melhoria de monitoramento

## Métricas
- MTTR: {value}
- MTTD: {value}
- Erro antes do rollback: {value}
```

---

## 8. Pipeline Completo IDEIA

### 8.1 Visão Unificada

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IDEIA Delivery Pipeline                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DEV ─────────────────────────────────────────────────────────────────       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Pre-commit│ │Git Push  │ │PR Open   │ │PR Review │ │PR Merge  │         │
│  │Hook:     │ │          │ │          │ │          │ │          │         │
│  │lint      │ │          │ │          │ │          │ │          │         │
│  │typecheck │ │          │ │          │ │          │ │          │         │
│  │talisman  │ │          │ │          │ │          │ │          │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│       │            │             │             │             │              │
│  ─────┴────────────┴─────────────┴─────────────┴─────────────┴──────────   │
│                                                                              │
│  CI ─────────────────────────────────────────────────────────────────       │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │  GitHub Actions (Trigger) + Dagger (Pipeline Engine)               │     │
│  │                                                                     │     │
│  │  Gate 1 │ Gate 2 │ Gate 3 │ Security │ Boundaries │ Contract Check │     │
│  │  ───────┼────────┼────────┼──────────┼────────────┼─────────────── │     │
│  │  Lint   │ Unit   │ Build  │ CodeQL   │ madge      │ Pre/PostCheck  │     │
│  │  Types  │ Integ  │ SBOM   │ Trivy    │ dependency │                │     │
│  │  Audit  │ E2E    │ Image  │ Snyk     │ tsarch     │                │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│       │                                                                     │
│  ─────┴─────────────────────────────────────────────────────────────────   │
│                                                                              │
│  CD ─────────────────────────────────────────────────────────────────       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Staging   │ │Canary 3% │ │Monitor   │ │Promote   │ │Monitor   │         │
│  │Deploy    │ │Deploy    │ │5 min     │ │50%→100%  │ │30 min    │         │
│  ││          │ │          │ ││          │ │          │ ││          │         │
│  │Auto      │ │Smoke     │ │Error     │ │Automatic │ │SLO       │         │
│  │smoke     │ │test ok   │ │rate < 5% │ │promote   │ │verificado│         │
│  └──────────┘ └─────┬────┘ └─────┬────┘ └──────────┘ └──────────┘         │
│                     │            │                                          │
│                     └── Rollback ─┘                                          │
│                         se erro                                              │
│                                                                              │
│  DEPLOY ─────────────────────────────────────────────────────────────       │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │  GitOps via ArgoCD | Feature Flags | A/B Testing                   │     │
│  │  Rollback: git revert + ArgoApp sync + Slack notify                │     │
│  │  Observability: OTel + LangFuse + Prometheus + Grafana             │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Matriz de Responsabilidades

| Ator | Gate 1 | Gate 2 | Gate 3 | Gate 4 | Gate 5 |
|------|--------|--------|--------|--------|--------|
| **Dev** | ✅ Executa local | Cria PR | — | — | — |
| **CI (GitHub Actions)** | — | ✅ Executa testes | ✅ Build + imagem | ✅ Deploy staging | ✅ Deploy prod |
| **Dagger** | — | ✅ Orquestra | ✅ Gera SBOM | ✅ Pipeline as code | ✅ Canary rollout |
| **ArgoCD** | — | — | — | ✅ GitOps sync | ✅ Progressive rollout |
| **Reviewer** | — | ✅ Approve PR | — | — | — |
| **Monitor (Prometheus)** | — | — | — | ✅ Health check | ✅ Rollback trigger |
| **Product Owner** | — | — | — | ✅ Approve staging | ✅ Approve prod |

### 8.3 Métricas de Eficácia

| Métrica | Definição | Alvo IDEIA | Como medir |
|---------|-----------|-----------|-----------|
| **Deploy Frequency** | Deploys por semana | ≥ 5/semana | GitHub API + deploy events |
| **Lead Time** | Commit → Produção | < 1h | `deploy_timestamp - commit_timestamp` |
| **Change Failure Rate** | Deploys que causam incidente | < 5% | `failed_deploys / total_deploys` |
| **MTTR** | Tempo médio de recuperação | < 30 min | Incident timer |
| **Rollback Time** | Tempo para reverter | < 5 min | Rollback automation |
| **PR Merge Rate** | PRs merged/dia | ≥ 10 | GitHub API |
| **CI Build Time** | Tempo total do pipeline | < 15 min | GitHub Actions metrics |

---

## Apêndices

### A. Glossário

| Termo | Definição |
|-------|-----------|
| **CI/CD** | Continuous Integration / Continuous Delivery — integração e entrega contínuas |
| **GitOps** | Operações de infraestrutura baseadas em Git como fonte única de verdade |
| **Canary** | Deploy gradual para um subconjunto de usuários/servidores |
| **Blue/Green** | Duas ambientes idênticos, um ativo e um ocioso, troca de tráfego na promoção |
| **Feature Flag** | Chave booleana que ativa/desativa funcionalidades sem novo deploy |
| **SBOM** | Software Bill of Materials — lista de componentes e licenças |
| **SLO** | Service Level Objective — objetivo de nível de serviço |
| **SLI** | Service Level Indicator — indicador de nível de serviço |
| **SLA** | Service Level Agreement — acordo de nível de serviço com cliente |
| **MTTR** | Mean Time To Recover — tempo médio para recuperação de falha |
| **MTTD** | Mean Time To Detect — tempo médio para detectar falha |
| **Trunk-Based** | Estratégia de branches curtas com merge frequente na main |
| **SemVer** | Semantic Versioning — versionamento semântico MAJOR.MINOR.PATCH |
| **Rollback** | Reversão de deploy para versão anterior estável |

### B. Referências

- Dagger Documentation: https://docs.dagger.io/
- ArgoCD Documentation: https://argo-cd.readthedocs.io/
- Flux CD Documentation: https://fluxcd.io/docs/
- OpenFeature Specification: https://openfeature.dev/
- Semantic Release: https://semantic-release.gitbook.io/
- Conventional Commits: https://www.conventionalcommits.org/
- CycloneDX SBOM: https://cyclonedx.org/
- Turborepo: https://turbo.build/repo/docs
- Argo Rollouts: https://argoproj.github.io/argo-rollouts/

---

> **Próximo:** Implementar módulo Dagger oficial em `./dagger/` com targets `ci`, `deploy`, `rollback`, `sbom`.
