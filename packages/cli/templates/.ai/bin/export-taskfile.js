#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('export-taskfile.js', 'node .ai/bin/export-taskfile.js [--out <file>]', [
    '--out <file>  Output path (default: Taskfile.yml)',
    '--help         Show this help'
  ])
  process.exit(0)
}

const pkgPath = path.join(ROOT, 'package.json')
if (!fs.existsSync(pkgPath)) {
  console.error('package.json not found')
  process.exit(1)
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
const scripts = pkg.scripts || {}

const categories = {
  dev: ['dev', 'start'],
  build: ['build'],
  lint: ['lint', 'lint:fix', 'typecheck'],
  test: ['test', 'test:watch', 'test:cov', 'test:e2e'],
  ai: Object.keys(scripts).filter(k => k.startsWith('ai:')),
  deploy: ['commitlint']
}

function categorize(name) {
  if (categories.ai.includes(name)) return 'ai'
  for (const [cat, names] of Object.entries(categories)) {
    if (cat === 'ai') continue
    if (names.includes(name)) return cat
  }
  return 'other'
}

const grouped = {}
for (const [name, cmd] of Object.entries(scripts)) {
  const cat = categorize(name)
  if (!grouped[cat]) grouped[cat] = []
  const safe = cmd.replace(/(["])/g, '\\$1')
  grouped[cat].push({ name, safe })
}

const lines = ["version: '3'", '']
const label = { dev: 'Development', build: 'Build', lint: 'Lint & TypeCheck', test: 'Tests', ai: 'AI DevKit', deploy: 'Deploy', other: 'Other' }

for (const cat of ['dev', 'build', 'lint', 'test', 'ai', 'deploy', 'other']) {
  const items = grouped[cat]
  if (!items || items.length === 0) continue
  lines.push('  # ' + (label[cat] || cat))
  for (const { name, safe } of items) {
    lines.push('  ' + name + ':')
    lines.push('    cmds:')
    lines.push('      - ' + safe)
  }
  lines.push('')
}

const out = path.join(ROOT, args.out || 'Taskfile.yml')
fs.writeFileSync(out, lines.join('\n'), 'utf-8')
info('Taskfile.yml generated with ' + Object.keys(scripts).length + ' tasks')