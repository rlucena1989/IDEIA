#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('errors-map.js', 'node .ai/bin/errors-map.js [--catalog <file>]', [
    '--catalog <file>  Error catalog (default: .ai/errors/error-catalog.md)',
    '--help             Show this help'
  ])
  process.exit(0)
}

const catalogPath = path.join(ROOT, args.catalog || '.ai/errors/error-catalog.md')
if (!fs.existsSync(catalogPath)) {
  info('No error catalog found — run setup.js first')
  process.exit(0)
}

const content = fs.readFileSync(catalogPath, 'utf-8')

const errors = []
const pattern = /\|\s*(\w+)\s*\|\s*(\d{3})\s*\|\s*([^|]+)/g
let m
while ((m = pattern.exec(content)) !== null) {
  errors.push({ code: m[1].trim(), http: parseInt(m[2]), description: m[3].trim() })
}

const mapPath = path.join(ROOT, '.ai/errors/error-flow-map.md')
const lines = [
  '# Error Flow Map',
  '', 'Generated: ' + new Date().toISOString(),
  'Total errors in catalog: ' + errors.length, '',
  '| HTTP | Code | Description | Use Case | Severity |',
  '|------|------|-------------|----------|----------|',
]

for (const e of errors) {
  const severity = e.http >= 500 ? 'critical' : e.http >= 400 ? 'warning' : 'info'
  lines.push('| ' + e.http + ' | ' + e.code + ' | ' + e.description + ' | PENDING_ACTION | ' + severity + ' |')
}

lines.push('', '## Stats', '')
const byRange = { '4xx': 0, '5xx': 0 }
for (const e of errors) {
  if (e.http >= 400 && e.http < 500) byRange['4xx']++
  if (e.http >= 500) byRange['5xx']++
}
lines.push('- 4xx errors: ' + byRange['4xx'])
lines.push('- 5xx errors: ' + byRange['5xx'])
lines.push('')

fs.mkdirSync(path.dirname(mapPath), { recursive: true })
fs.writeFileSync(mapPath, lines.join('\n'), 'utf-8')
info('Error flow map: ' + errors.length + ' errors from catalog mapped')