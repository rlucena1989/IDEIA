# Zero-to-Deploy Workflow Playbook

> **Data:** 2026-07-22
> **Versao:** 1.0
> **Classificacao:** Operacional / Playbook de Orquestracao
> **Estudo-base:** ESTUDO-ZERO-TO-DEPLOY.md (S28)
> **Gap resolvido:** G4 — Zero-to-Deploy Workflow (RELATORIO-GAPS-NAO-COBERTOS-2026-07-21.md)
> **Propósito:** Guia executavel que leva uma ideia do conceito ao deploy em 6 fases orquestradas

---

## Sumario

1. [Visao Geral do Fluxo](#visao-geral-do-fluxo)
2. [Fase 1: Ideia e Requisitos](#fase-1-ideia-e-requisitos)
3. [Fase 2: Arquitetura](#fase-2-arquitetura)
4. [Fase 3: Implementacao](#fase-3-implementacao)
5. [Fase 4: Testes e Integracao](#fase-4-testes-e-integracao)
6. [Fase 5: Build e Package](#fase-5-build-e-package)
7. [Fase 6: Deploy](#fase-6-deploy)
8. [Execucao Rapida](#execucao-rapida)
9. [Niveis de Autonomia](#niveis-de-autonomia)
10. [Solucao de Problemas](#solucao-de-problemas)

---

## Visao Geral do Fluxo

```
USUARIO: "Quero um CRUD de usuarios com autenticacao JWT"
    │
    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      ZERO-TO-DEPLOY ORCHESTRATOR                       │
│                                                                        │
│  F1: Ideia &      F2: Arquitetura   F3: Implement.   F4: Testes      │
│  Requisitos       ───────────────   ──────────────   ──────────      │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     │
│  │ Analyst  │ ──▶ │Architect │ ──▶ │Programmer│ ──▶ │ Tester + │     │
│  │ Agent    │     │ Agent    │     │ Agent    │     │ Reviewer │     │
│  └──────────┘     └──────────┘     └──────────┘     └──────────┘     │
│                                                                        │
│  F5: Build &      F6: Deploy                                          │
│  Package          ──────────                                          │
│  ┌──────────┐     ┌──────────┐                                        │
│  │  DevOps  │ ──▶ │  DevOps  │ ──▶ 🟢 SISTEMA ENTREGUE                │
│  │  Agent   │     │  Agent   │                                        │
│  └──────────┘     └──────────┘                                        │
└──────────────────────────────────────────────────────────────────────┘
```

**Contratos entre fases:**

| Fase | Artefato de Saida | Consumido Por |
|------|------------------|---------------|
| F1 — Requisitos | `specification.json` | F2 — Arquitetura |
| F2 — Arquitetura | `architecture.json` | F3 — Implementacao |
| F3 — Implementacao | `source-code/` | F4 — Testes |
| F4 — Testes | `test-report.json` | F5 — Build |
| F5 — Build | `artifact.json` | F6 — Deploy |
| F6 — Deploy | `deploy-report.json` | Orquestrador |

---

## Fase 1: Ideia e Requisitos

### Entrada

Texto livre do usuario descrevendo a ideia. Ex: `"Quero um CRUD de usuarios com autenticacao JWT"`

### Agente Responsavel

**Analyst Agent** — classifica intencao, extrai requisitos, gera user stories e criterios de aceitacao.

### Passos Detalhados

1. **Prompt Pipeline classifica intencao** — identifica se e feature, bugfix, refactor ou question; extrai entidades (dominio, stack, requisitos); define urgencia (low/medium/high/critical)
2. **Analyst Agent extrai requisitos** — entrevista estruturada (LLM-guided), identificacao de stakeholders, mapeamento de restricoes (tempo, orcamento, equipe), identificacao de dependencias externas
3. **Geracao de user stories** — padrao "Como [papel] quero [feature] para [beneficio]", decomposicao em epics → stories → tasks, priorizacao MoSCoW (Must/Should/Could/Wont)
4. **Criterios de aceitacao** — cenarios Given/When/Then (Gherkin), definicao de "pronto" (DoD), metricas de sucesso (KPIs tecnicos)
5. **CHECKPOINT: Aprovacao humana** — requisitos apresentados para revisao, usuario ajusta/adiciona/remove, aprovado → Fase 2, rejeitado → retorna passo 1

### Comandos CLI

```bash
# Executar fluxo completo (inicia pela Fase 1)
IDEIA deploy "minha ideia aqui"

# Apenas classificar intencao e extrair requisitos
IDEIA prompt --classify-only "minha ideia"

# Visualizar analise completa como JSON
IDEIA prompt --format json "minha ideia"
```

### Quality Gate

| Criterio | Threshold | Verificacao |
|----------|-----------|-------------|
| Cobertura de requisitos | >90% dos requisitos implicitos detectados | Checklist de dominio |
| User stories com criterios | 100% devem ter Given/When/Then | Validacao de schema |
| Classificacao de urgencia | Definida e consistente | Match com heuristica |
| Tempo medio da fase | <5 minutos | Timing do workflow |

### Saida

`specification.json` — contrato assinado contendo requisitos, user stories, criterios de aceitacao, restricoes e Definition of Done.

---

## Fase 2: Arquitetura

### Entrada

`specification.json` da Fase 1.

### Agente Responsavel

**Architect Agent** — analisa requisitos, seleciona stack, gera ADRs, diagramas e estimativas.

### Passos Detalhados

1. **Architect Agent analisa requisitos** — le specification.json, consulta Capability Registry (S27), verifica Reality Manifest (S26), identifica padroes e reuso
2. **Selecao de stack tecnologica** — consulta Matriz Tecnologica v2, recomenda framework/banco/mensageria/etc, justifica baseada em requisitos, verifica compatibilidade cross-platform
3. **Geracao de ADRs** — cada ADR com titulo, contexto, decisao, consequencias, opcoes consideradas com pros/cons, status: proposed/accepted/deprecated
4. **Diagramas de arquitetura** — diagrama de contexto (C4 Nivel 1), diagrama de container (C4 Nivel 2), diagrama de componente (C4 Nivel 3), diagrama de sequencia para fluxos criticos
5. **Analise de riscos** — riscos tecnicos (escalabilidade, seguranca, performance), riscos de prazo (complexidade, dependencias), matriz probabilidade x impacto, mitigacoes propostas
6. **Estimativa de esforco** — story points por modulo, estimativa otimista/provavel/pessimista (PERT), cronograma sugerido
7. **CHECKPOINT: Revisao de arquitetura** — arquitetura apresentada para humano, ADRs abertos para discussao, aprovado → Fase 3, rejeitado → retorna passo 1

### Comandos CLI

```bash
# Visualizar arquitetura gerada
IDEIA context search "architecture.json"

# Verificar capacidades disponiveis para o stack
IDEIA context search "capability registry"

# Analise de impacto arquitetural
IDEIA agent run "analisar arquitetura para CRUD usuarios"
```

### Quality Gate

| Criterio | Threshold | Verificacao |
|----------|-----------|-------------|
| ADRs completos | Minimo 3 ADRs com opcoes e justificativas | Validacao de schema |
| Stack definido | Linguagem, framework, banco, deploy | Schema completo |
| Riscos identificados | Minimo 3 riscos com mitigacao | Matriz probabilidade x impacto |
| Estimativa presente | Story points + PERT | Schema valido |
| Diagramas | Minimo diagrama de contexto + container | PlantUML/Mermaid valido |

### Saida

`architecture.json` — contendo stack, ADRs, diagramas (PlantUML/Mermaid), riscos, estimativas.

---

## Fase 3: Implementacao

### Entrada

`architecture.json` da Fase 2.

### Agente Responsavel

**Programmer Agent** — scaffold do projeto, implementacao completa backend e frontend.

### Passos Detalhados

1. **Programmer Agent prepara ambiente** — scaffold do projeto (Node CLI, API, Lib), estrutura de diretorios padrao, configuracao inicial (tsconfig, eslint, prettier), setup de dependencias (package.json)
2. **Implementacao iterativa por modulo** — ordem definida pelo grafo de dependencias, cada modulo: interface → implementacao → teste, validacao em tempo real (lint + typecheck), commit a cada modulo completo
3. **Geracao de codigo por camada** — camada de dominio (entidades, value objects, eventos), camada de aplicacao (use cases, DTOs), camada de infraestrutura (repositorios, adapters, servicos externos), camada de API (routes, controllers, middlewares), arquivos de configuracao (.env, Dockerfile, CI)
4. **Validacao continua** — TypeScript: tsc --noEmit, Lint: eslint --fix, Formatacao: prettier --write, Syntax: node --check
5. **CHECKPOINT: Revisao de codigo** — diff apresentado para humano, metricas (linhas, complexidade, cobertura), aprovado → Fase 4, rejeitado → retorna passo 2

### Comandos CLI

```bash
# Scaffold de novo projeto
IDEIA init projeto-crud

# Scaffold por tipo
node .ai/ideia-tools.mjs scaffold node-api ./projeto-crud

# Executar validacao continua
npm run lint && npm run typecheck
```

### Quality Gate

| Criterio | Threshold | Verificacao |
|----------|-----------|-------------|
| Clean Architecture | Dominio nao importa infraestrutura | ESLint boundary rule |
| Contratos explicitos | Todo DTO validado com Contract.pre() | AST scan |
| Proibido `any` | Zero ocorrencias de `any` sem justificativa | ESLint no-explicit-any |
| Cobertura por modulo | >30% ao final da fase | Jest --coverage |
| Sem secrets | Nenhuma chave/segundo no codigo | Talisman / secrets scan |
| Cross-platform | Paths com path.join(), nunca "/" ou "\\" | Lint rule |
| TypeScript compile | Zero erros | tsc --noEmit |
| Lint | Zero erros | eslint |

### Saida

`source-code/` — repositorio completo no workspace com estrutura padrao:

```
projeto/
├── src/
│   ├── domain/       (entidades, value-objects, eventos)
│   ├── application/  (use cases, DTOs)
│   ├── infrastructure/ (persistencia, auth, config)
│   └── api/          (routes, controllers, middleware)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── .github/workflows/ci.yml
├── package.json / tsconfig.json / eslint.config.js
└── .env.example / README.md
```

---

## Fase 4: Testes e Integracao

### Entrada

`source-code/` da Fase 3 + `specification.json` da Fase 1.

### Agentes Responsaveis

- **Tester Agent** — gera e executa testes unitarios, integracao e E2E
- **Reviewer Agent** — revisa codigo por qualidade, seguranca e performance

### Passos Detalhados

1. **Tester Agent analisa codigo e especificacao** — le specification.json (user stories + criterios), le architecture.json (contratos, interfaces), analisa codigo existente (cobertura atual), identifica lacunas de teste
2. **Geracao de testes unitarios** — Jest/Vitest configurado, testes por entidade/use case/controller, mocks para dependencias externas, validacao de bordas e erros
3. **Geracao de testes de integracao** — banco de dados real ou testcontainers, fluxos completos (request → banco → response), autenticacao e autorizacao, idempotencia e concorrencia
4. **Geracao de testes E2E** — Playwright ou Cypress, fluxos de usuario completos, cobertura de criterios de aceitacao, testes de regressao visual
5. **Reviewer Agent revisa codigo + testes** — revisao estatica (lint, types, complexidade), revisao de seguranca (injection, secrets), revisao de performance (N+1 queries, loops), revisao de boas praticas (SOLID, DRY, KISS), relatorio consolidado com score
6. **Ciclo de correcao** — problemas criticos: correcao imediata, problemas moderados: fila de correcao, sugestoes: documentadas para sprint, ciclo: corrige → testa → verifica
7. **CHECKPOINT: Quality Gate** — cobertura de testes > 30%, todos os testes passando, lint + typecheck sem erros, revisao sem blockers, aprovado → Fase 5, rejeitado → retorna passo 5

### Comandos CLI

```bash
# Executar suite de testes
npm run test:unit
npm run test:integration
npm run test:e2e

# Verificar cobertura
npm run cov:track

# Auditoria de codigo
node .ai/ideia-tools.mjs agent run "auditar codigo e testes"

# Validar qualidade
npm run ai:gap:check
```

### Quality Gate

| Criterio | Threshold | Verificacao |
|----------|-----------|-------------|
| Cobertura de linhas | >30% | Istanbul report |
| Cobertura de branches | >25% | Istanbul report |
| Testes unitarios passando | 100% | Jest result |
| Testes integracao passando | 100% | Jest result |
| Testes E2E passando | 100% | Playwright result |
| Lint errors | 0 | eslint |
| Type errors | 0 | tsc --noEmit |
| Review blockers | 0 | Reviewer report |
| Security scan | 0 vulnerabilidades criticas | Trivy / audit |

### Saida

`test-report.json` — contendo resultados de testes (unitarios, integracao, E2E), cobertura (linhas, branches, funcoes, statements), revisao (score, blockers, lint/types errors), quality gates (nome, pass/fail, threshold, actual).

---

## Fase 5: Build e Package

### Entrada

`source-code/` + `test-report.json` da Fase 4.

### Agente Responsavel

**DevOps Agent** — configura pipeline, build, containerizacao, SBOM e assinatura.

### Passos Detalhados

1. **DevOps Agent configura pipeline CI/CD** — GitHub Actions ou GitLab CI config, matriz de build (node versions, OS), stages: lint → typecheck → test → build, cache de dependencias
2. **Build do artefato** — compilacao TypeScript (tsc), bundle (esbuild/webpack) se frontend, geracao de sourcemaps, verificacao de integridade (hash checksum)
3. **Containerizacao (Docker)** — Dockerfile multi-stage, imagem otimizada (distroless/alpine), scan de vulnerabilidades (trivy), tag semantica (git sha + versao)
4. **Geracao de SBOM** — format cyclonedx ou spdx, listagem de todas as dependencias, identificacao de licencas, assinatura digital
5. **Assinatura e Proveniencia** — assinatura de imagem (cosign), attestation (in-toto), --provenance (npm publish quando aplicavel)
6. **CHECKPOINT: Artefato pronto** — imagem publicada no registry, SBOM disponivel, scan sem vulnerabilidades criticas, aprovado → Fase 6, rejeitado → retorna passo 2

### Comandos CLI

```bash
# Build do projeto
npm run build

# Build Docker
docker build -t app:latest -f docker/Dockerfile .

# Scannear vulnerabilidades
trivy image app:latest

# Executar pipeline de build completa
npm run ai:gap:check && npm run build
```

### Quality Gate

| Criterio | Threshold | Verificacao |
|----------|-----------|-------------|
| Compilacao | Zero erros | tsc / esbuild |
| Docker build | Sucesso | docker build exit code |
| Trivy scan | 0 vulnerabilidades criticas | Trivy JSON output |
| SBOM gerado | Presente e valido | cyclonedx/spdx valido |
| Checksums | Presentes para todos artefatos | sha256sum |
| Sourcemaps | Gerados (se aplicavel) | Presente no bundle |

### Saida

`artifact.json` — contendo imagem (registry, name, tag, digest, size), SBOM (format, version, dependencies, vulnerabilities), signature (tool, keyId, timestamp), checksums.

---

## Fase 6: Deploy

### Entrada

`artifact.json` da Fase 5.

### Agente Responsavel

**DevOps Agent** — deploy local/cloud, health check, verificacao e rollback.

### Passos Detalhados

1. **Definicao de ambiente** — local (docker-compose), staging (ambiente controlado), producao (com rollout progressivo), configuracao por ambiente (variaveis, secrets)
2. **Deploy local (dev)** — docker-compose up -d, banco de dados + migracoes, verificacao de porta e conectividade, URL local disponivel
3. **Deploy cloud (staging/prod)** — SSH ou API do provedor, Docker pull da imagem, docker stack deploy ou compose, configuracao de dominio e SSL
4. **Verificacao pos-deploy (health check)** — GET /health → 200, GET /ready → 200 (dependencias prontas), GET /metrics → 200 (se aplicavel), smoke test (endpoints principais)
5. **Rollback plan** — versao anterior identificada, script de rollback gerado, ponto de restauracao do banco, tempo estimado de rollback < 5 min
6. **Relatorio de deploy** — status (success/failed/rolled-back), tempos de cada etapa, URLs de acesso, logs de deploy, recomendacoes pos-deploy

### Comandos CLI

```bash
# Deploy local com Docker Compose
docker compose up -d

# Verificar health check
curl http://localhost:3000/health

# Verificar readiness
curl http://localhost:3000/ready

# Ver logs
docker compose logs -f app

# Rollback (se necessario)
docker compose down
docker compose up -d app:previous-tag
```

### Quality Gate

| Criterio | Threshold | Verificacao |
|----------|-----------|-------------|
| Health check | GET /health → 200 | HTTP status code |
| Readiness check | GET /ready → 200 | HTTP status code + dependencias |
| Smoke test | Endpoints principais respondendo | Testes E2E pos-deploy |
| Porta | Porta configurada respondendo | netstat / curl |
| Rollback disponivel | Script gerado e testado | Teste de rollback |
| Migracoes | Banco migrado sem erros | Exit code zero |
| Tempo de deploy | < 5 minutos | Timing do workflow |

### Saida

`deploy-report.json` — contendo status (success/failed/rolled-back), environment (local/staging/production), URLs (app, api, health), health checks (name, endpoint, status, duration, healthy), timing (total, pull, migrate, start, verify), rollback (available, previousDigest, script, estimatedTime), logs, recommendations.

---

## Execucao Rapida

```bash
# 1. De uma ideia — o orquestrador guia todo o fluxo
IDEIA deploy "CRUD de usuarios com autenticacao JWT"

# 2. Ou execute passo a passo manualmente:
# Fase 1: Requisitos
IDEIA prompt "CRUD de usuarios com autenticacao JWT" --format json > specification.json

# Fase 2: Arquitetura
IDEIA agent run "gerar arquitetura baseada em specification.json"

# Fase 3: Implementacao
IDEIA init meu-crud
IDEIA agent run "implementar CRUD usuarios com autenticacao JWT"

# Fase 4: Testes
npm run test:unit && npm run test:integration && npm run test:e2e
IDEIA agent run "revisar codigo e gerar test-report.json"

# Fase 5: Build
npm run build
docker build -t meu-crud:latest -f docker/Dockerfile .

# Fase 6: Deploy
docker compose up -d
curl http://localhost:3000/health
```

---

## Niveis de Autonomia

| Nivel | Nome | Aprovacao Humana | Fases Automaticas |
|-------|------|-----------------|-------------------|
| N0 | Assistido | Todas as fases requerem aprovacao | Nenhuma |
| N1 | Supervisionado | F1 (req), F2 (arch), F6 (deploy) | F3, F4, F5 |
| N2 | Semi-Autonomo | F2 (arch), F6 (deploy) | F1, F3, F4, F5 |
| N3 | Autonomo | F6 (deploy only) | F1, F2, F3, F4, F5 |
| N4 | Total | Nenhuma | Todas |

```bash
# Executar com nivel de autonomia especifico
IDEIA deploy "CRUD usuarios" --autonomy-level 2
```

---

## Solucao de Problemas

| Problema | Causa Provavel | Solucao |
|----------|---------------|---------|
| Fase 1 nao classifica corretamente | Prompt vago ou ambiguo | Seja mais especifico na descricao |
| Fase 2 sugere stack inadequado | Capability Registry desatualizado | Execute `IDEIA context` para sincronizar |
| Fase 3 falha no build | Dependencias conflitantes | Use `node .ai/ideia-tools.mjs validate` antes |
| Fase 4 cobertura abaixo do minimo | Testes insuficientes | Execute `npm run ai:gap:check` para diagnosticar |
| Fase 5 imagem com vulnerabilidades | Dependencias desatualizadas | Atualize com `npm audit fix` |
| Fase 6 health check falha | Porta ocupada ou banco offline | Verifique `docker compose logs` |
| Workflow trava em aprovacao humana | Timeout excedido (padrao 30min) | Configure timeout menor ou mude nivel autonomia |
| Comando `IDEIA deploy` nao encontrado | CLI nao configurada | Execute `npm install -g @ideia/cli` |

---

> **Playbook registrado em:** `docs/governance/document-registry.md`
> **Estudos relacionados:** S28 (ESTUDO-ZERO-TO-DEPLOY.md), S3, S5, S6, S16, S27
> **Gap resolvido:** G4 — Zero-to-Deploy Workflow
