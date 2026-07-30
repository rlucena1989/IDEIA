# .ai/bin

Scripts executaveis auxiliares do ai-devkit. Todos sao Node.js puro (sem dependencias externas) e podem ser executados com `node .ai/bin/<script>.js` ou via `npm run ai:*`.

## Biblioteca comum

- `lib/common.js` — logs, parse de argumentos, escrita idempotente, slugify.
- `lib/templates.js` — renderizacao simples de templates `{{variavel}}`.
- `lib/validators.js` — validacoes basicas reutilizaveis.

## Scripts existentes

- `skeleton.js`, `cognitive-bridge.js`, `self-heal.js`, `verify.js`, `release.js`
- `export-cursor-rules.js`, `export-copilot-instructions.js`, `export-agents-md.js`, `export-aider-config.js`, `export-continue-config.js`, `export-windsurf-rules.js`
- `update-memory.js`

## Scripts planejados/adicionados por fase

- Fase 1 — `agent-plan.js`, `generate-agent-modes.js`, `autonomous-loop.js`, `task-report.js`
- Fase 2 — `generate-catalog.js`, `render-template.js`, `init-interactive.js`
- Fase 3 — `generate.js`, `gen.js`, `create-module.js`
- Fase 4 — `module-graph.js`, `check-boundaries.js`, `framework-generate.js`, `adr-new.js`, `adr-index.js`, `docs-site.js`, `generate-c4.js`
- Fase 5 — `openapi-validate.js`, `openapi-diff.js`, `asyncapi-validate.js`, `graphql-validate.js`, `check-contracts.js`
- Fase 6 — `release-notes.js`
- Fase 7 — `frontend-docs.js`, `e2e-plan.js`, `generate-github-actions.js`, `generate-docker.js`, `export-taskfile.js`, `export-justfile.js`, `pipeline-generate.js`, `pipeline-runner.js`, `k8s-docs.js`
- Fase 8 — `feature-blueprint.js`, `domain-model.js`, `usecase-pipeline.js`, `test-matrix.js`, `acceptance-generate.js`, `resource-generate.js`, `endpoint-generate.js`, `migration-plan.js`, `data-scenario.js`, `mock-api-generate.js`, `integration-generate.js`, `errors-map.js`, `workflow-generate.js`, `dto-generate.js`, `sdk-generate.js`

## Convencoes

- Cada script aceita `--help`/`-h`.
- Nenhum script depende de rede ou credenciais.
- Scripts geradores criam artefatos em diretorios versionaveis.
