#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, writeTextIdempotent, slugify } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
const title = args._.join(' ')

if (args.help || !title) {
  printHelp('adr-new.js', 'node .ai/bin/adr-new.js <titulo da decisao>', ['--help  Mostra esta ajuda'])
  process.exit(args.help ? 0 : 1)
}

const dir = path.join(ROOT, '.ai/architecture/adr')
fs.mkdirSync(dir, { recursive: true })
const existing = fs.readdirSync(dir).filter(f => /^\d{4}-/.test(f))
const next = existing.length + 1
const number = String(next).padStart(4, '0')
const slug = slugify(title)
const today = new Date().toISOString().split('T')[0]

const content = [
  '# ADR-' + number + ' -- ' + title,
  '',
  '## Status: proposed | Data: ' + today,
  '',
  '## Contexto',
  '[Por que esta decisao foi necessaria?]',
  '',
  '## Decisao',
  '[O que foi decidido?]',
  '',
  '## Consequencias',
  '- Positivo: [beneficio]',
  '- Negativo: [custo]',
  '',
  '## Alternativas consideradas',
  '- [Alternativa]: descartada por [motivo]',
  ''
].join('\n')

const out = path.join(dir, number + '-' + slug + '.md')
writeTextIdempotent(out, content)
info('ADR criada: .ai/architecture/adr/' + number + '-' + slug + '.md')