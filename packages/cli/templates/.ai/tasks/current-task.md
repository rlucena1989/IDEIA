# Tarefa Atual

## ID: TASK-P0-HARDENING-01

## Nome: Eliminar bloqueadores P0 de estrutura oca (auditoria 05/07/2026)

## Objetivo

Aplicar o pacote de hardening entregue na auditoria de 05/07/2026 e comprovar,
com testes reais, que cada bloqueador P0 foi resolvido.

## Arquivos/scripts a aplicar (nesta ordem)

- [ ] `.ai/bin/check-ph-value-policy.js` (novo)
- [ ] Patch no `prove` para usar allowlist contextual
- [ ] `.ai/bin/check-empty-or-decorative-files.js` (novo)
- [ ] `.ai/bin/check-package-scripts.js` (corrigido)
- [ ] Patch em `package.json` (raiz e `packages/cli`)
- [ ] `.ai/bin/check-artifact-manifest.js` (novo)
- [ ] `.ai/bin/check-installer.js` (corrigido, com debug)
- [ ] Patch no comando `audit` (modo estrito)
- [ ] `packages/cli/src/commands/adapter.ts` (implementação real)
- [ ] `.ai/project-state.md`, `.ai/tasks/master-plan.md`, `.ai/tasks/current-task.md`
      (substituídos pelas versões corrigidas)
- [ ] Preenchimento dos ~28 arquivos Markdown decorativos (ver pasta `03-CONTENT-FIXES/`)

## Critérios de aceite (PENDING_ACTIONS obrigatórios, com saída de comando anexada)

- [ ] `ai-devkit prove` retorna exit code 0
- [ ] `npm run ai:prevention` retorna exit code 0 no monorepo
- [ ] `ai-devkit audit` falha SE `ai-devkit prove` falhar (consistência)
- [ ] `node dist/index.js adapter list/detect/validate` produzem saída real (não `--help`)
- [ ] `node .ai/bin/check-installer.js` passa no monorepo
- [ ] Nenhum arquivo listado por `check-empty-or-decorative-files.js` continua oco

## Regra de fechamento desta tarefa

Só marque esta tarefa como concluída em `.ai/tasks/done.md` se colar, junto,
a saída completa de:

```bash
ai-devkit prove
npm run ai:prevention
node .ai/bin/check-installer.js
```

Sem essa evidência, a tarefa permanece em `current-task.md`.
