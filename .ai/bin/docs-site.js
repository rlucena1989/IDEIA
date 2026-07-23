#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, writeTextIdempotent } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('docs-site.js', 'node .ai/bin/docs-site.js [--out <dir>]', [
    '--out <dir>  Output directory (default: .ai/site/)',
    '--help        Show this help'
  ])
  process.exit(0)
}

const outDir = path.join(ROOT, args.out || '.ai/site')
fs.mkdirSync(outDir, { recursive: true })

const adrDir = path.join(ROOT, '.ai/architecture/adr')
const adrs = fs.existsSync(adrDir) ? fs.readdirSync(adrDir).filter(f => f.endsWith('.md') && f !== 'README.md').sort() : []

const docsDir = path.join(ROOT, '.ai/docs')
const docs = fs.existsSync(docsDir) ? fs.readdirSync(docsDir).filter(f => f.endsWith('.md')).sort() : []

const adrItems = adrs.map(f => '<li><a href="#">' + f.replace(/\.md$/, '') + '</a></li>').join('')
const docItems = docs.map(f => '<li><a href="../docs/' + f + '">' + f.replace(/\.md$/, '') + '</a></li>').join('')

const nav = [
  '<a href="#adrs">ADRs (' + adrs.length + ')</a> |',
  '<a href="#docs">Docs (' + docs.length + ')</a> |',
  '<a href="../contracts/">Contracts</a> |',
  '<a href="../architecture/">Architecture</a>'
].join(' ')

const html = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '  <meta charset="UTF-8">',
  '  <meta name="viewport" content="width=device-width,initial-scale=1">',
  '  <title>ai-devkit Docs</title>',
  '  <style>',
  '    body{font-family:system-ui,sans-serif;max-width:960px;margin:0 auto;padding:1rem;color:#1a1a1a;background:#f8f8f8}',
  '    h1{border-bottom:3px solid #4a90d9;padding-bottom:.5rem}',
  '    nav a{margin-right:1rem;color:#4a90d9;text-decoration:none}',
  '    ul{line-height:1.8}',
  '    footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #ccc;font-size:.85rem;color:#666}'
  '  </style>',
  '</head>',
  '<body>',
  '  <h1>ai-devkit — Documentation</h1>',
  '  <nav>' + nav + '</nav>',
  
  '  <h2 id="adrs">Architecture Decision Records</h2>',
  '  <ul>' + (adrItems || '<li>No ADRs found in .ai/architecture/adr/</li>') + '</ul>',
  
  '  <h2 id="docs">Generated Documentation</h2>',
  '  <ul>' + (docItems || '<li>No docs in .ai/docs/ — run skeleton/bridge to generate</li>') + '</ul>',
  
  '  <footer>',
  '    <p>Generated: ' + new Date().toISOString() + ' by <code>npm run ai:docs:site</code></p>',
  '    <p>ADRs: ' + adrs.length + ' | Docs: ' + docs.length + '</p>',
  '  </footer>',
  '</body></html>',
  ''
].join('\n')

writeTextIdempotent(path.join(outDir, 'index.html'), html)
info('Documentation site generated: ' + outDir + '/index.html')
info('ADRs: ' + adrs.length + ', Docs: ' + docs.length)