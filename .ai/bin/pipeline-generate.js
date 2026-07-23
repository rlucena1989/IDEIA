#!/usr/bin/env node
'use strict'
const { ROOT, info, printHelp, parseArgs, writeTextIdempotent } = require('./lib/common')
const path = require('path')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('pipeline-generate.js', 'node .ai/bin/pipeline-generate.js', ['--help  Mostra esta ajuda'])
  process.exit(0)
}

const steps = ['npm ci', 'npm run lint', 'npm run typecheck', 'npm test', 'npm run build']
const lines = ['# Pipeline documentado', '', 'Etapas executadas por `npm run ai:pipeline:run`:', '']
steps.forEach((s, i) => lines.push((i + 1) + '. `' + s + '`'))
lines.push('')

writeTextIdempotent(path.join(ROOT, '.ai/deployment/pipeline.md'), lines.join('\n'))
info('.ai/deployment/pipeline.md gerado/atualizado')