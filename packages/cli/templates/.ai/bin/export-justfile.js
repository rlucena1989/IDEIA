#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('export-justfile.js', 'node .ai/bin/export-justfile.js [--out <file>]', [
    '--out <file>  Output path (default: justfile)',
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

const order = ['dev', 'start', 'build', 'lint', 'lint:fix', 'typecheck', 'test', 'test:watch', 'test:cov', 'test:e2e', 'commitlint']
const lines = []

for (const name of order) {
  if (scripts[name]) {
    const safe = scripts[name].replace(/\\/g, '\\\\')
    lines.push(name + ':')
    lines.push('\t' + safe)
    lines.push('')
  }
}

const aiScripts = Object.keys(scripts).filter(k => k.startsWith('ai:')).sort()
if (aiScripts.length > 0) {
  lines.push('# AI DevKit scripts')
  for (const name of aiScripts) {
    lines.push(name.replace(':', '-') + ':')
    lines.push('\t' + scripts[name])
    lines.push('')
  }
}

const allNames = order.concat(aiScripts).filter(n => scripts[n])
if (allNames.length > 0) {
  lines.push('ci: ' + allNames.join(' '))
  lines.push('')
}

const out = path.join(ROOT, args.out || 'justfile')
fs.writeFileSync(out, lines.join('\n'), 'utf-8')
info('justfile generated with ' + Object.keys(scripts).length + ' tasks')