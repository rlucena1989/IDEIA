# Agent Safety Policy

## Regras obrigatórias para qualquer agente de IA operando neste projeto

1. **Escopo de arquivos**: um agente só pode modificar arquivos listados em
   `.ai/tasks/current-task.md` na seção "Arquivos a preencher/modificar".
2. **Proibição de segredos**: nenhum agente pode escrever chaves de API,
   tokens ou senhas em texto plano em qualquer arquivo do repositório.
3. **Proibição de paths absolutos locais**: ver `active-prevention-rules.yaml`,
   regra `no-hardcoded-local-paths`.
4. **Preservação de trabalho humano**: ver regra `human-work-preservation`.
   Nenhum agente pode sobrescrever arquivo editado por humano sem `--force`
   explícito e sem gerar backup.
5. **Obrigação de prova**: nenhum agente pode marcar uma tarefa como `[x]`
   concluída em `master-plan.md`/`done.md` sem anexar a saída de um comando
   de verificação real.

## Enforcement

Estas regras são parcialmente verificadas por:

- `check-ph-policy.js` (proibição de mock vazio)
- `check-empty-or-decorative-files.js` (proibição de estrutura oca)
- `run-prevention-suite.js --strict` (agregador de cada check)

## Violação encontrada nesta auditoria (05/07/2026)

A regra 5 (obrigação de prova) estava sendo violada pelo próprio
`master-plan.md`, que marcava TSK-2.2, TSK-2.3 e TSK-2.4 como `[x]` sem
evidência. Corrigido em `12-master-plan-CORRIGIDO.md` deste pacote.
