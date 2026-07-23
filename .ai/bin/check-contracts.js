#!/usr/bin/env node
'use strict'
const { execFileSync } = require('child_process')
const path = require('path')
const { ROOT, info, warn, fail, printHelp, parseArgs, writeTextIdempotent } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('check-contracts.js', 'node .ai/bin/check-contracts.js [--strict] [--json] [--report]', [
    '--strict   Exit with error on warnings too',
    '--json     Output results as JSON',
    '--report   Generate Markdown report in .ai/reports/',
    '--help      Show this help'
  ])
  process.exit(0)
}

const scripts = ['openapi-validate.js', 'asyncapi-validate.js', 'graphql-validate.js']
const results = []
let hasError = false

for (const script of scripts) {
  const scriptPath = path.join(__dirname, script)
  try {
    const output = execFileSync(process.execPath, [scriptPath], { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] })
    results.push({ script, status: 'pass', output: output.trim() })
    info(script + ': OK')
    if (!args.json) console.log(output.trim())
  } catch (err) {
    hasError = true
    const stderr = (err.stderr || '').toString().trim()
    results.push({ script, status: 'fail', error: stderr || err.message })
    warn(script + ': FAIL')
  }
}

const health = {
  timestamp: new Date().toISOString(),
  total: scripts.length,
  passed: results.filter(r => r.status === 'pass').length,
  failed: results.filter(r => r.status === 'fail').length,
  results
}

if (args.json) {
  console.log(JSON.stringify(health, null, 2))
}

if (args.report) {
  const lines = [
    '# Contract Validation Report',
    '',
    'Generated: ' + health.timestamp,
    '',
    '## Summary',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    '| Validators | ' + health.total + ' |',
    '| Passed | ' + health.passed + ' |',
    '| Failed | ' + health.failed + ' |',
    '| Status | ' + (health.failed === 0 ? '✅ PASS' : '❌ FAIL') + ' |',
    '',
    '## Results',
    '',
  ]
  for (const r of results) {
    lines.push('### ' + r.script + ' — ' + (r.status === 'pass' ? '✅' : '❌'))
    lines.push('')
    lines.push('```')
    lines.push((r.output || r.error || '').trim())
    lines.push('```')
    lines.push('')
  }
  const reportPath = path.join(ROOT, '.ai/reports/contract-validation.md')
  writeTextIdempotent(reportPath, lines.join('\n'))
  info('Report: .ai/reports/contract-validation.md')
}

const exitCode = args.strict ? (health.failed > 0 ? 1 : 0) : (hasError ? 1 : 0)
process.exitCode = exitCode

if (health.failed > 0 && args.strict) {
  fail('Strict mode: ' + health.failed + ' validator(s) failed')
}