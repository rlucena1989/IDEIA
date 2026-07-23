#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, slugify } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
const name = args._.join(' ')

if (args.help || !name) {
  printHelp('usecase-pipeline.js', 'node .ai/bin/usecase-pipeline.js <feature-name>', ['--help  Mostra esta ajuda'])
  process.exit(args.help ? 0 : 1)
}

const slug = slugify(name)
const dir = path.join(ROOT, '.ai/pipelines')
fs.mkdirSync(dir, { recursive: true })

const steps = [
  { step: 1, phase: 'Discovery', action: 'Define scope and acceptance criteria', files: '.ai/features/' + slug + '/blueprint.md', criteria: 'Feature description is unambiguous', test: 'Review' },
  { step: 2, phase: 'Domain', action: 'Model entities, value objects, and aggregates', files: '.ai/domain/' + slug + '/model.md', criteria: 'All entities identified', test: 'Review' },
  { step: 3, phase: 'Contract', action: 'Define API contract and DTOs', files: 'src/modules/' + slug + '/application/dtos/', criteria: 'DTOs validated with Contract.pre()', test: 'Unit' },
  { step: 4, phase: 'Implementation', action: 'Create entity class with invariants', files: 'src/modules/' + slug + '/domain/entities/', criteria: 'Invariants enforced in constructor', test: 'Unit' },
  { step: 5, phase: 'Implementation', action: 'Create repository interface', files: 'src/modules/' + slug + '/domain/repositories/', criteria: 'Interface defines all CRUD operations', test: 'Integration' },
  { step: 6, phase: 'Implementation', action: 'Create use case', files: 'src/modules/' + slug + '/application/usecases/', criteria: 'Use case validates input with Contract.pre()', test: 'Unit' },
  { step: 7, phase: 'Implementation', action: 'Create controller with routes', files: 'src/modules/' + slug + '/presentation/controllers/', criteria: 'Routes match OpenAPI contract', test: 'E2E' },
  { step: 8, phase: 'Quality', action: 'Write error scenario tests', files: 'tests/', criteria: 'All error codes from error-catalog tested', test: 'Unit' },
  { step: 9, phase: 'Quality', action: 'Write edge case tests', files: 'tests/', criteria: 'Boundary values handled correctly', test: 'Unit' },
  { step: 10, phase: 'Delivery', action: 'Update changelog and release notes', files: 'docs/auto/changelog.md', criteria: 'Release notes generated', test: 'Review' }
]

const lines = [
  '# Pipeline: ' + name,
  '', 'Generated: ' + new Date().toISOString(), '',
  '## Steps', '',
  '| # | Phase | Action | Files | Criteria | Test | Done |',
  '|---|-------|--------|-------|----------|------|------|',
]

for (const s of steps) {
  lines.push('| ' + s.step + ' | ' + s.phase + ' | ' + s.action + ' | ' + s.files + ' | ' + s.criteria + ' | ' + s.test + ' | [ ] |')
}

lines.push('', '## Commands', '')
lines.push('```bash')
lines.push('npm run ai:feature:blueprint -- "' + name + '"')
lines.push('npm run ai:domain:model -- "' + name + '"')
lines.push('npm run ai:resource:generate -- "' + name + '"')
lines.push('npm run ai:test:matrix -- "' + name + '"')
lines.push('npm run ai:release:notes')
lines.push('```')
lines.push('')

const out = path.join(dir, slug + '-pipeline.md')
fs.writeFileSync(out, lines.join('\n'), 'utf-8')
info('Pipeline generated: .ai/pipelines/' + slug + '-pipeline.md (' + steps.length + ' steps)')