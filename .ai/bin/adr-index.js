#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, writeTextIdempotent } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('adr-index.js', 'node .ai/bin/adr-index.js', ['--help  Mostra esta ajuda'])
  process.exit(0)
}

const dir = path.join(ROOT, '.ai/architecture/adr')
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'README.md').sort() : []

const lines = ['# ADR Index', '', '| ADR | Arquivo |', '|-----|---------|']
files.forEach(f => lines.push('| ' + f.replace(/\.md$/, '') + ' | [' + f + '](./' + f + ') |'))
lines.push('')

writeTextIdempotent(path.join(dir, 'README.md'), lines.join('\n'))
info('.ai/architecture/adr/README.md atualizado com ' + files.length + ' ADR(s)')