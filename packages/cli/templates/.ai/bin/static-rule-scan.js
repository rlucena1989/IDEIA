#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, warn, fail, printHelp, parseArgs, readTextSafe } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('static-rule-scan.js', 'node .ai/bin/static-rule-scan.js [--laws <file>] [--json]', [
    '--laws <file>  Laws file (default: .ai/laws.yaml)',
    '--json         Output as JSON',
    '--help          Show this help'
  ])
  process.exit(0)
}

const lawsFile = path.join(ROOT, args.laws || '.ai/laws.yaml')
const lawsContent = readTextSafe(lawsFile) || ''

const rules = []
if (lawsContent.includes('contract_first')) rules.push({ id: 'contract-first', desc: 'Todo DTO deve ser validado com Contract.pre()', check: 'contract_pre' })
if (lawsContent.includes('AppError')) rules.push({ id: 'use-app-error', desc: 'Erros de negocio devem usar AppError', check: 'app_error' })
if (lawsContent.includes('any sem justificativa')) rules.push({ id: 'no-any', desc: 'Proibido uso de any sem justificativa documentada', check: 'no_any' })
if (lawsContent.includes('80%')) rules.push({ id: 'test-coverage', desc: 'Cobertura de testes minima: 80%', check: 'coverage' })
if (lawsContent.includes('JSDoc')) rules.push({ id: 'jsdoc', desc: 'Toda funcao publica deve ter JSDoc', check: 'jsdoc' })
if (lawsContent.includes('dominio nao pode importar infraestrutura')) rules.push({ id: 'domain-boundary', desc: 'Camada de dominio nao pode importar infraestrutura', check: 'domain_boundary' })

const srcDir = path.join(ROOT, 'src')
const violations = []

function scanFiles(dir, callback) {
  if (!fs.existsSync(dir)) return
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') { scanFiles(full, callback); continue }
    if (!e.name.endsWith('.ts') && !e.name.endsWith('.tsx')) continue
    const content = fs.readFileSync(full, 'utf-8')
    callback(full, content)
  }
}

const results = {}
rules.forEach(r => results[r.id] = { rule: r.desc, passed: 0, failed: 0, details: [] })

scanFiles(srcDir, (filePath, content) => {
  const rel = path.relative(ROOT, filePath)

  if (rules.find(r => r.id === 'domain_boundary')) {
    if (rel.includes(path.sep + 'domain' + path.sep) && /from\s+['"]\.\.\/(\.\.\/)?infrastructure/.test(content)) {
      results['domain-boundary'].failed++
      results['domain-boundary'].details.push(rel + ': domain imports infrastructure')
    } else if (rel.includes(path.sep + 'domain' + path.sep)) {
      results['domain-boundary'].passed++
    }
  }

  if (rules.find(r => r.id === 'no_any')) {
    const anyUses = (content.match(/\bany\b(?!\s*=\s*['"]|\s*\))/g) || []).length
    if (anyUses > 0) {
      results['no-any'].failed++
      results['no-any'].details.push(rel + ': ' + anyUses + ' use(s) of any')
    } else {
      results['no-any'].passed++
    }
  }

  if (rules.find(r => r.id === 'app_error') && !rel.includes('.spec.')) {
    const hasThrow = /throw\s+new\s+(?!AppError)/g.test(content) && /throw\s+new\s+Error/.test(content)
    if (hasThrow) {
      results['use-app-error'].failed++
      results['use-app-error'].details.push(rel + ': uses throw new Error instead of AppError')
    } else {
      results['use-app-error'].passed++
    }
  }
}
)

if (args.json) {
  console.log(JSON.stringify({ rules: results, timestamp: new Date().toISOString() }, null, 2))
  process.exit()
}

let totalViolations = 0
for (const [id, r] of Object.entries(results)) {
  const total = r.passed + r.failed
  if (total === 0) continue
  const status = r.failed === 0 ? 'PASS' : 'FAIL'
  info('[' + status + '] ' + r.rule + ' (' + r.passed + '/' + total + ' files)')
  if (r.failed > 0) {
    r.details.slice(0, 5).forEach(d => warn('  ' + d))
    if (r.details.length > 5) warn('  ... and ' + (r.details.length - 5) + ' more')
    totalViolations++
  }
}

if (totalViolations > 0) fail(totalViolations + ' rule(s) violated')
else info('All architectural rules passed')
process.exitCode = totalViolations > 0 ? 1 : 0