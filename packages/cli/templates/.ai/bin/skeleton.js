#!/usr/bin/env node
// skeleton.js -- escaneia src/ e gera .ai/docs/project-skeleton.md
'use strict'
const fs   = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname, '../..')

function scanDir(dir, depth) {
  depth = depth || 0
  if (!fs.existsSync(dir)) return []
  const items = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules','.git','dist','coverage'].includes(e.name)) continue
    const full   = path.join(dir, e.name)
    const indent = '  '.repeat(depth)
    if (e.isDirectory()) {
      items.push(indent + e.name + '/')
      items.push(...scanDir(full, depth + 1))
    } else {
      items.push(indent + e.name)
    }
  }
  return items
}

const lines = [
  '# Project Skeleton',
  '> Gerado em: ' + new Date().toLocaleString('pt-BR'),
  '',
  '## src/',
  ...scanDir(path.join(ROOT, 'src')),
  '',
  '## .ai/',
  ...scanDir(path.join(ROOT, '.ai'))
]

const out = path.join(ROOT, '.ai/docs/project-skeleton.md')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, lines.join('\n'), 'utf-8')
console.log('skeleton.js: .ai/docs/project-skeleton.md gerado')