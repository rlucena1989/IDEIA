#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, warn, printHelp, parseArgs } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('frontend-docs.js', 'node .ai/bin/frontend-docs.js [--src <dir>] [--out <file>]', [
    '--src <dir>    Source directory to scan (default: src/)',
    '--out <file>   Output path (default: .ai/docs/frontend-catalog.md)',
    '--help          Show this help'
  ])
  process.exit(0)
}

const srcDir = path.join(ROOT, args.src || 'src')
if (!fs.existsSync(srcDir)) {
  warn('Source directory not found: ' + srcDir)
  process.exit(0)
}

const extensions = ['.tsx', '.jsx', '.vue', '.svelte']
const components = {}

function walk(dir, category) {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
      const cat = category ? category + '/' + e.name : e.name
      walk(full, cat)
      continue
    }
    if (!extensions.some(ext => e.name.endsWith(ext))) continue
    const cat = category || 'root'
    if (!components[cat]) components[cat] = []
    try {
      const content = fs.readFileSync(full, 'utf-8')
      const name = e.name.replace(/\.[^.]+$/, '')
      const isExported = /export\s+(default\s+)?(function|class|const)\s+\w/.test(content)
      const props = []
      const propMatch = content.match(/interface\s+(\w*Props)/)
      const propName = propMatch ? propMatch[1] : null
      if (propName) {
        const propBlock = content.split('interface ' + propName)[1]?.split('}')[0]
        if (propBlock) {
          const fieldRe = /(\w+)\??\s*:\s*([^;\n]+)/g
          let fm
          while ((fm = fieldRe.exec(propBlock)) !== null) {
            props.push({ name: fm[1], type: fm[2].trim() })
          }
        }
      }
      const hasState = /useState|useReducer|reactive|ref\(/.test(content)
      const hasEffect = /useEffect|onMounted|watch\(/.test(content)
      components[cat].push({ name, file: e.name, exported: isExported, hasState, hasEffect, props })
    } catch (err) {
      components[cat].push({ name: e.name, file: e.name, exported: false, error: err.message })
    }
  }
}

const commonDirs = ['components', 'pages', 'views', 'layouts', 'ui']
let found = false
for (const dir of commonDirs) {
  const full = path.join(srcDir, dir)
  if (fs.existsSync(full)) { walk(full, dir); found = true }
}
if (!found) {
  walk(srcDir, '')
}

const total = Object.values(components).reduce((s, arr) => s + arr.length, 0)
if (total === 0) {
  info('No frontend components found in ' + srcDir)
  process.exit(0)
}

const lines = [
  '# Frontend Component Catalog',
  '',
  'Generated: ' + new Date().toISOString(),
  'Source: ' + path.relative(ROOT, srcDir),
  'Components found: ' + total,
  ''
]

const categories = Object.keys(components).sort()
for (const cat of categories) {
  lines.push('## ' + (cat === 'root' ? 'Root' : cat))
  lines.push('')
  lines.push('| Component | File | Exported | State | Effects | Props |')
  lines.push('|-----------|------|----------|-------|---------|-------|')
  for (const c of components[cat]) {
    const exp = c.exported ? 'Yes' : 'No'
    const state = c.hasState ? 'Yes' : '-'
    const effect = c.hasEffect ? 'Yes' : '-'
    const propStr = c.props.length > 0 ? c.props.map(p => p.name + ':' + p.type).join(', ') : '-'
    lines.push('| ' + c.name + ' | ' + c.file + ' | ' + exp + ' | ' + state + ' | ' + effect + ' | ' + propStr + ' |')
  }
  lines.push('')
  for (const c of components[cat]) {
    if (c.error) {
      lines.push('- **' + c.name + '**: parse error — ' + c.error)
    }
  }
  if (components[cat].some(c => c.error)) lines.push('')
}

const out = path.join(ROOT, args.out || '.ai/docs/frontend-catalog.md')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, lines.join('\n'), 'utf-8')
info('Frontend catalog generated: ' + out + ' (' + total + ' components, ' + categories.length + ' categories)')