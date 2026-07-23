#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, writeTextIdempotent } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('module-graph.js', 'node .ai/bin/module-graph.js', ['--help  Mostra esta ajuda'])
  process.exit(0)
}

const modulesDir = path.join(ROOT, 'src/modules')
const modules = fs.existsSync(modulesDir)
  ? fs.readdirSync(modulesDir).filter(f => fs.statSync(path.join(modulesDir, f)).isDirectory())
  : []

const lines = ['# Module Graph', '', 'Gerado automaticamente por `.ai/bin/module-graph.js`.', '', '```mermaid', 'graph TD']
if (modules.length === 0) {
  lines.push('  NoModules[Nenhum modulo encontrado em src/modules]')
} else {
  modules.forEach(m => lines.push('  ' + m + '[' + m + ']'))
}
lines.push('```', '')

const out = path.join(ROOT, '.ai/docs/module-graph.md')
writeTextIdempotent(out, lines.join('\n'))
info('.ai/docs/module-graph.md gerado com ' + modules.length + ' modulo(s)')