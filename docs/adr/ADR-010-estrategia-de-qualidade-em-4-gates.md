---
id: ADR-010
title: "Estratégia de Qualidade em 4 Gates"
status: Approved
date: 2026-07-17
deciders: Arquiteto, Tech Lead, Product Owner
consulted: Equipe de Engenharia, QA
---

# ADR-010: Estratégia de Qualidade em 4 Gates

**Status:** Approved

## Contexto

O IDEIA é uma plataforma de missão crítica — transforma ideias em sistemas completos com agentes autônomos. Um erro na geração de código, uma falha de segurança ou uma decisão incorreta de arquitetura pode comprometer todo o sistema gerado. A qualidade não é opcional: é um requisito central do produto. No entanto, o processo de qualidade atual do ai-devkit é ad-hoc, sem gates definidos, sem métricas de cobertura, sem verificação de segurança automatizada, e sem integração contínua de qualidade no ciclo de desenvolvimento.

O framework de qualidade precisa ser prático e progressivo: cada gate deve adicionar valor sem bloquear o desenvolvedor desnecessariamente. Os 7 Quality Gates do roadmap (Commit, PR, Release, Sprint) foram refinados para 4 gates com critérios objetivos e pontuações alvo, seguindo o estudo de qualidade total (ESTUDO-QUALIDADE-TOTAL-IDEIA.md). Cada gate tem dimensões específicas (código, segurança, performance, UX, integração, resiliência, dados) com scores alvo crescentes ao longo das fases.

Três opções foram consideradas: (1) 4 gates progressivos (Commit, PR, Release, Sprint); (2) Gate único de Release com verificação completa; (3) Quality dashboard contínuo sem gates bloqueantes.

## Decisão

Implementar 4 Quality Gates progressivos com critérios objetivos e automação. **Gate 1 (Commit):** pre-commit hook com lint-staged (eslint --fix + prettier --write), commitlint (conventional commit), talisman (secret scan), tsc --noEmit (typecheck), jest --changedSince HEAD~1. **Gate 2 (PR):** GitHub status checks com lint, typecheck, coverage (mínimo 20% → 50% → 80%), security scan (CodeQL, snyk, injection suite), boundaries arquiteturais, contract-check entre módulos. **Gate 3 (Release):** E2E completo, performance full suite, security full suite, resiliência, load test, audit chain verification, SBOM, changelog. **Gate 4 (Sprint):** NPS, bug count, task error rate, time-to-first-task, technical debt, coverage, velocity, test flakiness.

## Consequências

**Positivas:**
- Qualidade consistente e mensurável em todas as etapas do desenvolvimento
- Detecção precoce de problemas (Gate 1/2) reduz custo de correção
- Automação reduz carga manual de revisão (humanos focam em lógica, não em estilo)
- Progressão natural de confiança: de "sabe que não quebrou" (Gate 1) a "sabe que entrega valor" (Gate 4)
- Métricas objetivas para tomada de decisão de release
- Cultura de qualidade embedada no ciclo de desenvolvimento (não após)

**Negativas:**
- Tempo em CI/CD aumenta (Gate 2 pode levar 15-30min, Gate 3 pode levar 1-2h)
- Pre-commit hooks podem ser vistos como lentos para commits frequentes (~10-30s adicionais)
- Manutenção dos scripts e ferramentas de qualidade (gap-check.js, contract-check, etc.)
- Falsos positivos em security scans exigem triagem manual
- Métricas de Sprint (NPS, time-to-task) exigem ferramentas de coleta e dashboard

## Decision

Implement 4 progressive Quality Gates with objective criteria and automation. **Gate 1 (Commit):** pre-commit hook with lint-staged (eslint --fix + prettier --write), commitlint (conventional commit), talisman (secret scan), tsc --noEmit (typecheck), jest --changedSince HEAD~1. **Gate 2 (PR):** GitHub status checks with lint, typecheck, coverage (20% -> 50% -> 80%), security scan (CodeQL, snyk, injection suite), architectural boundaries, contract-check between modules. **Gate 3 (Release):** Full E2E, performance suite, security suite, resilience testing, load testing, audit chain verification, SBOM, changelog. **Gate 4 (Sprint):** NPS, bug count, task error rate, time-to-first-task, technical debt, coverage, velocity, test flakiness.

## Consequences

**Positive:** Consistent and measurable quality across all development stages; early problem detection (Gates 1/2) reduces fix cost; automation reduces manual review burden (humans focus on logic, not style); natural confidence progression from "knows it didn't break" (Gate 1) to "knows it delivers value" (Gate 4); objective metrics for release decision-making; quality culture embedded in the development cycle (not retroactive).

**Negative:** CI/CD time increases (Gate 2 may take 15-30min, Gate 3 may take 1-2h); pre-commit hooks may feel slow for frequent commits (~10-30s added); maintenance burden of quality scripts and tools (gap-check.js, contract-check, etc.); security scan false positives require manual triage.

**Risk:** Sprint metrics (NPS, time-to-task) require dedicated collection tools and dashboards, adding infrastructure overhead; teams may attempt to game metrics under delivery pressure; overly strict gates may slow development velocity and frustrate developers.

## Opções Consideradas

| Opção | Descrição | Motivo para Rejeição |
|-------|-----------|---------------------|
| Gate único de Release | Toda verificação concentrada antes do release | Problemas detectados tarde (retrabalho caro); sem feedback rápido para desenvolvedores; risco de blockers de última hora |
| Quality dashboard contínuo sem gates | Métricas visíveis em dashboard sem bloqueio | Sem enforcement de qualidade; times podem ignorar métricas sob pressão de entrega; degradação silenciosa de qualidade |
| Apenas lint + test (sem security/perf gates) | Gates mínimos apenas no commit e PR | Risco de segurança e performance não endereçado; não atende requisitos de plataforma multiagente; sem confiança para release |

## Referências

- `docs/ESTUDOS/ESTUDO-QUALIDADE-TOTAL-IDEIA.md` — Framework completo de qualidade (7 dimensões, 5 tipos de teste, 4 gates)
- `docs/ESTUDOS/IDEIA-MASTER.md` — Roadmap com milestones de qualidade
- `docs/ESTUDOS/PLANO-IMPLEMENTACAO-IDEIA-DETALHADO.md` — 22 tarefas de QA no roadmap
- `docs/ESTUDOS/PIPELINE-VERIFICACAO-QUALIDADE-ENTREGA.md` — Pipeline de verificação
- `AGENTS.md` — Seção de Quality Gates e dimensões
