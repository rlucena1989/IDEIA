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
const headerPattern = /^###\s+(AIDK-\w+-\d+)\s+[—\-]\s+(.+)$/gm
let headerMatch
while ((headerMatch = headerPattern.exec(content)) !== null) {
  const code = headerMatch[1]
  const title = headerMatch[2].trim()

  const blockStart = headerMatch.index
  const nextHeader = content.indexOf('\n### ', blockStart + 1)
  const blockEnd = nextHeader === -1 ? content.length : nextHeader
  const block = content.slice(blockStart, blockEnd)

  const descMatch = block.match(/\*\*Descrição\*\*\s*:\s*(.+)/)
  const sevMatch = block.match(/\*\*Severidade\*\*\s*:\s*(.+)/)
  const actionMatch = block.match(/\*\*Ação\*\*\s*:\s*(.+)/)

  errors.push({
    code,
    title,
    description: descMatch ? descMatch[1].trim() : title,
    severity: sevMatch ? sevMatch[1].trim().toLowerCase() : 'error',
    action: actionMatch ? actionMatch[1].trim() : 'PENDING_ACTION'
  })
}

if (errors.length === 0) {
  console.warn('WARN: nenhuma entrada de erro extraida de ' + path.relative(ROOT, catalogPath) + ' — verifique se o catalogo usa o formato ### AIDK-CODE — descricao')
}

const mapPath = path.join(ROOT, '.ai/errors/error-flow-map.md')
const lines = [
  '# Error Flow Map',
  '', 'Generated: ' + new Date().toISOString(),
  'Total errors in catalog: ' + errors.length, '',
  '| Code | Title | Description | Severity | Action |',
  '|------|-------|-------------|----------|--------|',
]

for (const e of errors) {
  lines.push('| ' + e.code + ' | ' + e.title + ' | ' + e.description + ' | ' + e.severity + ' | ' + e.action + ' |')
}

lines.push('', '## Stats', '')
const bySev = {}
for (const e of errors) {
  bySev[e.severity] = (bySev[e.severity] || 0) + 1
}
for (const [sev, count] of Object.entries(bySev).sort()) {
  lines.push('- ' + sev + ': ' + count)
}
lines.push('')

fs.mkdirSync(path.dirname(mapPath), { recursive: true })
fs.writeFileSync(mapPath, lines.join('\n'), 'utf-8')
info('Error flow map: ' + errors.length + ' errors from catalog mapped')
