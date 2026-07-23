#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, writeTextIdempotent } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('generate-agent-modes.js', 'node .ai/bin/generate-agent-modes.js', ['--help  Mostra esta ajuda'])
  process.exit(0)
}

const modesDir = path.join(ROOT, '.ai/modes')
const files = fs.existsSync(modesDir) ? fs.readdirSync(modesDir).filter(f => f.endsWith('.md')).sort() : []

const lines = ['# Modes Index', '', 'Modos de agente disponiveis em `.ai/modes/`.', '']
files.forEach(f => {
  const name = f.replace(/\.md$/, '')
  lines.push('- [' + name + '](../modes/' + f + ')')
})
lines.push('')

const out = path.join(ROOT, '.ai/agents/modes-index.md')
const result = writeTextIdempotent(out, lines.join('\n'))
info(result.changed ? 'modes-index.md atualizado (' + files.length + ' modos)' : 'modes-index.md ja atualizado')