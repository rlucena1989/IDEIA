#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('export-windsurf-rules.js', 'node .ai/bin/export-windsurf-rules.js [--out <file>]', [
    '--out <file>  Output path (default: .windsurfrules)',
    '--help         Show this help'
  ])
  process.exit(0)
}

const rulesDir = path.join(ROOT, '.ai/rules')
if (!fs.existsSync(rulesDir)) {
  console.error('.ai/rules/ directory not found')
  process.exit(1)
}

const ruleFiles = fs.readdirSync(rulesDir).filter(f => f.endsWith('.md')).sort()
if (ruleFiles.length === 0) {
  info('No .md rule files found in .ai/rules/')
  process.exit(0)
}

const manifest = ['# Windsurf Rules', '', 'Auto-generated from .ai/rules/ by ai-devkit.', '']

for (const file of ruleFiles) {
  const content = fs.readFileSync(path.join(rulesDir, file), 'utf-8')
  const section = file.replace(/\.md$/, '')
  manifest.push('# Section: ' + section)
  manifest.push('')
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
      manifest.push('- ' + line.replace(/^[-*]\s*/, '').trim())
    } else if (line.startsWith('#')) {
      manifest.push(line)
    }
  }
  manifest.push('')
}

const out = path.join(ROOT, args.out || '.windsurfrules')
fs.writeFileSync(out, manifest.join('\n'), 'utf-8')
info('.windsurfrules generated from ' + ruleFiles.length + ' rule file(s)')