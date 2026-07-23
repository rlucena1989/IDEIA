#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, slugify } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
const name = args._.join(' ')

if (args.help || !name) {
  printHelp('feature-blueprint.js', 'node .ai/bin/feature-blueprint.js <nome da feature>', ['--help  Mostra esta ajuda'])
  process.exit(args.help ? 0 : 1)
}

const slug = slugify(name)
const dir = path.join(ROOT, '.ai/features', slug)
fs.mkdirSync(dir, { recursive: true })

const files = {
  'blueprint.md': [
    '# Feature Blueprint: ' + name,
    '', 'Generated: ' + new Date().toISOString(), '',
    '## Objetivo', 'Descreva o objetivo da feature.', '',
    '## Contexto de negocio', '-', '',
    '## Modulos afetados', '-', '',
    '## Casos de uso', '-', '',
    '## Regras de negocio', '-', '',
    '## Permissoes', '-', '',
    '## Erros esperados', '- Consulte .ai/errors/error-catalog.md', '',
    '## Criterios de aceite', '- [ ]', ''
  ].join('\n'),
  'requirements.md': [
    '# Requirements: ' + name,
    '', '## Functional', '-', '', '## Non-Functional', '-', ''
  ].join('\n'),
  'permissions.md': [
    '# Permissions: ' + name,
    '', '| Role | Create | Read | Update | Delete |',
    '|------|--------|------|--------|--------|',
    '| SUPER_ADMIN | S | S | S | S |',
    '| ADMIN | N | S | S | N |',
    '| USER | N | S | N | N |', ''
  ].join('\n'),
  'error-flow.md': [
    '# Error Flow: ' + name,
    '', '| Error Code | HTTP | Condition |',
    '|------------|------|-----------|',
    '| VALIDATION_ERROR | 400 | Invalid input |',
    '| NOT_FOUND | 404 | Resource not found |',
    '| FORBIDDEN | 403 | Insufficient permissions |',
    '', 'See .ai/errors/error-catalog.md for full catalog.', ''
  ].join('\n')
}

let count = 0
for (const [filename, content] of Object.entries(files)) {
  const filePath = path.join(dir, filename)
  if (!fs.existsSync(filePath)) { fs.writeFileSync(filePath, content, 'utf-8'); count++ }
}
info('Feature blueprint generated: ' + count + ' files in .ai/features/' + slug + '/')