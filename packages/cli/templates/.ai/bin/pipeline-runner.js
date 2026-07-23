#!/usr/bin/env node
'use strict'
const { execFileSync } = require('child_process')
const { ROOT, info, warn, printHelp, parseArgs } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('pipeline-runner.js', 'node .ai/bin/pipeline-runner.js', [
    'Executa as etapas documentadas em .ai/deployment/pipeline.md (lint, typecheck, test, build).',
    '--help  Mostra esta ajuda'
  ])
  process.exit(0)
}

const steps = [
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'typecheck']],
  ['npm', ['test']],
  ['npm', ['run', 'build']]
]

for (const [cmd, cmdArgs] of steps) {
  info('Executando: ' + cmd + ' ' + cmdArgs.join(' '))
  try {
    execFileSync(cmd, cmdArgs, { stdio: 'inherit', cwd: ROOT, shell: process.platform === 'win32' })
  } catch (err) {
    warn('Etapa falhou: ' + cmd + ' ' + cmdArgs.join(' '))
    process.exit(err.status || 1)
  }
}

info('Pipeline concluido com sucesso.')