# ESTUDO S52 — PR Automation Pipeline: Competitive Analysis & Implementation Strategy

> **Automacao completa de Pull Requests: planejamento, codificacao, testes, CI monitoring, auto-fix, review generation e merge gate**
> Data: 2026-07-22
> Tipo: `study`
> Status: `draft`
> Propósito: Analise competitiva das capacidades de automacao de PR em Devin/Factory/Copilot/GitHub Actions e estrategia de implementacao na IDEIA

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial — analise competitiva + arquitetura + implementacao |

---

## Sumario

1. [Introducao](#1-introducao)
2. [Competitive Landscape](#2-competitive-landscape)
3. [IDEIA Current State](#3-ideia-current-state)
4. [Architecture: IDEIA PR Pipeline](#4-architecture-ideia-pr-pipeline)
5. [Step 1: PR Planning](#5-step-1-pr-planning)
6. [Step 2: Code Implementation](#6-step-2-code-implementation)
7. [Step 3: Test Generation & Execution](#7-step-3-test-generation--execution)
8. [Step 4: CI Monitoring](#8-step-4-ci-monitoring)
9. [Step 5: Auto-Fix Loop](#9-step-5-auto-fix-loop)
10. [Step 6: Review Generation](#10-step-6-review-generation)
11. [Step 7: Merge Gate](#11-step-7-merge-gate)
12. [CI Integration](#12-ci-integration)
13. [Multi-Repository Support](#13-multi-repository-support)
14. [Code Examples](#14-code-examples)
15. [Implementation Roadmap](#15-implementation-roadmap)
16. [Conexoes](#16-conexoes)

---

## 1. Introducao

Pull Requests sao o mecanismo central de colaboracao no desenvolvimento de software moderno. Em 2026, ferramentas de IA autonomas elevam a automacao de PR de simples diff review para ciclos completos de planejamento, implementacao, teste, CI monitoring, auto-correcao e review inteligente.

A IDEIA precisa de um pipeline completo de automacao de PR para competir com Devin, Factory e Copilot no cenario enterprise. Este estudo propoe uma arquitetura em 7 passos, cada um implementado como um agente especializado, integrado ao ecossistema IDEIA via NATS JetStream, LangGraph e com supervisao humana configuravel.

### 1.1 Por que PR Automation e Critico

| Fator | Impacto |
|-------|---------|
| Time-to-merge | Automacao reduz de horas/dias para minutos |
| Qualidade consistente | Agentes seguem padroes definidos, nao pulam etapas |
| CI reliability | Auto-fix elimina builds quebrados sem intervencao humana |
| Review scalability | IA revisa 100% dos PRs, humanos revisam apenas diffs criticos |
| Developer experience | Devs focam em design/arquitetura, nao em tarefas mecanicas |
| Onboarding | Novos devs produzem PRs no padrao da equipe desde o dia 1 |

### 1.2 Conceitos Fundamentais

| Conceito | Definicao |
|----------|-----------|
| PR Pipeline | Sequencia de passos automatizados que transformam uma issue/feature request em um PR mergeado |
| Branch Strategy | Convencao de nomenclatura e ciclo de vida de branches (feature/IDEIA-xxx, fix/, chore/) |
| Conventional Commits | Padrao de mensagens de commit: tipo(escopo): descricao |
| CI Watcher | Servico que monitora eventos de CI em tempo real e correla com PRs |
| Fix Loop | Ciclo de analise de erro -> correcao -> commit -> re-trigger CI com max attempts |
| Merge Gate | Ponto de controle que bloqueia merge ate aprovacao humana e passagem em todos os gates |
| Test Evidence | Relatorio de execucao de testes anexado ao PR como prova de qualidade |

---

## 2. Competitive Landscape

### 2.1 Devin (Cognition)

Devin e a ferramenta mais autonoma do mercado. Seu ciclo de PR e completo:

| Capacidade | Devin | Descricao |
|------------|-------|-----------|
| Branch creation | Automatica | Cria branch a partir de issue assignment, nome derivado do ticket |
| Code implementation | Agente Programmer | Implementa escopo definido no plano, multi-file changes |
| Test generation | Agente Tester | Gera tests, executa suite existente, valia cobertura |
| PR creation | Automatica | Cria PR com descricao gerada, linked issues, checklist |
| CI monitoring | Nativo | Acompanha CI em tempo real, logs de execucao |
| Auto-fix on failure | Ciclo completo | Analisa erro, corrige, atualiza PR, re-triggers CI |
| Human review | Obrigatorio | Tech lead review final, Devin responde a comments |
| Merge | Manual (humano) | Apenas humano mergeia, Devin nao tem auto-merge |
| Multi-repo | Sim | Cross-repo dependencies, synchronized PRs |
| Test evidence | Screenshots + logs | Anexa videos de teste E2E, logs de execucao |
| Max fix attempts | Ilimitado (config) | Loop ate passar ou humano interromper |

**Diferenciais Devin:**
- VM isolada com ambiente completo (shell, navegador, sistema de arquivos)
- Computer Use para testar UIs graficas
- Playwright scripting para SSO/OAuth
- Sidekick agent para tarefas paralelas baratas
- Devin Fusion (multi-modelo) com contextos cacheados

**Limitacoes Devin:**
- Sem auto-merge (humano sempre precisa aprovar)
- Sem merge strategy configurada (sempre squash)
- Sem changelog generation automatica
- PR description generica, sem section-level detalhamento
- Sem verificacao de politicas de branch
- Custo alto (~$500/mo enterprise)

### 2.2 Factory (Factory AI)

Factory usa o conceito de "Droids" — agentes especializados que criam PRs com evidencia de teste:

| Capacidade | Factory | Descricao |
|------------|---------|-----------|
| Branch creation | Automatica | Factory Box (sandbox) -> branch sync |
| Code implementation | Droid | Agente especializado por tipo de tarefa |
| Test generation | Sim | Gera testes, executa, anexa coverage report |
| PR creation | Automatica | PR com descricao + test evidence |
| CI monitoring | Parcial | Box monitora CI do repositorio |
| Auto-fix | Limitado | Box pode ser re-executada com fixes manuais |
| Review generation | Review-bot | Bot analisa diff, code quality, test coverage |
| Merge gate | Merge-after-review | Auto-merge apos aprovacao humana |
| Test evidence | Coverage report | Anexa relatorio de cobertura ao PR |
| Security scan | Sim | Dependency scan, SAST integrado |

**Diferenciais Factory:**
- Factory Box: ambiente sandbox replicavel, snapshot-based
- Review-bot: analise automatica de diff com metricas de qualidade
- Merge-after-review: workflow completo ate merge sem intervencao
- Test Coverage Gate: bloqueia merge se cobertura abaixo do threshold
- Security gates: dependency scan + SAST antes do merge

**Limitacoes Factory:**
- Sem CI monitoring em tempo real (polling-based)
- Auto-fix loop fraco: nao tenta corrigir automaticamente
- PR planning basico: nao faz task decomposition
- Sem suporte a monorepo com workspace awareness
- Sem changelog generation

### 2.3 GitHub Copilot (Microsoft)

Copilot tem capacidades de PR integradas ao ecossistema GitHub:

| Capacidade | Copilot | Descricao |
|------------|---------|-----------|
| Branch creation | Manual | Usuario cria branch manualmente |
| Code implementation | Copilot Edits | Assistencia inline, nao autonomo |
| Test generation | Copilot Workspace | Gera testes via chat, nao automatico |
| PR creation | Automatica (descricao) | Gera descricao do PR baseada no diff |
| CI monitoring | GitHub Actions | Nativo ao ecossistema GitHub, triggers on PR |
| Auto-fix | Nao | Copilot sugere fixes, mas nao executa |
| Review generation | Copilot Code Review | Review summaries, suggestions inline |
| Merge gate | Manual | Merge button with branch protection |
| PR description | AI-generated | Summarizes changes, suggests reviewers |
| Code review | AI Review | Comments on diff, suggests improvements |

**Diferenciais Copilot:**
- Integracao nativa com GitHub (maior ecossistema do mundo)
- Copilot Code Review: review summaries com suggestions inline
- PR description generation contextual
- Copilot Workspace: planejamento multi-file
- Enterprise governance: SSO, policies, auditability
- Custo baixo ($10-39/mo)

**Limitacoes Copilot:**
- Nao autonomo: requer acao humana para quase tudo
- Sem CI monitoring dedicado (usa GitHub Actions nativo)
- Sem auto-fix loop
- Sem test generation automatica
- PR planning basico (descricao apenas)
- Sem merge gate configuravel alem do GitHub nativo

### 2.4 GitHub Actions (CI/CD Platform)

Github Actions fornece a infraestrutura de CI/CD que as ferramentas acima consomem:

| Capacidade | GitHub Actions | Descricao |
|------------|---------------|-----------|
| PR triggers | workflow_dispatch, pull_request | Eventos de PR disparam workflows |
| CI execution | Jobs matrix, parallel steps | Executa lint, test, build, security |
| Status reporting | Commit status API | Reported status to PR (pending/success/failure) |
| Artifact collection | upload/download-artifact | Logs, test reports, build artifacts |
| Test result parsing | JUnit reporter | Parse JUnit XML, show in checks UI |
| Branch protection | Rulesets | Require status checks, reviews, etc |
| Secrets management | Encrypted secrets | Per-repo/environment secrets |
| Self-hosted runners | Sim | Runners customizados com hardware especifico |

**Diferenciais GitHub Actions:**
- Gratuito para repositorios publicos
- Ecossistema massivo de actions no marketplace
- Matrix builds multi-OS/versao
- Cache de dependencias
- Reusable workflows
- Environment protection rules

**Limitacoes GitHub Actions:**
- Nao e uma ferramenta de automacao de PR — e infraestrutura
- Sem geracao de codigo ou testes
- Sem PR planning
- Sem auto-fix loop
- Sem review generation
- YAML-heavy, curva de aprendizado

### 2.5 Comparative Table

| Capacidade | Devin | Factory | Copilot | GitHub Actions | IDEIA (Proposto) |
|------------|-------|---------|---------|---------------|------------------|
| Branch creation | Automatica | Automatica | Manual | N/A | Automatica (conventional) |
| Code implementation | Autonoma (Programmer Agent) | Droid | Assistido | N/A | Programmer Agent |
| Test generation | Agente Tester | Sim | Chat-based | N/A | Tester Agent + coverage |
| PR creation | Automatica | Automatica | Descricao apenas | N/A | Completa (descricao + checklist + test evidence) |
| PR description | Generica | Basica | AI-generated | N/A | Estruturada (sections, checklist, linked issues) |
| CI monitoring | Nativo (tempo real) | Polling | Nativo GH | Event-driven | WebSocket listener + log parser |
| Auto-fix loop | Completo | Limitado | Sugestoes | N/A | Configuravel (max attempts, escalate) |
| Review generation | N/A (humano) | Review-bot | AI Code Review | N/A | Reviewer Agent (summary + quality + security + perf) |
| Merge gate | Manual | Merge-after-review | Manual | Branch protection | Configuravel (human required ou auto-merge) |
| Merge strategy | Squash | Configuravel | N/A | N/A | Configuravel (squash/rebase/merge) |
| Changelog update | Nao | Nao | Nao | N/A | Automatico |
| Test evidence | Screenshots | Coverage report | N/A | Artifacts | Logs + coverage + screenshots |
| Multi-repo | Sim | Limitado | N/A | Monorepo-aware | Monorepo + multi-repo |
| Security scan | Secrets scan | SAST + dependency | CodeQL | CodeQL + Dependabot | Policy + secrets + SAST + dependency |
| Max fix attempts | Ilimitado | N/A | N/A | N/A | Configuravel (0-10) |
| Escalation path | Humano interrompe | N/A | N/A | N/A | Tech lead notification |

### 2.6 Key Insights

1. **Nenhuma ferramenta cobre todos os 7 passos** do pipeline de PR com excelencia
2. **Devin lidera em autonomia** mas falta em merge gate, changelog e PR description estruturada
3. **Factory inova com review-bot e merge-after-review** mas peca em CI monitoring e auto-fix
4. **Copilot tem a melhor integracao com ecossistema** mas nao e autonomo
5. **GitHub Actions e a plataforma** que todas consomem, nao um competidor direto
6. **IDEIA pode combinar o melhor de cada abordagem**: autonomia Devin + review-bot Factory + integracao Copilot + infra GitHub Actions

---

## 3. IDEIA Current State

### 3.1 O Que Ja Existe

| Package | Capacidade | Status |
|---------|-----------|--------|
| `@ideia/delivery-orchestrator` | Canary deploy (10/50/100%), rollback, GitOps sync, webhooks CI/CD | Producao |
| `@ideia/agent-runtime` | 6 agent nodes (Analyst, Architect, Programmer, Reviewer, Tester, DevOps) | Producao |
| `@ideia/agent-runtime` | LangGraph integration com StateGraph, sub-grafos, paralelismo | Producao |
| `@ideia/mcp` | File system tools (read, write, search, run) para agentes | Producao |
| `@ideia/event-bus` | NATS JetStream pub/sub, KV, Object Store, DLQ | Producao |
| `@ideia/policy-engine` | 27 policy patterns, output validation, 31 regras PII | Producao |
| `@ideia/audit-trail` | SHA-256 chain, verifyChain() | Producao |
| `@ideia/risk-approval` | 3 niveis de aprovacao (dev, tech-lead, security) | Producao |
| `@ideia/quality-gates` | 4 quality gates (commit, PR, release, sprint) | Producao |
| `@ideia/cli` | 142 comandos, init/generate/audit/verify/drift/policy/compliance/docs | Producao |
| `@ideia/checkpoint-engine` | Checkpoints com rollback, continue de pontos falhos | Producao |
| `@ideia/ideia-plugin` | 10 widgets Theia, 10 servicos backend, 51 comandos VS Code | Producao |
| `@theia/scm` | Git integration basica no Theia | Producao (Theia) |
| `@theia/scm-extra` | Diff editor, Timeline view | Producao (Theia) |

### 3.2 O Que FALTA Para PR Automation Completo

| Gap | Descricao | Prioridade |
|-----|-----------|------------|
| PR Planner | Task decomposition, branch creation, commit strategy, PR description generation | Critico |
| CI Watcher | WebSocket listener for CI events, log collection, status correlation | Critico |
| Auto-Fix Loop | Error analysis, code fix, test fix, re-trigger CI, max attempts | Alto |
| Review Generator | PR review: summary, quality, security, performance, suggestions | Alto |
| Merge Gate | Approval flow, merge strategy, auto-merge, branch deletion, changelog | Alto |
| Test Runner Agent | Test generation, execution, coverage report, flaky detection | Alto |
| CI Integration Layer | GitHub Actions parser, Jenkins, GitLab CI, JUnit/TAP/xUnit parsers | Medio |
| Multi-Repo Support | Cross-repo dependencies, synchronized releases, workspace awareness | Medio |
| PR Description Generator | Template-based, structured sections, test evidence embedding | Medio |

### 3.3 Gap Analysis vs Concorrentes

| Dimensao | Devin | Factory | Copilot | IDEIA (atual) | Gap |
|----------|-------|---------|---------|---------------|-----|
| PR Planning | 8/10 | 6/10 | 4/10 | 0/10 | Critico |
| Code Implementation | 9/10 | 7/10 | 5/10 | 6/10 | Medio |
| Test Generation | 8/10 | 7/10 | 3/10 | 4/10 | Alto |
| CI Monitoring | 9/10 | 5/10 | 7/10 | 2/10 | Critico |
| Auto-Fix Loop | 9/10 | 3/10 | 2/10 | 0/10 | Critico |
| Review Generation | 5/10 | 8/10 | 7/10 | 3/10 | Alto |
| Merge Gate | 5/10 | 8/10 | 5/10 | 5/10 | Medio |
| **Media** | **7.6/10** | **6.3/10** | **4.7/10** | **2.9/10** | |

---

## 4. Architecture: IDEIA PR Pipeline

### 4.1 Visao Arquitetural

O PR Pipeline da IDEIA e implementado como uma sequencia de 7 agentes orquestrados pelo LangGraph, cada um com responsabilidade especifica. Agentes se comunicam via NATS JetStream pub/sub e compartilham estado via um PR State object que transita pelo grafo.

```
PR Pipeline Flow:

User Issue/Feature Request
         |
         v
[1. PR Planner] -> Branch + Commits + Description + Checklist
         |
         v
[2. Code Implementer] -> Implementation + Commits
         |
         v
[3. Test Runner] -> Tests + Coverage + Evidence
         |
         v
[4. PR Creator] -> GitHub PR (description + checklist + evidence)
         |
         v
[5. CI Watcher] -> Monitor CI execution
         |
         v
[6. Auto-Fix Loop] <- [CI Failed] -> Analyze -> Fix -> Re-trigger
         |                              |
         v                              v
[CI Passed]                     [Max Attempts] -> Escalate to Human
         |
         v
[7. Review Generator] -> PR Review (summary + quality + security + perf)
         |
         v
[8. Merge Gate] -> Approval -> Merge -> Branch Delete -> Changelog
```

### 4.2 Componentes

| Componente | Package | Descricao |
|------------|---------|-----------|
| PRPlanner | `@ideia/pr-pipeline` | Task decomposition, branch creation, commit strategy, description gen |
| CodeImplementer | `@ideia/pr-pipeline` | Programmer agent, multi-file changes, conventional commits |
| TestRunner | `@ideia/pr-pipeline` | Test generation, execution, coverage, flaky detection |
| PRCreator | `@ideia/pr-pipeline` | GitHub API interaction, PR creation with structured description |
| CIWatcher | `@ideia/pr-pipeline` | WebSocket listener, status correlation, log collection |
| AutoFixer | `@ideia/pr-pipeline` | Error analysis, code fix, test fix, re-trigger CI |
| ReviewGenerator | `@ideia/pr-pipeline` | PR review: summary, quality, security, performance, suggestions |
| MergeGate | `@ideia/pr-pipeline` | Approval flow, merge strategy, auto-merge, branch delete, changelog |

### 4.3 PR State Object

O estado do PR e carregado em cada no do grafo via LangGraph State:

```
PRState {
  id: string;                          // PR identifier
  issue: IssueRef;                     // Referencia a issue original
  repository: RepositoryRef;           // Repositorio alvo
  branch: BranchInfo;                  // Branch criada
  commits: Commit[];                   // Commits gerados
  implementation: FileChange[];        // Mudancas no codigo
  testResults: TestResults;            // Resultados de testes
  ciStatus: CIStatus;                  // Status da CI
  fixAttempts: number;                 // Tentativas de correcao
  maxFixAttempts: number;              // Maximo de tentativas
  review: ReviewResult;                // Review gerado
  approvals: Approval[];               // Aprovacoes recebidas
  mergeStrategy: MergeStrategy;        // Estrategia de merge
  createdAt: string;                   // Timestamp de criacao
  updatedAt: string;                   // Timestamp de atualizacao
}
```

### 4.4 Data Flow via NATS

```
Topics (NATS subjects):

pr.pipeline.planning.request     -> PRPlanner recebe request
pr.pipeline.planning.completed   -> PRPlanner completa planejamento
pr.pipeline.code.completed       -> CodeImplementer completa implementacao
pr.pipeline.test.completed       -> TestRunner completa testes
pr.pipeline.pr.created           -> PRCreator cria PR
pr.pipeline.ci.status            -> CIWatcher publica status
pr.pipeline.fix.required         -> AutoFixer precisa corrigir
pr.pipeline.fix.completed        -> AutoFixer completa correcao
pr.pipeline.review.ready         -> ReviewGenerator produziu review
pr.pipeline.merge.approved       -> MergeGate autorizou merge
pr.pipeline.merge.completed      -> Merge concluido
pr.pipeline.merge.failed         -> Merge falhou
```

### 4.5 Integration with Existing Systems

```
PR Pipeline
    |
    |--- uses ---> @ideia/agent-runtime (LangGraph orchestration)
    |--- uses ---> @ideia/event-bus (NATS JetStream messaging)
    |--- uses ---> @ideia/mcp (file system tools)
    |--- uses ---> @ideia/policy-engine (policy checks)
    |--- uses ---> @ideia/audit-trail (audit chain)
    |--- uses ---> @ideia/risk-approval (approval flow)
    |--- uses ---> @ideia/quality-gates (quality checks)
    |--- uses ---> @theia/scm (git operations)
    |--- uses ---> @ideia/checkpoint-engine (state persistence)
    |--- extends --> @ideia/delivery-orchestrator (deploy after merge)
```

---

## 5. Step 1: PR Planning

### 5.1 Responsabilidades

| Responsabilidade | Descricao |
|-----------------|-----------|
| Task Decomposition | Quebrar issue/feature request em tasks atomicas |
| Scope Definition | Definir escopo exato do PR (o que sera feito, o que NAO sera) |
| Branch Creation | Criar branch com nome convencional |
| Commit Strategy | Planejar commits (quantos, ordem, mensagens) |
| PR Description | Gerar descricao estruturada do PR |
| Checklist | Criar checklist de verificacao pre-merge |
| Dependency Analysis | Identificar dependencias entre arquivos modificados |
| Risk Assessment | Avaliar risco da mudanca (baixo, medio, alto) |

### 5.2 Branch Naming Convention

```
feature/IDEIA-{issueNumber}-{kebab-case-description}
fix/IDEIA-{issueNumber}-{kebab-case-description}
chore/IDEIA-{issueNumber}-{kebab-case-description}
refactor/IDEIA-{issueNumber}-{kebab-case-description}
docs/IDEIA-{issueNumber}-{kebab-case-description}
test/IDEIA-{issueNumber}-{kebab-case-description}
```

### 5.3 Commit Strategy

O PR Planner define a sequencia de commits:

```
1. feat(scope): implement core feature
2. test(scope): add tests for feature
3. fix(scope): address review feedback
4. chore(deps): update dependencies
```

Regras:
- Cada commit deve ser atomic (uma mudanca logica)
- Commits devem seguir conventional commits specification
- Commits de teste devem vir apos commits de implementacao
- Commits de fix devem referenciar o feedback que os motivou

### 5.4 PR Description Structure

```markdown
## Descricao

{paragrafo resumindo o que o PR faz e por que}

## Issue Relacionada

Closes #{issueNumber}

## Tipo de Mudanca

- [ ] Bugfix
- [x] Nova Feature
- [ ] Refatoracao
- [ ] Documentacao
- [ ] Chore (build, deps, CI)

## Checklist

- [x] Codigo segue os padroes do projeto
- [x] Testes foram adicionados/atualizados
- [x] Testes existentes passam
- [x] Lint e typecheck passam
- [x] Documentacao foi atualizada (se necessario)
- [x] Nenhum segredo/credential foi exposto
- [x] Breaking changes estao documentados

## Test Evidence

{link para relatorio de cobertura}

## Screenshots (se aplicavel)

## Notas de Deploy

{instrucoes especiais de deploy, se houver}
```

### 5.5 PR Planner Input/Output

```
Input:
  - Issue/Feature Request (texto, issue ID, linked issues)
  - Repository context (linguagem, framework, estrutura)
  - Project conventions (branch naming, commit style)
  - Autonomy level (N0-N4)

Output:
  - Branch name
  - Commit plan (array de commits com tipo, escopo, descricao)
  - PR description (markdown estruturado)
  - Checklist (array de items booleanos)
  - Scope definition (files to change, NOT to change)
  - Risk level (low, medium, high)
  - Estimated effort (horas)
```

---

## 6. Step 2: Code Implementation

### 6.1 Responsabilidades

| Responsabilidade | Descricao |
|-----------------|-----------|
| Scope Compliance | Implementar APENAS o escopo definido no planejamento |
| Code Generation | Criar/modificar arquivos conforme especificacao |
| Conventional Commits | Commitar com mensagens no padrao conventional commits |
| Multi-File Handling | Coordenar mudancas em multiplos arquivos |
| New File Creation | Criar arquivos novos quando necessario |
| Existing File Modification | Modificar arquivos existentes mantendo estilo |
| Import Management | Gerenciar imports, adicionar/remover conforme necessario |
| API Compatibility | Respeitar contratos de API existentes |

### 6.2 Code Implementer Flow

```
PR Plan (do PRPlanner)
    |
    v
[Read existing files in scope]
    |
    v
[Implement changes file by file]
    |--- For each file:
    |       |--- Read current content
    |       |--- Apply changes
    |       |--- Validate syntax (tsc --noEmit para TypeScript)
    |       |--- Commit with conventional message
    |
    v
[Handle dependencies between files]
    |
    v
[Final validation: tsc --noEmit, lint]
    |
    v
[Return FileChange[] + Commits[]]
```

### 6.3 Code Quality Rules

| Regra | Descricao | Enforcement |
|-------|-----------|-------------|
| No unrelated changes | Nao modificar arquivos fora do escopo | PR diff review |
| Follow existing patterns | Usar mesmos padroes do codigo vizinho | Lint + code review |
| No secrets | Nao hardcodar API keys, tokens, senhas | Pre-commit + output validation |
| No debug code | Nao deixar console.log, debugger, TODO sem issue | ESLint + code review |
| Type safety | Typescript strict mode quando aplicavel | tsc --noEmit |
| Error handling | Tratar erros, nao engolir excecoes | Code review |
| Documentation | JSDoc para APIs publicas, comentarios para logica complexa | Code review |

### 6.4 Implementation Example

Dado um PR Plan para "adicionar endpoint GET /users/:id":

```
Commits gerados:
1. feat(api): add GET /users/:id endpoint
2. test(api): add tests for GET /users/:id
3. docs(api): add JSDoc for UserController

Arquivos modificados:
- src/controllers/user.controller.ts (modified)
- src/routes/user.routes.ts (modified)
- src/services/user.service.ts (modified)
- src/tests/user.controller.test.ts (created)
- src/docs/api/users.md (created)
```

---

## 7. Step 3: Test Generation & Execution

### 7.1 Responsabilidades

| Responsabilidade | Descricao |
|-----------------|-----------|
| Test Generation | Criar testes unitarios e de integracao para novas mudancas |
| Existing Test Update | Atualizar testes existentes quebrados pelas mudancas |
| Test Execution | Executar suite completa de testes |
| Lint + Typecheck | Executar linter e typecheck |
| Coverage Report | Gerar relatorio de cobertura com diff coverage |
| Flaky Detection | Identificar testes flaky (inconsistentes) |
| Test Evidence | Empacotar resultados para anexar ao PR |

### 7.2 Test Generation Strategy

| Tipo de Teste | Quando Gerar | Framework |
|---------------|-------------|-----------|
| Unit tests | Nova funcao/metodo | Jest + ts-jest |
| Integration tests | Novo endpoint/API | Supertest + Jest |
| Component tests | Novo componente UI | React Testing Library |
| Contract tests | Nova interface/API | Pact |
| E2E tests | Nova feature critica | Playwright |
| Mutation tests | Codigo critico (opcional) | StrykerJS |

### 7.3 Test Execution Pipeline

```
[Test Generation]
    |
    v
[Execute lint: eslint --max-warnings 0]
    |
    v
[Execute typecheck: tsc --noEmit]
    |
    v
[Execute unit tests: jest --coverage]
    |
    v
[Execute integration tests: jest --config jest.integration.config.js]
    |
    v
[Parse results (JUnit format)]
    |
    v
[Calculate coverage: total + diff coverage]
    |
    v
[Identify flaky tests (ran 3x, inconsistent results)]
    |
    v
[Generate TestReport]
```

### 7.4 Coverage Gates

| Gate | Threshold | Acao |
|------|-----------|------|
| Total line coverage | >= 30% | Warning se abaixo |
| Diff line coverage | >= 80% | Bloqueia PR se abaixo (configuravel) |
| Branch coverage (critical paths) | >= 70% | Bloqueia PR se abaixo |
| New file coverage | >= 80% | Bloqueia PR se abaixo |
| Flaky test ratio | <= 5% | Warning se acima, bloqueia se > 10% |

### 7.5 Test Report Structure

```typescript
interface TestReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    duration: number; // ms
  };
  coverage: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
    diff: {
      lines: number;
      branches: number;
      functions: number;
      statements: number;
    };
  };
  lint: {
    errors: number;
    warnings: number;
    passed: boolean;
  };
  typecheck: {
    errors: number;
    passed: boolean;
  };
  flakyTests: Array<{
    name: string;
    file: string;
    results: Array<'passed' | 'failed'>;
  }>;
  artifacts: Array<{
    name: string;
    path: string;
    type: 'coverage' | 'logs' | 'screenshots' | 'video';
  }>;
  passed: boolean;
}
```

---

## 8. Step 4: CI Monitoring

### 8.1 Responsabilidades

| Responsabilidade | Descricao |
|-----------------|-----------|
| WebSocket Listener | Conectar ao WebSocket do CI provider para eventos em tempo real |
| Event Parsing | Parsear eventos de CI (job started, job completed, job failed) |
| Status Correlation | Correlacionar eventos de CI com PRs especificos |
| Log Collection | Coletar logs de execucao de CI |
| Artifact Collection | Baixar artifacts gerados pelo CI |
| Timeout Detection | Detectar CIs que excederam timeout configurado |
| Status Aggregation | Agregar status de multiplos jobs em um status unico do PR |

### 8.2 CI Event Types

```typescript
type CIEventType =
  | 'workflow.queued'
  | 'workflow.in_progress'
  | 'workflow.completed'
  | 'job.queued'
  | 'job.in_progress'
  | 'job.completed'
  | 'job.failed'
  | 'step.completed'
  | 'step.failed'
  | 'check_run.created'
  | 'check_run.completed'
  | 'check_suite.requested'
  | 'check_suite.completed'
  | 'timeout'; // IDEIA internal
```

### 8.3 CI Status Model

```typescript
enum CIRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
  SKIPPED = 'skipped',
}

interface CIRun {
  id: string;
  prId: string;
  repository: string;
  workflow: string;
  trigger: 'push' | 'pull_request' | 'workflow_dispatch' | 'schedule';
  status: CIRunStatus;
  jobs: CIJob[];
  logs: CILog[];
  artifacts: CIArtifact[];
  startedAt: string;
  completedAt?: string;
  duration: number;
  url: string;
}

interface CIJob {
  id: string;
  name: string;
  status: CIRunStatus;
  steps: CIStep[];
  logs: CILog[];
  startedAt: string;
  completedAt?: string;
  duration: number;
}
```

### 8.4 CI Providers Supported

| Provider | Metodo de Conexao | Features |
|----------|-------------------|----------|
| GitHub Actions | WebSocket via GitHub Checks API + polling fallback | Eventos em tempo real, logs, artifacts |
| GitLab CI | WebSocket CI tunnel + API polling | Pipeline events, job logs |
| Jenkins | WebSocket plugin + Remote Access API | Build events, console output |
| Custom | Generic webhook receiver | JSON payload, configurable parsing |

### 8.5 WebSocket Implementation

```
CIWatcher
    |
    |--- [connect] ---> CI Provider WebSocket
    |       |--- on('message') -> parse CIEvent
    |       |--- on('error') -> reconnect with backoff
    |       |--- on('close') -> reconnect with backoff
    |
    |--- [correlate] ---> Match CIEvent to PR
    |       |--- Extract PR number from branch/commit/check_run
    |       |--- Return PR ID or throw UncorrelatedEvent
    |
    |--- [collect] ---> Fetch logs and artifacts
    |       |--- GET {provider}/repos/{owner}/{repo}/actions/runs/{id}/logs
    |       |--- Download artifacts ZIP
    |
    |--- [publish] ---> NATS: pr.pipeline.ci.status
    |       |--- { prId, status, jobs, logs, artifacts }
```

---

## 9. Step 5: Auto-Fix Loop

### 9.1 Responsabilidades

| Responsabilidade | Descricao |
|-----------------|-----------|
| Error Log Analysis | Parsear logs de CI para identificar causa raiz da falha |
| Root Cause Classification | Classificar erro (compilacao, teste, lint, timeout, infra) |
| Code Fix | Corrigir codigo fonte baseado na analise de erro |
| Test Fix | Corrigir testes quebrados (assertions, fixtures, mocks) |
| PR Update | Commitar correcao e atualizar PR |
| CI Re-trigger | Re-triggerar CI apos correcao |
| Max Attempts | Controlar numero maximo de tentativas |
| Escalation | Escalar para humano apos exceder max attempts |

### 9.2 Error Classification

| Tipo de Erro | Descricao | Agao de Fix |
|-------------|-----------|-------------|
| Compilation Error | TypeScript/Java/etc nao compila | Corrigir sintaxe, tipos, imports |
| Lint Error | ESLint/style violation | Auto-fix com eslint --fix |
| Test Assertion | Teste falhou por assert incorreto | Corrigir assertion, fixture, ou implementacao |
| Test Timeout | Teste excedeu timeout | Otimizar teste, aumentar timeout |
| Coverage Drop | Cobertura abaixo do threshold | Adicionar testes |
| Flaky Test | Teste inconsistente | Marcar como flaky, isolar, corrigir race condition |
| Build Error | Erro de build (webpack, esbuild, etc) | Corrigir configuracao de build |
| Dependency Error | Erro de resolucao de dependencia | Atualizar/adicionar dependencia |
| Infrastructure Error | Runner crash, network timeout | Retry com backoff |
| Security Scan | Vulnerabilidade detectada | Atualizar dependencia, corrigir codigo |

### 9.3 Fix Loop Flow

```
[CI Failed]
    |
    v
[Parse CI logs]
    |--- Extract error messages, stack traces, line numbers
    |--- Classify error type
    |
    v
[Analyze root cause]
    |--- Read affected files
    |--- Correlate error with recent changes
    |--- Determine fix strategy
    |
    v
[Apply fix]
    |--- Fix code OR fix tests OR fix both
    |--- Execute fix validation (lint + typecheck + test)
    |
    v
{fix validated?}
    |--- YES --> Commit fix + Update PR
    |--- NO  --> Re-analyze with more context
    |
    v
[Re-trigger CI]
    |--- Increment fixAttempts
    |--- Publish NATS event: pr.pipeline.fix.completed
    |
    v
[CI re-run]
    |--- Passed? --> Proceed to Review Generation
    |--- Failed? --> Check fixAttempts vs maxFixAttempts
    |       |--- < maxAttempts --> Loop back to [Parse CI logs]
    |       |--- >= maxAttempts --> [Escalate to Human]
```

### 9.4 Max Attempts Configuration

```typescript
interface FixLoopConfig {
  maxAttempts: number;         // Default: 3
  maxAttemptsByType: {
    compilation: number;        // 5
    test: number;               // 3
    lint: number;              // 2 (auto-fix sempre na primeira)
    coverage: number;          // 2
    dependency: number;        // 3
    infrastructure: number;    // 5 (retry com backoff)
    flaky: number;             // 1 (marcar como flaky, nao tentar corrigir)
  };
  escalation: {
    channel: 'slack' | 'email' | 'github_comment';
    notifyRoles: string[];     // ['tech-lead', 'author']
    includeContext: boolean;   // Incluir logs e diff no notification
  };
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  backoffDelay: number;       // ms, default: 30000
}
```

### 9.5 Escalation Message

Quando o Auto-Fix Loop excede maxAttempts, uma mensagem de escalacao e enviada:

```
PR #{prNumber} — Auto-Fix Exceeded Max Attempts

Issue: {issueTitle}
Branch: {branchName}
Failed after: {fixAttempts} attempt(s)

Last error: {errorSummary}

Fix attempts:
1. {attempt1.description} - {attempt1.result}
2. {attempt2.description} - {attempt2.result}
3. {attempt3.description} - {attempt3.result}

Action required: Manual intervention needed.
Links:
- PR: {prUrl}
- CI Run: {ciRunUrl}
- Logs: {logUrl}
```

---

## 10. Step 6: Review Generation

### 10.1 Responsabilidades

| Responsabilidade | Descricao |
|-----------------|-----------|
| Diff Analysis | Analisar diff completo do PR |
| Code Quality Assessment | Avaliar qualidade do codigo (complexidade, duplicacao, naming) |
| Security Implications | Identificar potenciais vulnerabilidades |
| Test Coverage Assessment | Verificar cobertura de testes para novas mudancas |
| Performance Impact | Avaliar impacto de performance da mudanca |
| Suggestions | Propor melhorias especificas com exemplos de codigo |
| Summary Generation | Resumo executivo do PR para o reviewer humano |

### 10.2 Review Sections

```
## Review Summary
{paragrafo resumindo a revisao, qualidade geral, aprovacao recomendada}

## Code Quality: {A/B/C/D/F}
{analise de qualidade do codigo com exemplos}

## Security: {PASS/FLAG/BLOCK}
{analise de seguranca, vulnerabilities encontradas}

## Test Coverage: {GREEN/YELLOW/RED}
{analise de cobertura, testes faltantes}

## Performance: {LOW/MEDIUM/HIGH impact}
{analise de impacto de performance}

## Suggestions
1. {suggestion with code example}
2. {suggestion with code example}
3. {suggestion with code example}

## Decision: {APPROVE/REQUEST_CHANGES/BLOCK}
```

### 10.3 Code Quality Scoring

| Dimensao | Pontos | Descricao |
|----------|--------|-----------|
| Naming | 0-10 | Variaveis, funcoes, classes seguem convencoes? |
| Complexity | 0-10 | Cyclomatic complexity, funcoes muito longas? |
| Duplication | 0-10 | Codigo duplicado vs DRY? |
| Error Handling | 0-10 | Erros sao tratados adequadamente? |
| Type Safety | 0-10 | Typescript types sao usados corretamente? |
| Testing | 0-10 | Testes cobrem casos de borda? |
| Documentation | 0-10 | JSDoc, comentarios para logica complexa? |
| **Total** | **0-70** | A >= 56, B >= 42, C >= 28, D >= 14, F < 14 |

### 10.4 Security Analysis

```typescript
interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: 'injection' | 'xss' | 'csrf' | 'auth' | 'data_exposure' | 'dependency' | 'secret' | 'other';
  file: string;
  line: number;
  description: string;
  recommendation: string;
  cwe?: string;  // CWE identifier
}

interface SecurityAssessment {
  passed: boolean;
  blocked: boolean;  // Se true, bloqueia merge
  findings: SecurityFinding[];
  summary: string;
}
```

### 10.5 Review Output Format

```typescript
interface PRReview {
  summary: string;
  quality: {
    score: number;       // 0-70
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    dimensions: {
      naming: number;
      complexity: number;
      duplication: number;
      errorHandling: number;
      typeSafety: number;
      testing: number;
      documentation: number;
    };
  };
  security: SecurityAssessment;
  coverage: {
    status: 'green' | 'yellow' | 'red';
    totalCoverage: number;
    diffCoverage: number;
    missingTests: string[];
  };
  performance: {
    impact: 'low' | 'medium' | 'high';
    details: string;
    suggestions: string[];
  };
  suggestions: Array<{
    priority: 'high' | 'medium' | 'low';
    file?: string;
    line?: number;
    description: string;
    example?: string;  // Codigo sugerido
  }>;
  decision: 'approve' | 'changes_requested' | 'blocked';
  generatedAt: string;
}
```

---

## 11. Step 7: Merge Gate

### 11.1 Responsabilidades

| Responsabilidade | Descricao |
|-----------------|-----------|
| Human Approval | Aguardar aprovacao humana (configuravel: obrigatoria ou opcional) |
| Gate Verification | Verificar todos os quality gates antes do merge |
| Merge Strategy | Executar merge com estrategia configurada (squash, rebase, merge) |
| Branch Deletion | Deletar branch apos merge bem-sucedido |
| Changelog Update | Atualizar changelog automaticamente |
| Release Notes | Gerar release notes para o merge |
| Post-Merge Actions | Disparar deploy, notificar, atualizar issues |

### 11.2 Approval Levels

| Nivel | Descricao | Configuracao |
|-------|-----------|-------------|
| N0 | Auto-merge sem aprovacao humana | Apenas para PRs triviais (typo, docs) |
| N1 | Aprovacao do autor do PR | Para mudancas simples com testes |
| N2 | Aprovacao de tech lead | Para mudancas moderadas |
| N3 | Aprovacao de security officer | Para mudancas que afetam seguranca/dados |
| N4 | Aprovacao multipla (2+ reviewers) | Para mudancas criticas |

### 11.3 Merge Strategies

```typescript
type MergeStrategy = 'squash' | 'rebase' | 'merge_commit';

interface MergeConfig {
  strategy: MergeStrategy;
  squashMessage?: string;       // Custom squash commit message
  rebaseOptions?: {
    autosquash: boolean;        // Auto-squash fixup commits
    committerDate: 'author' | 'committer';
  };
  deleteBranchAfterMerge: boolean;  // Default: true
  updateChangelog: boolean;         // Default: true
  changelogPath?: string;           // Default: CHANGELOG.md
  createRelease: boolean;           // Criar GitHub Release
  releaseNameTemplate?: string;     // Default: v{version}
}
```

### 11.4 Pre-Merge Gate Verification

```
[Human Approval Received]
    |
    v
[Gate 1: Code Quality]
    |--- Review decision is 'approve'
    |--- Quality score >= C (configuravel)
    |
    v
[Gate 2: Security]
    |--- No critical/high security findings (configuravel)
    |--- Secret scan passed
    |
    v
[Gate 3: Tests]
    |--- All tests passed
    |--- Coverage >= threshold
    |--- Lint + typecheck passed
    |
    v
[Gate 4: Policy]
    |--- Branch protection rules satisfied
    |--- Policy engine approved
    |
    v
{All gates passed?}
    |--- YES --> Execute merge
    |--- NO  --> Block merge, report which gate(s) failed
```

### 11.5 Post-Merge Actions

```typescript
interface PostMergeActions {
  deleteBranch: boolean;
  updateChangelog: boolean;
  createRelease: boolean;
  closeIssues: string[];         // Issues to close (linked in PR)
  notifyChannels: string[];     // Slack, email, webhook
  triggerDeploy: boolean;       // Disparar deploy apos merge
  deployEnvironment?: string;   // staging, production
  updateProjectBoard: boolean;  // Mover card no project board
}
```

---

## 12. CI Integration

### 12.1 Architecture

A camada de integracao CI oferece uma interface unificada para diferentes provedores de CI:

```
┌─────────────────────────────────────────────────────────────┐
│                    CI Integration Layer                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   CIProvider (interface)               │   │
│  │  + connect(): WebSocket                               │   │
│  │  + disconnect(): void                                │   │
│  │  + getStatus(runId): CIRun                           │   │
│  │  + getLogs(runId): CILog[]                           │   │
│  │  + getArtifacts(runId): CIArtifact[]                 │   │
│  │  + reTrigger(runId): void                            │   │
│  │  + parseEvent(payload): CIEvent                      │   │
│  └──────────────────────────────────────────────────────┘   │
│         ▲              ▲              ▲                      │
│         │              │              │                      │
│  ┌──────┴──────┐ ┌────┴──────┐ ┌─────┴─────┐                │
│  │GitHubActions│ │ GitLabCI  │ │  Jenkins  │  ...           │
│  │  Provider   │ │ Provider  │ │  Provider │                │
│  └─────────────┘ └───────────┘ └───────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### 12.2 CIProvider Interface

```typescript
interface CIProvider {
  readonly name: string;
  readonly type: 'github_actions' | 'gitlab_ci' | 'jenkins' | 'custom';

  connect(config: CIProviderConfig): Promise<void>;
  disconnect(): Promise<void>;

  getStatus(runId: string): Promise<CIRun>;
  getJobs(runId: string): Promise<CIJob[]>;
  getLogs(runId: string, jobId?: string): Promise<CILog[]>;
  getArtifacts(runId: string): Promise<CIArtifact[]>;
  downloadArtifact(artifactId: string, destPath: string): Promise<string>;

  reTrigger(runId: string): Promise<CIRun>;
  cancelRun(runId: string): Promise<void>;

  parseEvent(rawPayload: unknown): CIEvent;

  onEvent(handler: (event: CIEvent) => void): void;
  removeAllListeners(): void;
}
```

### 12.3 GitHub Actions Provider

```typescript
class GitHubActionsProvider implements CIProvider {
  private octokit: Octokit;
  private webSocket?: WebSocket;

  constructor(config: GitHubActionsConfig) {
    this.octokit = new Octokit({ auth: config.token });
  }

  async connect(): Promise<void> {
    // Connect to GitHub Checks API via WebSocket
    // Fallback to polling if WebSocket unavailable
  }

  async getStatus(runId: string): Promise<CIRun> {
    const { data } = await this.octokit.actions.getWorkflowRun({
      owner: this.config.owner,
      repo: this.config.repo,
      run_id: parseInt(runId),
    });
    return this.mapWorkflowRun(data);
  }

  async getLogs(runId: string, jobId?: string): Promise<CILog[]> {
    if (jobId) {
      const { data } = await this.octokit.actions.downloadJobLogsForWorkflowRun({
        owner: this.config.owner,
        repo: this.config.repo,
        job_id: parseInt(jobId),
      });
      return this.parseLogStream(data);
    }
    const { data } = await this.octokit.actions.downloadWorkflowRunLogs({
      owner: this.config.owner,
      repo: this.config.repo,
      run_id: parseInt(runId),
    });
    return this.parseLogStream(data);
  }

  async reTrigger(runId: string): Promise<CIRun> {
    await this.octokit.actions.reRunWorkflow({
      owner: this.config.owner,
      repo: this.config.repo,
      run_id: parseInt(runId),
    });
    return this.getStatus(runId);
  }

  parseEvent(rawPayload: unknown): CIEvent {
    const event = rawPayload as GitHubWebhookEvent;
    return {
      type: this.mapEventType(event.action, event.workflow_run.status),
      runId: String(event.workflow_run.id),
      status: this.mapStatus(event.workflow_run.conclusion ?? event.workflow_run.status),
      prIds: this.extractPRIds(event),
      repository: `${event.repository.full_name}`,
      url: event.workflow_run.html_url,
      timestamp: new Date().toISOString(),
    };
  }
}
```

### 12.4 Test Result Parsers

| Formato | Parser | Features |
|---------|--------|----------|
| JUnit XML | `parseJUnit(xml: string): TestReport` | Suites, test cases, failures, errors, time |
| TAP | `parseTAP(tap: string): TestReport` | Plan, ok/not ok, YAML diagnostics |
| xUnit | `parseXUnit(xml: string): TestReport` | Assemblies, classes, tests |
| Mocha JSON | `parseMochaJSON(json: string): TestReport` | Pass/fail/pending, duration |
| Custom | `parseCustom(regex: RegExp, text: string): TestReport` | Regex-based extraction |

### 12.5 Webhook Receiver

Para integracoes customizadas, a IDEIA expoe um webhook receiver:

```
POST /api/v1/ci/webhook
Content-Type: application/json

{
  "provider": "custom",
  "event": "workflow.completed",
  "payload": {
    "run_id": "12345",
    "status": "failed",
    "jobs": [...],
    "logs_url": "https://ci.example.com/runs/12345/logs"
  }
}
```

O webhook receiver:
1. Valida o payload contra schema Zod
2. Parseia o evento via CIProvider.parseEvent()
3. Correlaciona com PR via branch/commit
4. Publica evento no NATS: pr.pipeline.ci.status
5. Retorna 200 OK ou 422 Unprocessable

---

## 13. Multi-Repository Support

### 13.1 Monorepo vs Multi-Repo

| Aspecto | Monorepo | Multi-Repo |
|---------|----------|------------|
| Pipeline Scope | Single PR para todo o monorepo | Multiplos PRs sincronizados |
| Branch Strategy | Branch por feature no mesmo repo | Branch por repo com cross-refs |
| CI Strategy | CI unificado + CI por package | CI por repositorio |
| Versioning | Single version para todo o monorepo | Versoes independentes |
| Dependencies | Intra-repo via workspaces | Cross-repo via package registry |
| PR Dependencies | PR depends on other PRs (stacked) | PRs sincronizados via labels/tags |
| Test Strategy | Testes do workspace afetado | Testes do repositorio |

### 13.2 Monorepo Handler

Para monorepos (como o proprio IDEIA):

```typescript
interface MonorepoConfig {
  rootPackageManager: 'npm' | 'pnpm' | 'yarn';
  workspaceConfig: string;        // pnpm-workspace.yaml, lerna.json
  affectedPackages: string[];     // Packages afetados pelo PR
  scopeTests: boolean;            // Executar apenas testes dos packages afetados
  scopeBuild: boolean;            // Build apenas dos packages afetados
}

class MonorepoHandler {
  async detectAffectedPackages(changes: FileChange[]): Promise<string[]> {
    // Para cada arquivo modificado, identificar a que package pertence
    // Usar workspace config para mapear paths -> package names
  }

  async buildScopeCommand(affected: string[]): Promise<string> {
    // Gerar comando: pnpm --filter @scope/pkg1 --filter @scope/pkg2 build
  }

  async testScopeCommand(affected: string[]): Promise<string> {
    // Gerar comando: pnpm --filter @scope/pkg1 --filter @scope/pkg2 test
  }
}
```

### 13.3 Cross-Repo Dependencies

Quando um PR depende de mudancas em outro repositorio:

```typescript
interface CrossRepoDependency {
  prId: string;              // PR atual
  dependsOn: Array<{
    repository: string;      // "owner/repo"
    prNumber: number;        // PR do qual depende
    status: 'open' | 'merged' | 'closed';
    required: boolean;       // Se true, bloqueia merge ate que PR dependente seja mergeado
  }>;
}

class CrossRepoManager {
  async resolveDependencies(pr: PRState): Promise<CrossRepoDependency> {
    // Ler dependencias de PRs de outros repos
    // Usar GitHub API para verificar status
    // Retornar grafo de dependencias
  }

  async waitForDependencies(dep: CrossRepoDependency): Promise<void> {
    // Aguardar ate que todos os PRs dependentes sejam mergeados
    // Polling com backoff ou WebSocket
  }
}
```

### 13.4 Synchronized Releases

Para mudancas que afetam multiplos repositorios:

```typescript
interface SynchronizedRelease {
  releaseId: string;
  prs: Array<{
    repository: string;
    prNumber: number;
    status: 'pending' | 'approved' | 'merged';
  }>;
  status: 'planning' | 'in_progress' | 'completed' | 'rolled_back';
  createdAt: string;
  mergedAt?: string;
}
```

---

## 14. Code Examples

### 14.1 PRPlanner

```typescript
// packages/pr-pipeline/src/pr-planner.ts
import { z } from 'zod';

const IssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['feature', 'bugfix', 'refactor', 'chore', 'docs']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  labels: z.array(z.string()).optional(),
});

type Issue = z.infer<typeof IssueSchema>;

interface PRPlan {
  branchName: string;
  commits: CommitPlan[];
  description: string;
  checklist: ChecklistItem[];
  scope: PRScope;
  risk: 'low' | 'medium' | 'high';
  estimatedEffort: number;
}

interface CommitPlan {
  type: string;
  scope: string;
  description: string;
  files: string[];
}

interface ChecklistItem {
  label: string;
  required: boolean;
  applicable: boolean;
}

interface PRScope {
  filesToChange: string[];
  filesNotToChange: string[];
  description: string;
}

export class PRPlanner {
  private readonly branchPrefixes: Record<string, string> = {
    feature: 'feature',
    bugfix: 'fix',
    refactor: 'refactor',
    chore: 'chore',
    docs: 'docs',
  };

  async plan(issue: Issue): Promise<PRPlan> {
    const branchName = this.createBranchName(issue);
    const commits = await this.createCommitPlan(issue);
    const description = await this.generateDescription(issue);
    const checklist = this.createChecklist(issue);
    const scope = await this.defineScope(issue);
    const risk = this.assessRisk(issue);
    const effort = this.estimateEffort(scope);

    return {
      branchName,
      commits,
      description,
      checklist,
      scope,
      risk,
      estimatedEffort: effort,
    };
  }

  private createBranchName(issue: Issue): string {
    const prefix = this.branchPrefixes[issue.type] || 'feature';
    const kebabDesc = issue.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${prefix}/IDEIA-${issue.id}-${kebabDesc}`;
  }

  private async createCommitPlan(issue: Issue): Promise<CommitPlan[]> {
    const scope = this.inferScope(issue);
    const commits: CommitPlan[] = [];

    commits.push({
      type: issue.type === 'bugfix' ? 'fix' : 'feat',
      scope,
      description: issue.title.toLowerCase(),
      files: [],
    });

    commits.push({
      type: 'test',
      scope,
      description: `add tests for ${issue.title.toLowerCase()}`,
      files: [],
    });

    if (issue.labels?.includes('documentation')) {
      commits.push({
        type: 'docs',
        scope,
        description: `document ${issue.title.toLowerCase()}`,
        files: [],
      });
    }

    return commits;
  }

  private inferScope(issue: Issue): string {
    const labels = issue.labels ?? [];
    if (labels.includes('api')) return 'api';
    if (labels.includes('cli')) return 'cli';
    if (labels.includes('ui')) return 'ui';
    if (labels.includes('core')) return 'core';
    return 'general';
  }

  private async generateDescription(issue: Issue): Promise<string> {
    const sections: string[] = [];

    sections.push(`## Description\n\n${issue.description}`);

    sections.push('## Related Issue\n\nCloses #' + issue.id);

    sections.push('## Type of Change\n\n' +
      (issue.type === 'feature' ? '- [x] New Feature\n' : '') +
      (issue.type === 'bugfix' ? '- [x] Bugfix\n' : '') +
      (issue.type === 'refactor' ? '- [x] Refactoring\n' : '') +
      (issue.type === 'chore' ? '- [x] Chore\n' : '') +
      (issue.type === 'docs' ? '- [x] Documentation\n' : ''));

    return sections.join('\n\n');
  }

  private createChecklist(issue: Issue): ChecklistItem[] {
    return [
      { label: 'Code follows project standards', required: true, applicable: true },
      { label: 'Tests added/updated', required: true, applicable: true },
      { label: 'Existing tests pass', required: true, applicable: true },
      { label: 'Lint and typecheck pass', required: true, applicable: true },
      { label: 'Documentation updated', required: false, applicable: issue.type !== 'bugfix' },
      { label: 'No secrets exposed', required: true, applicable: true },
    ];
  }

  private async defineScope(issue: Issue): Promise<PRScope> {
    // Em producao, usaria IA para inferir escopo baseado na issue
    return {
      filesToChange: [],
      filesNotToChange: [],
      description: `Changes related to: ${issue.title}`,
    };
  }

  private assessRisk(issue: Issue): 'low' | 'medium' | 'high' {
    if (issue.priority === 'critical') return 'high';
    if (issue.labels?.includes('breaking')) return 'high';
    if (issue.labels?.includes('core') || issue.labels?.includes('security')) return 'medium';
    return 'low';
  }

  private estimateEffort(scope: PRScope): number {
    return Math.max(1, Math.ceil(scope.filesToChange.length / 3));
  }
}
```

### 14.2 CodeImplementer

```typescript
// packages/pr-pipeline/src/code-implementer.ts
import { MCPRegistry } from '@ideia/mcp';

interface ImplementationPlan {
  plan: PRPlan;
  changes: FileChange[];
}

interface FileChange {
  path: string;
  operation: 'create' | 'modify' | 'delete';
  originalContent?: string;
  newContent: string;
}

export class CodeImplementer {
  constructor(private mcp: MCPRegistry) {}

  async implement(plan: PRPlan): Promise<ImplementationPlan> {
    const changes: FileChange[] = [];

    for (const commit of plan.commits) {
      const commitChanges = await this.implementCommit(commit);
      changes.push(...commitChanges);

      await this.commitChanges(commit, commitChanges);

      await this.validateChanges(commitChanges);
    }

    return { plan, changes };
  }

  private async implementCommit(commit: CommitPlan): Promise<FileChange[]> {
    // Em producao, usaria Programmer Agent do LangGraph
    // para gerar o codigo baseado na descricao do commit
    return [];
  }

  private async commitChanges(
    commit: CommitPlan,
    _changes: FileChange[]
  ): Promise<void> {
    const message = this.buildCommitMessage(commit);
    await this.mcp.execute('git', ['add', '-A']);
    await this.mcp.execute('git', ['commit', '-m', message]);
  }

  private buildCommitMessage(commit: CommitPlan): string {
    let msg = `${commit.type}(${commit.scope}): ${commit.description}`;
    if (commit.type === 'fix') {
      msg += '\n\nAddress review feedback';
    }
    return msg;
  }

  private async validateChanges(_changes: FileChange[]): Promise<void> {
    await this.mcp.execute('npx', ['tsc', '--noEmit']);
    await this.mcp.execute('npx', ['eslint', '.', '--max-warnings', '0']);
  }
}
```

### 14.3 TestRunner

```typescript
// packages/pr-pipeline/src/test-runner.ts

interface TestRunnerConfig {
  testCommand: string;
  coverageCommand: string;
  lintCommand: string;
  typecheckCommand: string;
  testReportFormat: 'junit' | 'tap' | 'json';
  coverageThreshold: number;
}

export class TestRunner {
  constructor(
    private config: TestRunnerConfig,
    private mcp: MCPRegistry
  ) {}

  async run(plan: PRPlan, changes: FileChange[]): Promise<TestReport> {
    const testSuite = await this.generateTests(plan, changes);

    if (testSuite.newTests.length > 0) {
      for (const test of testSuite.newTests) {
        await this.mcp.execute('write-file', [test.path, test.content]);
      }
      // Commit new tests
      await this.mcp.execute('git', ['add', '-A']);
      await this.mcp.execute('git', ['commit', '-m', 'test: add tests']);
    }

    const lintResult = await this.runLint();
    const typeResult = await this.runTypecheck();
    const testResult = await this.runTests();
    const coverageResult = await this.runCoverage();

    const report = this.buildReport(lintResult, typeResult, testResult, coverageResult);

    const flakyTests = await this.detectFlakyTests(report);

    return {
      ...report,
      flakyTests,
      passed: report.summary.failed === 0
        && lintResult.passed
        && typeResult.passed
        && coverageResult.lines >= this.config.coverageThreshold
        && flakyTests.length <= Math.ceil(report.summary.total * 0.05),
    };
  }

  private async generateTests(
    plan: PRPlan,
    changes: FileChange[]
  ): Promise<{ newTests: Array<{ path: string; content: string }> }> {
    // Identificar arquivos que precisam de testes
    const implementationFiles = changes
      .filter(c => c.operation === 'create' || c.operation === 'modify')
      .filter(c => !c.path.includes('__tests__') && !c.path.includes('.test.'));

    // Em producao, usaria Tester Agent para gerar testes
    return { newTests: [] };
  }

  private async runLint(): Promise<{ passed: boolean; errors: number; warnings: number }> {
    const result = await this.mcp.execute(this.config.lintCommand.split(' '));
    return {
      passed: result.exitCode === 0,
      errors: 0,
      warnings: 0,
    };
  }

  private async runTypecheck(): Promise<{ passed: boolean; errors: number }> {
    const result = await this.mcp.execute(this.config.typecheckCommand.split(' '));
    return {
      passed: result.exitCode === 0,
      errors: result.exitCode !== 0 ? 1 : 0,
    };
  }

  private async runTests(): Promise<{
    total: number; passed: number; failed: number; skipped: number;
  }> {
    const result = await this.mcp.execute(this.config.testCommand.split(' '));
    // Parse test output to extract metrics
    return {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };
  }

  private async runCoverage(): Promise<{
    lines: number; branches: number; functions: number; statements: number;
  }> {
    const result = await this.mcp.execute(this.config.coverageCommand.split(' '));
    // Parse coverage output (lcov, json-summary, etc)
    return { lines: 0, branches: 0, functions: 0, statements: 0 };
  }

  private async detectFlakyTests(report: TestReport): Promise<
    Array<{ name: string; file: string; results: Array<'passed' | 'failed'> }>
  > {
    // Executar testes 3x e comparar resultados
    // Testes com resultados inconsistentes sao flaky
    return [];
  }

  private buildReport(
    lint: { passed: boolean; errors: number; warnings: number },
    typecheck: { passed: boolean; errors: number },
    test: { total: number; passed: number; failed: number; skipped: number },
    coverage: { lines: number; branches: number; functions: number; statements: number }
  ): TestReport {
    return {
      summary: {
        total: test.total,
        passed: test.passed,
        failed: test.failed,
        skipped: test.skipped,
        flaky: 0,
        duration: 0,
      },
      coverage: {
        lines: coverage.lines,
        branches: coverage.branches,
        functions: coverage.functions,
        statements: coverage.statements,
        diff: { lines: 0, branches: 0, functions: 0, statements: 0 },
      },
      lint: { errors: lint.errors, warnings: lint.warnings, passed: lint.passed },
      typecheck: { errors: typecheck.errors, passed: typecheck.passed },
      flakyTests: [],
      artifacts: [],
      passed: false,
    };
  }
}
```

### 14.4 CIWatcher

```typescript
// packages/pr-pipeline/src/ci-watcher.ts
import { EventBus } from '@ideia/event-bus';

interface CIWatcherConfig {
  provider: CIProvider;
  eventBus: EventBus;
  pollInterval?: number;  // ms, fallback quando WebSocket nao disponivel
  timeout?: number;       // ms, timeout para CI run
  reconnectDelay?: number; // ms, delay entre reconexoes
}

export class CIWatcher {
  private provider: CIProvider;
  private eventBus: EventBus;
  private pollInterval: number;
  private timeout: number;
  private reconnectDelay: number;
  private watches: Map<string, WatchEntry> = new Map();
  private connected = false;

  constructor(config: CIWatcherConfig) {
    this.provider = config.provider;
    this.eventBus = config.eventBus;
    this.pollInterval = config.pollInterval ?? 30000;
    this.timeout = config.timeout ?? 3600000;
    this.reconnectDelay = config.reconnectDelay ?? 5000;
  }

  async connect(): Promise<void> {
    try {
      await this.provider.connect();
      this.connected = true;

      this.provider.onEvent((event) => {
        this.handleCIEvent(event);
      });
    } catch (error) {
      console.error('[CIWatcher] WebSocket connection failed, falling back to polling');
      this.connected = false;
    }
  }

  async disconnect(): Promise<void> {
    this.provider.removeAllListeners();
    await this.provider.disconnect();
    this.connected = false;
    this.watches.clear();
  }

  async watchRun(runId: string, prId: string): Promise<void> {
    this.watches.set(runId, {
      prId,
      status: CIRunStatus.PENDING,
      attempts: 0,
      startedAt: new Date().toISOString(),
    });

    if (!this.connected) {
      this.startPolling(runId, prId);
    }

    this.startTimeout(runId, prId);
  }

  private async handleCIEvent(event: CIEvent): Promise<void> {
    const watch = this.watches.get(event.runId);
    if (!watch) return;

    watch.status = event.status;
    watch.lastEventAt = event.timestamp;

    const [owner, repo] = event.repository.split('/');

    let logs: CILog[] = [];
    let artifacts: CIArtifact[] = [];

    if (event.status === CIRunStatus.FAILED || event.status === CIRunStatus.PASSED) {
      logs = await this.provider.getLogs(event.runId);
      artifacts = await this.provider.getArtifacts(event.runId);
    }

    await this.eventBus.publish('pr.pipeline.ci.status', {
      prId: watch.prId,
      runId: event.runId,
      status: event.status,
      url: event.url,
      logs,
      artifacts,
      timestamp: event.timestamp,
    });

    if (event.status === CIRunStatus.PASSED) {
      this.watches.delete(event.runId);
    }
  }

  private async startPolling(runId: string, prId: string): Promise<void> {
    const poll = async () => {
      const watch = this.watches.get(runId);
      if (!watch) return;

      try {
        const status = await this.provider.getStatus(runId);
        if (status.status !== CIRunStatus.PENDING && status.status !== CIRunStatus.RUNNING) {
          const event: CIEvent = {
            type: `workflow.${status.status}`,
            runId,
            status: status.status,
            prIds: [prId],
            repository: '',
            url: status.url,
            timestamp: new Date().toISOString(),
          };
          await this.handleCIEvent(event);
          return;
        }
      } catch {
        // Ignore polling errors
      }

      setTimeout(poll, this.pollInterval);
    };

    setTimeout(poll, this.pollInterval);
  }

  private startTimeout(runId: string, prId: string): void {
    setTimeout(async () => {
      const watch = this.watches.get(runId);
      if (!watch) return;

      if (watch.status === CIRunStatus.PENDING || watch.status === CIRunStatus.RUNNING) {
        await this.eventBus.publish('pr.pipeline.ci.status', {
          prId,
          runId,
          status: CIRunStatus.TIMEOUT,
          url: '',
          logs: [],
          artifacts: [],
          timestamp: new Date().toISOString(),
        });
        this.watches.delete(runId);
      }
    }, this.timeout);
  }
}

interface WatchEntry {
  prId: string;
  status: CIRunStatus;
  attempts: number;
  startedAt: string;
  lastEventAt?: string;
}
```

### 14.5 AutoFixer

```typescript
// packages/pr-pipeline/src/auto-fixer.ts

interface FixLoopConfig {
  maxAttempts: number;
  maxAttemptsByType: Record<string, number>;
  escalation: {
    channel: string;
    notifyRoles: string[];
    includeContext: boolean;
  };
}

export class AutoFixer {
  private config: FixLoopConfig;
  private attempts: Map<string, number> = new Map();

  constructor(config: Partial<FixLoopConfig>) {
    this.config = {
      maxAttempts: 3,
      maxAttemptsByType: {
        compilation: 5,
        test: 3,
        lint: 2,
        coverage: 2,
        dependency: 3,
        infrastructure: 5,
        flaky: 1,
      },
      escalation: {
        channel: 'github_comment',
        notifyRoles: ['tech-lead', 'author'],
        includeContext: true,
      },
      ...config,
    };
  }

  async onCIFailure(event: CIEvent, pr: PRState): Promise<void> {
    const runId = event.runId;
    const currentAttempts = this.attempts.get(runId) ?? 0;

    if (currentAttempts >= this.config.maxAttempts) {
      await this.escalate(pr, event.runId, currentAttempts);
      return;
    }

    this.attempts.set(runId, currentAttempts + 1);

    const errorAnalysis = await this.analyzeError(event);
    const fix = await this.createFix(errorAnalysis, pr);
    const valid = await this.validateFix(fix);

    if (valid) {
      await this.applyFix(fix, pr);
      await this.retriggerCI(runId);
    } else {
      // Re-analisar com mais contexto
      const deepAnalysis = await this.analyzeError(event, true);
      const deepFix = await this.createFix(deepAnalysis, pr);
      await this.applyFix(deepFix, pr);
      await this.retriggerCI(runId);
    }
  }

  private async analyzeError(
    event: CIEvent,
    _deep: boolean = false
  ): Promise<ErrorAnalysis> {
    const logs = event.logs ?? [];
    const allLogs = logs.map(l => l.content).join('\n');

    const errorType = this.classifyError(allLogs);
    const rootCause = this.extractRootCause(allLogs, errorType);

    return {
      errorType,
      rootCause,
      affectedFiles: this.extractAffectedFiles(allLogs),
      lineNumbers: this.extractLineNumbers(allLogs),
      suggestion: '',
    };
  }

  private classifyError(logs: string): ErrorType {
    if (logs.includes('TS') && logs.includes('error')) return 'compilation';
    if (logs.includes('eslint') && logs.includes('error')) return 'lint';
    if (logs.includes('FAIL') || logs.includes('AssertionError')) return 'test';
    if (logs.includes('coverage') && logs.includes('threshold')) return 'coverage';
    if (logs.includes('ERR_PACKAGE_PATH_NOT_EXPORTED')) return 'dependency';
    if (logs.includes('timeout') || logs.includes('Timeout')) return 'infrastructure';
    return 'compilation';
  }

  private extractRootCause(_logs: string, errorType: ErrorType): string {
    return `Root cause of ${errorType} error`;
  }

  private extractAffectedFiles(_logs: string): string[] {
    return [];
  }

  private extractLineNumbers(_logs: string): number[] {
    return [];
  }

  private async createFix(
    _analysis: ErrorAnalysis,
    _pr: PRState
  ): Promise<Fix> {
    // Em producao, usaria Programmer Agent para gerar o fix
    return {
      files: [],
      description: '',
      type: 'code',
    };
  }

  private async validateFix(_fix: Fix): Promise<boolean> {
    return true;
  }

  private async applyFix(fix: Fix, pr: PRState): Promise<void> {
    for (const fileChange of fix.files) {
      if (fileChange.operation === 'modify' || fileChange.operation === 'create') {
        await fs.promises.writeFile(fileChange.path, fileChange.newContent);
      }
    }

    await this.execGitCommand(['add', '-A']);
    await this.execGitCommand([
      'commit', '-m', `fix: auto-fix for PR #${pr.id} - ${fix.description}`,
    ]);
    await this.execGitCommand(['push', 'origin', pr.branch.name]);
  }

  private async retriggerCI(runId: string): Promise<void> {
    await this.provider.reTrigger(runId);
  }

  private async execGitCommand(args: string[]): Promise<void> {
    const { execSync } = await import('child_process');
    execSync(`git ${args.join(' ')}`, { cwd: process.cwd() });
  }

  private async escalate(pr: PRState, runId: string, attempts: number): Promise<void> {
    const message = [
      `PR #${pr.id} - Auto-Fix Exceeded Max Attempts`,
      ``,
      `Issue: ${pr.issue.title}`,
      `Branch: ${pr.branch.name}`,
      `Failed after: ${attempts} attempt(s)`,
      ``,
      `Action required: Manual intervention needed.`,
    ].join('\n');

    await this.provider.createComment(pr.id, message);

    console.error(`[AutoFixer] Escalated PR #${pr.id} after ${attempts} attempts`);
  }
}
```

### 14.6 ReviewGenerator

```typescript
// packages/pr-pipeline/src/review-generator.ts

export class ReviewGenerator {
  async generateReview(pr: PRState, diff: string): Promise<PRReview> {
    const quality = await this.analyzeQuality(diff);
    const security = await this.analyzeSecurity(diff, pr);
    const coverage = await this.assessCoverage(pr);
    const performance = await this.analyzePerformance(diff);
    const suggestions = await this.generateSuggestions(diff, quality, security);
    const decision = this.makeDecision(quality, security, coverage);

    return {
      summary: this.createSummary(pr, decision),
      quality,
      security,
      coverage,
      performance,
      suggestions,
      decision,
      generatedAt: new Date().toISOString(),
    };
  }

  private async analyzeQuality(_diff: string): Promise<PRReview['quality']> {
    return {
      score: 50,
      grade: 'C',
      dimensions: {
        naming: 7,
        complexity: 6,
        duplication: 8,
        errorHandling: 5,
        typeSafety: 8,
        testing: 6,
        documentation: 5,
      },
    };
  }

  private async analyzeSecurity(
    _diff: string,
    _pr: PRState
  ): Promise<PRReview['security']> {
    return {
      passed: true,
      blocked: false,
      findings: [],
      summary: 'No security issues detected',
    };
  }

  private async assessCoverage(_pr: PRState): Promise<PRReview['coverage']> {
    return {
      status: 'green',
      totalCoverage: 75,
      diffCoverage: 85,
      missingTests: [],
    };
  }

  private async analyzePerformance(_diff: string): Promise<PRReview['performance']> {
    return {
      impact: 'low',
      details: 'No performance impact detected',
      suggestions: [],
    };
  }

  private async generateSuggestions(
    _diff: string,
    _quality: PRReview['quality'],
    _security: PRReview['security']
  ): Promise<PRReview['suggestions']> {
    return [];
  }

  private makeDecision(
    quality: PRReview['quality'],
    security: PRReview['security'],
    _coverage: PRReview['coverage']
  ): 'approve' | 'changes_requested' | 'blocked' {
    if (security.blocked) return 'blocked';
    if (quality.grade === 'F' || quality.grade === 'D') return 'changes_requested';
    return 'approve';
  }

  private createSummary(
    pr: PRState,
    decision: PRReview['decision']
  ): string {
    const decisionMap: Record<string, string> = {
      approve: 'approved',
      changes_requested: 'changes requested',
      blocked: 'blocked',
    };

    return [
      `## Review Summary`,
      ``,
      `PR #${pr.id}: ${pr.issue.title}`,
      `Decision: ${decisionMap[decision]}`,
      ``,
      `The changes implement the requested feature adequately.`,
      decision === 'approve'
        ? 'No critical issues found.'
        : 'Some issues need to be addressed before merge.',
    ].join('\n');
  }
}
```

### 14.7 MergeGate

```typescript
// packages/pr-pipeline/src/merge-gate.ts

interface MergeResult {
  merged: boolean;
  sha?: string;
  message?: string;
  error?: string;
}

export class MergeGate {
  constructor(
    private config: MergeConfig,
    private octokit: Octokit
  ) {}

  async waitForApproval(pr: PRState): Promise<Approval[]> {
    return new Promise((resolve) => {
      const checkApprovals = async () => {
        const approvals = await this.getApprovals(pr);
        const requiredLevel = this.getRequiredApprovalLevel(pr);

        if (this.hasSufficientApprovals(approvals, requiredLevel)) {
          resolve(approvals);
          return;
        }

        setTimeout(checkApprovals, 10000);
      };

      checkApprovals();
    });
  }

  async executeMerge(pr: PRState): Promise<MergeResult> {
    const gatesPassed = await this.verifyGates(pr);
    if (!gatesPassed) {
      return { merged: false, error: 'Quality gates failed' };
    }

    try {
      const result = await this.octokit.pulls.merge({
        owner: pr.repository.owner,
        repo: pr.repository.name,
        pull_number: pr.id,
        merge_method: this.config.strategy,
        commit_title: this.buildMergeTitle(pr),
        commit_message: this.buildMergeMessage(pr),
      });

      if (result.data.merged) {
        await this.postMergeActions(pr, result.data.sha!);
      }

      return {
        merged: result.data.merged,
        sha: result.data.sha,
        message: result.data.message,
      };
    } catch (error) {
      return {
        merged: false,
        error: error instanceof Error ? error.message : 'Merge failed',
      };
    }
  }

  private async verifyGates(pr: PRState): Promise<boolean> {
    // Verificar todos os quality gates
    const checks: Array<{ name: string; passed: boolean }> = [];

    // Code quality
    checks.push({
      name: 'Code Quality',
      passed: pr.review.quality.grade !== 'F',
    });

    // Security
    checks.push({
      name: 'Security',
      passed: pr.review.security.passed && !pr.review.security.blocked,
    });

    // Tests
    checks.push({
      name: 'Tests',
      passed: pr.testResults.passed,
    });

    // Coverage
    checks.push({
      name: 'Coverage',
      passed: pr.testResults.coverage.lines >= 30,
    });

    return checks.every(c => c.passed);
  }

  private async getApprovals(pr: PRState): Promise<Approval[]> {
    const { data } = await this.octokit.pulls.listReviews({
      owner: pr.repository.owner,
      repo: pr.repository.name,
      pull_number: pr.id,
    });

    return data
      .filter(r => r.state === 'APPROVED')
      .map(r => ({
        reviewer: r.user!.login,
        level: this.inferReviewerLevel(r.user!.login),
        timestamp: r.submitted_at!,
      }));
  }

  private getRequiredApprovalLevel(_pr: PRState): ApprovalLevel {
    return this.config.minimumApprovalLevel ?? 'N1';
  }

  private hasSufficientApprovals(
    approvals: Approval[],
    requiredLevel: ApprovalLevel
  ): boolean {
    const levelOrder: ApprovalLevel[] = ['N0', 'N1', 'N2', 'N3', 'N4'];
    const requiredIndex = levelOrder.indexOf(requiredLevel);

    return approvals.some(a => {
      const approvalIndex = levelOrder.indexOf(a.level);
      return approvalIndex >= requiredIndex;
    });
  }

  private inferReviewerLevel(_username: string): ApprovalLevel {
    // Em producao, consultaria mapa de usuarios -> niveis
    return 'N1';
  }

  private buildMergeTitle(pr: PRState): string {
    return `${pr.issue.type === 'bugfix' ? 'fix' : 'feat'}(${pr.branch.scope}): ${pr.issue.title}`;
  }

  private buildMergeMessage(pr: PRState): string {
    return [
      `Closes #${pr.issue.id}`,
      ``,
      `Automated PR pipeline by IDEIA`,
      `Review: ${pr.review.decision}`,
    ].join('\n');
  }

  private async postMergeActions(
    pr: PRState,
    _sha: string
  ): Promise<void> {
    // Delete branch
    if (this.config.deleteBranchAfterMerge) {
      await this.octokit.git.deleteRef({
        owner: pr.repository.owner,
        repo: pr.repository.name,
        ref: `heads/${pr.branch.name}`,
      });
    }

    // Update changelog
    if (this.config.updateChangelog) {
      // Read CHANGELOG.md, prepend new entry
    }

    // Close issues
    await this.octokit.issues.update({
      owner: pr.repository.owner,
      repo: pr.repository.name,
      issue_number: parseInt(pr.issue.id),
      state: 'closed',
    });
  }
}
```

---

## 15. Implementation Roadmap

### 15.1 Phase 1: Foundation (Sprint 1-2, ~30h)

| Task | Esforco | Dependencias | Entrega |
|------|---------|-------------|---------|
| `@ideia/pr-pipeline` package scaffold | 2h | N/A | Estrutura do package |
| PRPlanner: task decomposition | 6h | Issue schema | Branch + commit plan |
| PRPlanner: description generation | 4h | PRPlanner base | PR description template |
| CodeImplementer: scope compliance | 6h | PRPlanner | File changes execution |
| CodeImplementer: conventional commits | 2h | CodeImplementer | Commit validation |
| TestRunner: test execution wrapper | 4h | N/A | Runs existing tests |
| TestRunner: lint + typecheck | 2h | TestRunner | Validation commands |
| PRCreator: GitHub API integration | 4h | PRPlanner + CodeImplementer | PR creation |

**Milestone F1:** PR pipeline basico funcional — issue > branch > code > tests > PR criado manualmente

**Riscos:** Integracao com GitHub API requer token com permissoes adequadas.

### 15.2 Phase 2: CI Integration (Sprint 3-4, ~35h)

| Task | Esforco | Dependencias | Entrega |
|------|---------|-------------|---------|
| CIProvider interface | 3h | N/A | Abstracao de provedores CI |
| GitHubActionsProvider | 6h | CIProvider interface | WebSocket + REST polling |
| GitLabCIProvider | 4h | CIProvider interface | CI tunnel integration |
| JenkinsProvider | 4h | CIProvider interface | Plugin + Remote API |
| CIWatcher: WebSocket listener | 5h | CIProvider | Eventos em tempo real |
| CIWatcher: log + artifact collection | 4h | CIWatcher | Log parsing e download |
| CIWatcher: PR status correlation | 3h | CIWatcher | Match CI runs to PRs |
| Webhook receiver | 4h | N/A | Generic webhook endpoint |
| JUnit/TAP/xUnit parsers | 2h | N/A | Test result parsing |

**Milestone F2:** CI monitoring completo — eventos em tempo real, coleta de logs, correlacao com PRs.

**Riscos:** WebSocket do GitHub pode ser instavel; fallback polling necessario.

### 15.3 Phase 3: Auto-Fix (Sprint 5-6, ~40h)

| Task | Esforco | Dependencias | Entrega |
|------|---------|-------------|---------|
| Error log parser | 6h | CIWatcher | Parse de logs de erro |
| Error classification | 4h | Error parser | Classificacao de tipos de erro |
| Root cause analysis | 8h | Error classifier | Determinacao de causa raiz |
| Code fix generator | 8h | Root cause analysis | Geracao automatica de correcoes |
| Test fix generator | 4h | Root cause analysis | Correcao de testes |
| Fix loop controller | 4h | Fix generators | Estado, max attempts, retry |
| Escalation handler | 2h | Fix loop controller | Notificacao humana |
| CI re-trigger | 2h | Fix loop controller | Re-trigger apos fix |
| Flaky test detection | 2h | TestRunner | Identificacao de testes inconsistentes |

**Milestone F3:** Auto-fix loop funcional — CI falha > analise > correcao > re-trigger > max attempts > escalation.

**Riscos:** Qualidade das correcoes depende do modelo LLM; necessario fallback para humano.

### 15.4 Phase 4: Full Autonomy (Sprint 7-8, ~45h)

| Task | Esforco | Dependencias | Entrega |
|------|---------|-------------|---------|
| ReviewGenerator: diff analysis | 6h | N/A | Analise de diff completo |
| ReviewGenerator: quality scoring | 4h | ReviewGenerator | Scoring de qualidade |
| ReviewGenerator: security analysis | 6h | ReviewGenerator | Deteccao de vulnerabilidades |
| ReviewGenerator: suggestions | 4h | ReviewGenerator | Geracao de sugestoes |
| MergeGate: approval flow | 4h | N/A | Workflow de aprovacao |
| MergeGate: merge strategies | 3h | MergeGate | Squash/rebase/merge |
| MergeGate: auto-merge | 2h | MergeGate | Merge automatico apos aprovacao |
| MergeGate: branch deletion | 1h | MergeGate | Limpeza de branch |
| MergeGate: changelog update | 3h | MergeGate | Atualizacao automatica |
| Multi-repo: monorepo handler | 4h | PRPlanner | Workspace-aware PRs |
| Multi-repo: cross-repo dependencies | 4h | Multi-repo base | Sincronizacao entre repos |
| Integration testing suite | 4h | All | Testes de integracao E2E |

**Milestone F4:** PR pipeline completamente autonomo — do planejamento ao merge com supervisao humana configuravel.

**Riscos:** Complexidade de integracao com multiplos provedores CI; qualidade de review generado.

### 15.5 Effort Summary

| Fase | Horas | Sprints | Dependencias | Risco |
|------|-------|---------|-------------|-------|
| F1: Foundation | 30h | 2 | Nenhuma | Baixo |
| F2: CI Integration | 35h | 2 | F1 | Medio |
| F3: Auto-Fix | 40h | 2 | F2 | Alto |
| F4: Full Autonomy | 45h | 2 | F3 | Alto |
| **Total** | **150h** | **8 sprints** | | |

### 15.6 Success Metrics

| Metrica | Alvo F1 | Alvo F2 | Alvo F3 | Alvo F4 |
|---------|---------|---------|---------|---------|
| PR creation time (issue to PR) | < 15min | < 10min | < 5min | < 2min |
| CI failure detection latency | N/A | < 5s | < 3s | < 1s |
| Auto-fix success rate | N/A | N/A | > 60% | > 80% |
| Average fix attempts | N/A | N/A | < 3 | < 2 |
| Review quality score (human eval) | N/A | N/A | N/A | > 7/10 |
| Merge time after human approval | N/A | N/A | N/A | < 1min |
| Human intervention rate | 100% | 80% | 40% | < 20% |
| Test coverage diff gate pass rate | N/A | N/A | > 70% | > 90% |

### 15.7 Risks and Mitigations

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| GitHub API rate limiting | Alta | Medio | Implementar cache + backoff + tokens rotativos |
| CI WebSocket instavel | Media | Alto | Fallback para polling + reconnect com backoff |
| LLM code generation de baixa qualidade | Media | Alto | Validacao com tsc + lint + testes antes de commitar |
| Auto-fix loop infinito | Baixa | Alto | Max attempts configravel + escalation obrigatoria |
| Secret exposure em PR description | Baixa | Critico | Output validation + secrets scan pre-publicacao |
| Cross-repo merge conflicts | Media | Medio | Merge gate verifica conflitos antes de aprovar |
| Flaky tests causam falsos positivos | Alta | Medio | Identificacao de flaky + auto-retry antes de declarar falha |

---

## 16. Conexoes

### 16.1 Estudos Relacionados

| Estudo | Relacao | Como se Conecta |
|--------|---------|-----------------|
| **S6 — Pipeline de Entrega** | Pipeline CI/CD, quality gates, progressive delivery | PR Pipeline e o step anterior ao deploy; S6 define como o codigo mergeado e entregue |
| **S16 — Deploy e Entrega Continua** | GitOps, canary, rollback, CI/CD workflows | PR Pipeline usa CI/CD workflows do S16; apos merge, S16 gerencia deploy |
| **S28 — Zero-to-Deploy** | Fluxo completo da ideia ao deploy | PR Pipeline e o backbone tecnico do fluxo S28 (step 4-7) |
| **S37 — Search/SCM/Task** | Git integration, SCM diff, task runner | PR Pipeline usa SCM para operacoes git (branch, commit, diff) e Task Runner para execucao de testes |
| **S50 — Computer Use** | Navegador integrado, testes E2E | Computer Use pode gerar screenshots para test evidence em PRs de UI |
| **S51 — Parallel Agents** | Multi-agente paralelo, Agentic MapReduce | PR Pipeline pode paralelizar steps (ex: CodeImplementer + TestRunner simultaneos) |
| **S5 — Orquestracao Multiagente** | LangGraph, sub-grafos, coordenacao | PR Pipeline usa LangGraph para orquestrar os 7 passos como nos do grafo |
| **S3 — Intencao > Plano** | Task decomposition, ADAPT, intent classification | PRPlanner usa tecnicas de S3 para decompor issues em tasks atomicas |
| **S12 — Testes e Qualidade Automatizada** | Playwright, Pact, StrykerJS | TestRunner integra ferramentas de S12 para geracao e execucao de testes |
| **S1 — Barramento de Eventos** | NATS JetStream, pub/sub | Toda comunicacao entre steps do pipeline via NATS |
| **S4 — Seguranca e Governanca** | Policy engine, output validation, audit | ReviewGenerator usa policy engine; MergeGate verifica compliance |
| **S39 — Settings & Keybindings** | Configuracoes de usuario | PR Pipeline config (max attempts, merge strategy, approval levels) exposta via S39 |
| **S47 — Theia AI Agents** | Agentes Theia AI integrados | PR Pipeline agentes expostos como tool functions do Theia AI |

### 16.2 Packages Utilizados/Criados

| Package | Acao | Descricao |
|---------|------|-----------|
| `@ideia/pr-pipeline` | **Criar** | Package principal com todos os 7 steps |
| `@ideia/agent-runtime` | Usar | Orquestracao LangGraph dos steps |
| `@ideia/event-bus` | Usar | NATS pub/sub entre steps |
| `@ideia/mcp` | Usar | File system tools para agentes |
| `@ideia/policy-engine` | Usar | Policy checks no ReviewGenerator e MergeGate |
| `@ideia/audit-trail` | Usar | Audit chain de cada acao do pipeline |
| `@ideia/risk-approval` | Usar | Approval flow no MergeGate |
| `@ideia/quality-gates` | Usar | Quality gates no pre-merge |
| `@ideia/checkpoint-engine` | Usar | Checkpoints para retomar pipeline de estados falhos |
| `@ideia/delivery-orchestrator` | Estender | Trigger de deploy apos merge |
| `@theia/scm` | Usar | Operacoes git (branch, commit, push) |
| `@theia/task` | Usar | Execucao de tasks de build/test |

### 16.3 Eventos NATS

| Evento | Publisher | Subscriber |
|--------|-----------|------------|
| `pr.pipeline.planning.request` | User/Issue System | PRPlanner |
| `pr.pipeline.planning.completed` | PRPlanner | CodeImplementer |
| `pr.pipeline.code.completed` | CodeImplementer | TestRunner |
| `pr.pipeline.test.completed` | TestRunner | PRCreator |
| `pr.pipeline.pr.created` | PRCreator | CIWatcher |
| `pr.pipeline.ci.status` | CIWatcher | AutoFixer, ReviewGenerator |
| `pr.pipeline.fix.required` | CIWatcher (failed) | AutoFixer |
| `pr.pipeline.fix.completed` | AutoFixer | CIWatcher |
| `pr.pipeline.review.ready` | ReviewGenerator | MergeGate |
| `pr.pipeline.merge.approved` | User (approval) | MergeGate |
| `pr.pipeline.merge.completed` | MergeGate | DeliveryOrchestrator |
| `pr.pipeline.merge.failed` | MergeGate | User (notification) |

### 16.4 Comandos CLI

Novos comandos a serem adicionados ao CLI:

| Comando | Descricao |
|---------|-----------|
| `IDEIA pr plan <issue-id>` | Planejar PR a partir de issue |
| `IDEIA pr create <plan-id>` | Criar PR a partir de plano |
| `IDEIA pr watch <pr-number>` | Monitorar CI de um PR |
| `IDEIA pr fix <pr-number>` | Disparar auto-fix manualmente |
| `IDEIA pr review <pr-number>` | Gerar review para PR |
| `IDEIA pr merge <pr-number>` | Mergear PR (se gates ok) |
| `IDEIA pr status <pr-number>` | Status completo do PR pipeline |
| `IDEIA pr config` | Configurar PR pipeline (max attempts, merge strategy) |
| `IDEIA pr history` | Historico de PRs processados |

---

> **Fim do Estudo S52**
> *Proximo: S53 — Computer Use Integration*
> *Relacionado: S6 (Pipeline), S16 (Deploy/CD), S28 (Zero-to-Deploy), S37 (Search/SCM/Task), S50 (Computer Use), S51 (Parallel Agents)*
