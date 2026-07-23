#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, slugify } = require('./lib/common')
const { toPascalCase, toKebabCase } = require('../../generators/helpers/naming')

const args = parseArgs(process.argv.slice(2))
const name = args._[0]

if (args.help || !name) {
  printHelp('dto-generate.js', 'node .ai/bin/dto-generate.js <DTO-name> [--module <name>]', [
    '<DTO-name>      e.g. CreateUserInput, UpdateOrderInput',
    '--module <name>  Target module (default: from name)',
    '--help            Show this help'
  ])
  process.exit(args.help ? 0 : 1)
}

const pascal = toPascalCase(name)
const moduleName = args.module || name.replace(/(Create|Update|Delete|Find|List|Get)(.+)/, '$2').toLowerCase()
const moduleSlug = toKebabCase(moduleName)

const dtoDir = path.join(ROOT, 'src/modules', moduleSlug, 'application/dtos')
fs.mkdirSync(dtoDir, { recursive: true })

const dtoContent = [
  'import { z } from \'zod\'',
  '',
  'export const ' + pascal + 'Schema = z.object({',
  '  // PENDING_ACTION: define validation fields',
  '  // email: z.string().email(),',
  '  // name: z.string().min(2).max(100),',
  '  // status: z.enum([\'active\', \'inactive\']),',
  '})',
  '',
  'export type ' + pascal + ' = z.infer<typeof ' + pascal + 'Schema>',
  ''
]

const dtoPath = path.join(dtoDir, pascal + '.ts')
if (!fs.existsSync(dtoPath)) {
  fs.writeFileSync(dtoPath, dtoContent.join('\n'), 'utf-8')
  info('DTO created: src/modules/' + moduleSlug + '/application/dtos/' + pascal + '.ts')
} else {
  info('DTO already exists: ' + dtoPath)
}

const openApiPath = path.join(ROOT, 'docs/api/openapi.yaml')
if (fs.existsSync(openApiPath)) {
  const api = fs.readFileSync(openApiPath, 'utf-8')
  if (!api.includes(pascal)) {
    const append = [
      '', '    ' + pascal + ':',
      '      type: object',
      '      properties:',
      '        # PENDING_ACTION: define properties',
      '      required: []'
    ].join('\n')
    if (api.includes('schemas:')) {
      const updated = api.replace(/(schemas:\s*\n)/, '$1' + append + '\n')
      fs.writeFileSync(openApiPath, updated, 'utf-8')
      info('OpenAPI schema entry added for ' + pascal)
    }
  }
}

const specPath = path.join(ROOT, '.ai/contracts/forms', pascal + '.form.md')
fs.mkdirSync(path.dirname(specPath), { recursive: true })
const spec = [
  '# Form Spec: ' + pascal,
  '', '## Fields', '', '| Field | Type | Required | Validation | Default |',
  '|-------|------|----------|------------|---------|',
  '| PENDING_ACTION  |      |          |            |         |',
  '', '## Validation Rules', '-', ''
  'DTO file: src/modules/' + moduleSlug + '/application/dtos/' + pascal + '.ts'
].join('\n')
if (!fs.existsSync(specPath)) fs.writeFileSync(specPath, spec, 'utf-8')

info('DTO + schema + form spec generated for ' + pascal)