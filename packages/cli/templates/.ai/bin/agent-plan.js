#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, writeTextIdempotent, readTextSafe } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('agent-plan.js', 'node .ai/bin/agent-plan.js', ['--help  Mostra esta ajuda'])
  process.exit(0)
}

const taskPath = path.join(ROOT, '.ai/tasks/current-task.md')
const task = readTextSafe(taskPath) || '# Nenhuma tarefa definida em .ai/tasks/current-task.md'

const content = [
  '# Execution Plan',
  '',
  'Gerado a partir de `.ai/tasks/current-task.md`.',
  '',
  '## Tarefa atual',
  '',
  '```markdown',
  task.trim(),
  '```',
  '',
  '## Passos sugeridos',
  '',
  '1. Ler contexto (`.ai/context/ai-handoff.md`).',
  '2. Validar prontidao (`.ai/checklists/implementation-readiness-checklist.md`).',
  '3. Implementar em blocos pequenos e verificaveis.',
  '4. Rodar lint, typecheck e testes.',
  '5. Atualizar memoria e contexto ao concluir.',
  ''
].join('\n')

const out = path.join(ROOT, '.ai/agents/execution-plan.md')
const result = writeTextIdempotent(out, content)
info(result.changed ? 'execution-plan.md atualizado' : 'execution-plan.md ja estava atualizado')