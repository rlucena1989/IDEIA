#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, warn, fail, printHelp, parseArgs, readTextSafe } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('check-boundaries.js', 'node .ai/bin/check-boundaries.js [--modules <file>] [--json]', [
    '--modules <file>  Modules definition (default: .ai/modules.yaml)',
    '--json            Output results as JSON',
    '--help             Show this help'
  ])
  process.exit(0)
}

const modulesFile = path.join(ROOT, args.modules || '.ai/modules.yaml')
const allowedDeps = {}

if (fs.existsSync(modulesFile)) {
  const yaml = require('js-yaml')
  const doc = yaml.load(fs.readFileSync(modulesFile, 'utf-8'))
  if (doc && Array.isArray(doc)) {
    for (const entry of doc) {
      if (entry.name) {
        allowedDeps[entry.name] = new Set(entry.dependsOn || [])
      }
    }
  }
}

if (!fs.existsSync(path.join(ROOT, 'packages'))) {
  info('No packages found in packages/')
  process.exit(0)
}

const modules = fs.readdirSync(path.join(ROOT, 'packages')).filter(d => fs.statSync(path.join(ROOT, 'packages', d)).isDirectory())
const imports = {}

for (const mod of modules) {
  imports[mod] = { internal: new Set(), external: new Set(), domain: 0, infra: 0, app: 0 }
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name)
      if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') { walk(full); continue }
      if (!e.name.endsWith('.ts') && !e.name.endsWith('.tsx')) continue
      const content = fs.readFileSync(full, 'utf-8')
      if (full.includes(path.sep + 'domain' + path.sep)) imports[mod].domain++
      if (full.includes(path.sep + 'infrastructure' + path.sep)) imports[mod].infra++
      if (full.includes(path.sep + 'application' + path.sep)) imports[mod].app++
      const im = content.matchAll(/from\s+['"]\.\.?\/([^'"]+)['"]/g)
      for (const i of im) {
        const p = i[1]
        for (const other of modules) {
          if (other === mod) continue
          if (p.startsWith(other + '/') || p.startsWith('../' + other + '/')) {
            imports[mod].internal.add(other)
          }
        }
      }
    }
  }
  walk(path.join(ROOT, 'packages', mod, 'src'))
}

const violations = []
for (const [mod, data] of Object.entries(imports)) {
  for (const dep of data.internal) {
    const allowed = allowedDeps[mod]?.has(dep)
    if (Object.keys(allowedDeps).length > 0 && !allowed) {
      violations.push({ module: mod, dependsOn: dep, allowed: !!allowedDeps[mod]?.size })
    }
  }
}

if (args.json) {
  console.log(JSON.stringify({ modules, imports, violations, totalModules: modules.length, totalViolations: violations.length }, null, 2))
  process.exitCode = violations.length > 0 ? 1 : 0
  process.exit()
}

info('Modules: ' + modules.length + ' — ' + modules.join(', '))
for (const [mod, data] of Object.entries(imports)) {
  const layers = []
  if (data.domain) layers.push('domain(' + data.domain + ')')
  if (data.app) layers.push('app(' + data.app + ')')
  if (data.infra) layers.push('infra(' + data.infra + ')')
  const deps = data.internal.size > 0 ? ' -> [' + [...data.internal].join(', ') + ']' : ''
  info('  ' + mod + ': ' + (layers.join('/') || 'empty') + deps)
}

if (violations.length > 0) {
  violations.forEach(v => warn('Boundary violation: ' + v.module + ' -> ' + v.dependsOn + (v.allowed ? ' (allowed)' : ' (NOT in modules.yaml)')))
  fail(violations.length + ' boundary violation(s) found')
  process.exit(1)
}
info('No boundary violations. All cross-module imports are declared in modules.yaml.')