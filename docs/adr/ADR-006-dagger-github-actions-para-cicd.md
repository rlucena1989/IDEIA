---
id: ADR-006
title: Dagger + GitHub Actions para CI/CD
status: Approved
date: 2026-07-17
deciders: Arquiteto, DevOps Engineer
consulted: Equipe de Infraestrutura
---

# ADR-006: Dagger + GitHub Actions para CI/CD

**Status:** Approved

## Contexto

O CI/CD atual do ai-devkit usa GitHub Actions com workflows YAML templates. Embora funcional, essa abordagem tem limitações: os pipelines são definidos em YAML, sem possibilidade de testes locais, sem reuso programático de steps entre projetos, e sem versionamento adequado de pipelines como código. Além disso, o YAML de GitHub Actions torna-se rapidamente complexo para pipelines com múltiplos stages, matrix builds e deploys condicionais.

O IDEIA exige um pipeline de entrega programável, testável localmente e versionado no mesmo repositório do código. A integração contínua precisa executar os 4 Quality Gates (Commit, PR, Release, Sprint) com verificações de lint, typecheck, testes, segurança, performance e deploy progressivo. O pipeline também precisa suportar GitOps para deploy em Kubernetes e IaC para infraestrutura como código.

Três opções foram consideradas: (1) Dagger + GitHub Actions, (2) GitHub Actions puro com actions modulares, (3) Tekton + ArgoCD em cluster Kubernetes.

## Decisão

Adotar Dagger como engine de pipeline as code em TypeScript, com GitHub Actions como trigger e executor de workflows. Dagger será usado para definir os pipelines de CI/CD (build, test, lint, security scan, deploy) em código TypeScript testável, executável localmente com `dagger call`, e versionado no repositório. GitHub Actions orquestrará a execução dos pipelines Dagger via actions triggers (push, PR, release). ArgoCD será usado para GitOps em ambientes Kubernetes, e OpenTofu para IaC.

## Consequências

**Positivas:**
- Pipelines versionados no mesmo repositório do código, revisáveis em PRs
- Testes locais dos pipelines com `dagger call` sem push para GitHub
- Reuso programático de steps via funções TypeScript (vs copy-paste de YAML)
- Mesma linguagem do resto do projeto (TypeScript), reduzindo contexto switching
- Integração nativa com containers (Dagger executa steps em containers isolados)
- Modularidade: cada step é uma função testável isoladamente
- Portabilidade entre CI providers (GitHub Actions, GitLab CI, Jenkins) sem reescrever pipelines

**Negativas:**
- Complexidade inicial de setup (Dagger Engine, SDK, integração com GitHub Actions)
- Curva de aprendizado para o time de DevOps (novo conceito de pipeline SDK vs YAML)
- Dagger Engine requer Docker ou containerd para execução
- Comunidade menor que GitHub Actions (menos exemplos e templates)
- Overhead de execução comparado a shell scripts simples

## Decision

Adopt Dagger as the pipeline-as-code engine in TypeScript, with GitHub Actions as the trigger and workflow executor. Dagger defines CI/CD pipelines (build, test, lint, security scan, deploy) in testable TypeScript code, executable locally via `dagger call`, and versioned in the repository. GitHub Actions orchestrates Dagger pipeline execution via action triggers (push, PR, release). ArgoCD handles GitOps in Kubernetes environments, and OpenTofu manages Infrastructure as Code.

## Consequences

**Positive:** Pipelines versioned in the same repository, reviewable in PRs; local pipeline testing with `dagger call` without pushing to GitHub; programmatic step reuse via TypeScript functions (vs YAML copy-paste); same language as the rest of the project (TypeScript), reducing context switching; native container integration (Dagger executes steps in isolated containers); modularity with each step as an independently testable function; portability across CI providers (GitHub Actions, GitLab CI, Jenkins) without rewriting pipelines.

**Negative:** Complex initial setup (Dagger Engine, SDK, GitHub Actions integration); DevOps team learning curve (new pipeline SDK concept vs YAML); Dagger Engine requires Docker or containerd for execution; smaller community than GitHub Actions (fewer examples and templates).

**Risk:** Execution overhead compared to simple shell scripts may slow down simple CI tasks; dependency on Dagger Engine availability and version compatibility.

## Opções Consideradas

| Opção | Descrição | Motivo para Rejeição |
|-------|-----------|---------------------|
| GitHub Actions puro + Actions modulares | Workflows YAML com actions reutilizáveis | YAML complexo para pipelines com stages condicionais; sem execução local; sem type safety; sem testabilidade de pipelines |
| Tekton + ArgoCD | Pipelines Kubernetes-native | Overhead operacional alto (precisa cluster K8s); complexidade de CRDs e controllers; não executa localmente sem cluster; excessivo para fase inicial |
| Jenkins + Jenkinsfile | Pipeline as code com Groovy | Legado; Groovy tem baixa adoção; manutenção complexa; plugins com compatibilidade quebradiça; sem execução local fácil |

## Referências

- `docs/ESTUDOS/PIPELINE-VERIFICACAO-QUALIDADE-ENTREGA.md` — Pipeline de entrega e verificação
- `docs/ESTUDOS/MATRIZ-TECNOLOGICA-COMPLETA.md` — Categoria G (CI/CD e Deploy), seção G1 (GitHub Actions) e G3 (Dagger)
- `docs/ESTUDOS/IDEIA-MASTER.md` — Fluxo de CI/CD com Dagger + ArgoCD + OpenTofu
- `docs/ESTUDOS/ESTUDO-QUALIDADE-TOTAL-IDEIA.md` — 4 Quality Gates e framework de qualidade
- Dagger Docs: https://docs.dagger.io/
- ArgoCD: https://argo-cd.readthedocs.io/
- OpenTofu: https://opentofu.org/
