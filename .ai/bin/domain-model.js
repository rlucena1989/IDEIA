#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, slugify } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
const name = args._.join(' ')

if (args.help || !name) {
  printHelp('domain-model.js', 'node .ai/bin/domain-model.js <module-name>', ['--help  Mostra esta ajuda'])
  process.exit(args.help ? 0 : 1)
}

const slug = slugify(name)
const dir = path.join(ROOT, '.ai/domain', slug)
fs.mkdirSync(dir, { recursive: true })
const now = new Date().toISOString()

function header(title) {
  return '# ' + title + ': ' + name + '\n\nGenerated: ' + now + '\n'
}

const files = {
  'model.md': header('Domain Model') + [
    '\n## Overview', 'Describe the domain purpose and bounded context.',
    '\n## Ubiquitous Language', '| Term | Definition |\n|------|------------|',
    '\n## Core Entities', '-', '\n## Value Objects', '-', '\n## Aggregates', '-', '\n## Invariants', '-',
    '\n## Domain Events', '-', '\n## Relationships', '```mermaid\nerDiagram\n  PENDING_ACTION\n```'
  ].join('\n'),

  'entities.md': header('Entities') + [
    '\n## Entity Template',
    '| Entity | Description | Key Fields | Invariants | Aggregate Root |',
    '|--------|-------------|------------|------------|----------------|',
    '| PENDING_ACTION | | | | No |'
  ].join('\n'),

  'value-objects.md': header('Value Objects') + [
    '| Value Object | Type | Validation | Immutable |',
    '|--------------|------|------------|-----------|',
    '| PENDING_ACTION | | | Yes |'
  ].join('\n'),

  'aggregates.md': header('Aggregates') + [
    '| Aggregate Root | Child Entities | Transaction Boundary | Repository |',
    '|----------------|----------------|---------------------|------------|',
    '| PENDING_ACTION | | Strong | Yes |'
  ].join('\n'),

  'invariants.md': header('Invariants') + [
    '| Invariant | Enforced In | Type | Error Code |',
    '|-----------|-------------|------|------------|',
    '| PENDING_ACTION | Entity | Always | VALIDATION_ERROR |'
  ].join('\n'),

  'domain-events.md': header('Domain Events') + [
    '| Event | Trigger | Payload | Consumers |',
    '|-------|---------|---------|-----------|',
    '| PENDING_ACTION | | | |'
  ].join('\n'),

  'relationships.md': header('Relationships') + [
    '```mermaid', 'erDiagram',
    name + ' ||--o{ Child : has',
    '```'
  ].join('\n')
}

let count = 0
for (const [filename, content] of Object.entries(files)) {
  const fp = path.join(dir, filename)
  if (!fs.existsSync(fp)) { fs.writeFileSync(fp, content, 'utf-8'); count++ }
}
info('Domain model generated: ' + count + ' files in .ai/domain/' + slug + '/')