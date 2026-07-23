# Source of Truth Map — Mapa de Fontes de Verdade

> Versão 2.0 — Atualizado em 2026-07-15
> Caminhos corrigidos e expandidos conforme auditoria documental.

## Matriz de Consulta

| Assunto                          | Fonte de Verdade                                    | Localização                                                                    |
| -------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Leis arquiteturais (9 regras)    | `.ai/laws.yaml`                                     | Regras de Clean Architecture, DTO, AppError, proibição de `any`, cobertura 20% |
| Manifesto do projeto             | `.ai/project-manifest.yaml`                         | Stack, requisitos, qualidade                                                   |
| Qualidade (gates, métricas, DoD) | `.ai/quality/*.md`                                  | Gates mínimos, limites de complexidade, Definition of Done                     |
| Políticas de projeto             | `.ai/policies/project-policy.yaml`                  | Naming, estrutura, cobertura                                                   |
| Pipeline CI/CD                   | `.github/workflows/ci.yml`                          | Build, lint, test, qualidade                                                   |
| Config de testes                 | `jest.config.js`                                    | Thresholds, transform, testMatch                                               |
| Config de lint                   | `.eslintrc.js`                                      | Regras ESLint                                                                  |
| Cobertura atual                  | `coverage/coverage-summary.json`                    | Métricas executáveis de cobertura                                              |
| Registry documental              | `docs/governance/document-registry.md`              | Catálogo oficial de todos os documentos                                        |
| Fluxo documental para IAs        | `.ai/docs-governance/DOCUMENT-FLOW-MANUAL.md`       | Manual obrigatório para qualquer IA                                            |
| Resolução de conflitos           | `docs/governance/conflict-resolution.md`            | Conflitos conhecidos e regras                                                  |
| Política por tipo de tarefa      | `docs/governance/document-policy.md`                | Documento primário, fallbacks, modo                                            |
| Hierarquia de precedência        | `docs/governance/document-priority.md`              | Ordem de precedência documental                                                |
| Planejamento macro               | `.ai/tasks/master-plan.md`                          | Estratégia geral                                                               |
| Execução imediata                | `.ai/tasks/current-task.md`                         | Tarefa atual                                                                   |
| Fila de trabalho                 | `.ai/tasks/backlog.md`                              | Priorização                                                                    |
| Procedimento de cobertura        | `docs/governance/coverage-autonomy-procedure.md`    | Ciclo autônomo de testes                                                       |
| Roadmap funcional                | `docs/governance/FUNCIONALIDADES_V2_ROADMAP.md`     | Roadmap de funcionalidades                                                     |
| Métricas de sucesso              | `docs/governance/FUNCIONALIDADES_V2_METRICS.md`     | Métricas e scorecard                                                           |
| Propostas funcionais             | `docs/governance/FUNCIONALIDADES_V2_PROPOSALS.md`   | Propostas de funcionalidades                                                   |
| Matriz funcional                 | `docs/governance/FUNCIONALIDADES_V2_MATRIX.md`      | Matriz de relacionamento                                                       |
| Dashboard de cobertura           | `.ai/reports/scorecard/report.md`                   | Scorecard atual (96/100)                                                       |
| Guia de tecnologias              | `.ai/technologies/README.md`                        | Stack, compatibilidade, evolução                                               |
| Guia de arquitetura              | `.ai/architecture/architecture-overview.md`         | Visão arquitetural                                                             |
| Decisões de arquitetura          | `.ai/architecture/adr/`                             | ADRs 0001–0004                                                                 |
| Design system                    | `.ai/design/design-system.md`                       | Tokens, componentes, patterns                                                  |
| Prompts de sistema               | `.ai/prompts/00-master-system-prompt.md`            | Prompt mestre                                                                  |
| Prompts de ferramenta            | `prompts/SYSTEM-PROMPT-BASE.md`                     | Prompt base de execução                                                        |
| Auditoria completa               | `docs/governance/AUDITORIA-DOCUMENTAL-COMPLETA.md`  | Auditoria geral de docs e tasks                                                |
| Segurança e governança           | `docs/governance/SECURITY-GOVERNANCE-ASSESSMENT.md` | Assessment de segurança                                                        |

## Como Usar

```bash
# Resolver documento para um tipo de tarefa
ai-devkit docs resolve execution

# Auditar conflitos
ai-devkit docs audit

# Listar todas as fontes
ai-devkit docs sources

# Ver política documental
ai-devkit docs policy tests

# Status da governança
ai-devkit docs status

# Validação local de fluxo documental
node .ai/bin/enforce-document-flow.js
```

## Hierarquia em Caso de Divergência

1. `.ai/laws.yaml` (leis arquiteturais)
2. `.ai/project-manifest.yaml` (manifesto do projeto)
3. `.ai/policies/*` (políticas formalizadas)
4. `.ai/quality/*` (gates, métricas, DoD)
5. `jest.config.js`, `.eslintrc.js`, `tsconfig.json` (configs executáveis)
6. `docs/governance/document-registry.md` (registry canônico)
7. `.ai/docs-governance/DOCUMENT-FLOW-MANUAL.md` (fluxo documental)
8. `docs/governance/document-policy.md` + `document-priority.md` (política + precedência)
9. `docs/governance/conflict-resolution.md` (conflitos conhecidos)
10. `CLAUDE.md`, `AGENTS.md`, etc. (cópias das leis para IAs)
11. `docs/*.md`, `plans/*.md` (documentação geral)
