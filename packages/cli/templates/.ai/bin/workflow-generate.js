#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, slugify } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
const name = args._.join(' ')

if (args.help || !name) {
  printHelp('workflow-generate.js', 'node .ai/bin/workflow-generate.js <workflow-name>', [
    '--help  Mostra esta ajuda'
  ])
  process.exit(args.help ? 0 : 1)
}

const slug = slugify(name)
const dir = path.join(ROOT, '.ai/workflows')
fs.mkdirSync(dir, { recursive: true })

const now = new Date().toISOString()

const yaml = [
  'workflow:',
  '  name: ' + name,
  '  initialState: draft',
  '  states:',
  '    - name: draft',
  '      transitions:',
  '        - to: pending_review',
  '          event: submit',
  '    - name: pending_review',
  '      transitions:',
  '        - to: approved',
  '          event: approve',
  '          guard: hasPermission("admin")',
  '        - to: rejected',
  '          event: reject',
  '    - name: approved',
  '      final: true',
  '    - name: rejected',
  '      final: true',
  ''
].join('\n')

const diagram = [
  '# Workflow: ' + name,
  '', 'Generated: ' + now, '',
  '## State Machine', ''
  '```mermaid', 'stateDiagram-v2',
  '  [*] --> draft',
  '  draft --> pending_review: submit',
  '  pending_review --> approved: approve',
  '  pending_review --> rejected: reject',
  '  approved --> [*]',
  '  rejected --> [*]',
  '```', ''
  '## States', ''
  '| State | Description | Next States |'
  '|-------|-------------|-------------|',
  '| draft | Initial creation | pending_review |',
  '| pending_review | Awaiting review | approved, rejected |',
  '| approved | Final | — |',
  '| rejected | Final | — |',
  '', '## Actors', '- admin: can approve/reject', ''
  'Machine definition: .ai/workflows/' + slug + '.workflow.yaml'
].join('\n')

fs.writeFileSync(path.join(dir, slug + '.workflow.yaml'), yaml, 'utf-8')
fs.writeFileSync(path.join(dir, slug + '.diagram.md'), diagram, 'utf-8')

info('Workflow generated: .ai/workflows/' + slug + '.workflow.yaml + diagram')