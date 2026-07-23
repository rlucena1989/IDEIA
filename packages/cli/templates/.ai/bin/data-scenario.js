#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, slugify } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
const name = args._.join(' ')

if (args.help || !name) {
  printHelp('data-scenario.js', 'node .ai/bin/data-scenario.js <scenario-name> [--entity <name>]', [
    '--entity <name>  Target entity for factory/builder',
    '--help            Show this help'
  ])
  process.exit(args.help ? 0 : 1)
}

const slug = slugify(name)
const entity = args.entity || name

const builderDir = path.join(ROOT, 'src/shared/testing/builders')
fs.mkdirSync(builderDir, { recursive: true })

const builderContent = [
  'export class ' + entity + 'Builder {',
  '  private data: Partial<any> = {}',
  '',
  '  with(overrides: Partial<any>): this {',
  '    Object.assign(this.data, overrides)',
  '    return this',
  '  }',
  '',
  '  build() {',
  '    return {',
  '      id: this.data.id || \'00000000-0000-0000-0000-000000000000\',',
  '      createdAt: this.data.createdAt || new Date(),',
  '      updatedAt: this.data.updatedAt || new Date(),',
  '      ...this.data,',
  '    }',
  '  }',
  '}',
  ''
].join('\n')

const builderPath = path.join(builderDir, entity + 'Builder.ts')
if (!fs.existsSync(builderPath)) fs.writeFileSync(builderPath, builderContent, 'utf-8')

const scenarioDir = path.join(ROOT, '.ai/testing/data-scenarios')
fs.mkdirSync(scenarioDir, { recursive: true })
const scenario = [
  '# Data Scenario: ' + name,
  '', 'Generated: ' + new Date().toISOString(), '',
  '## Builder', 'src/shared/testing/builders/' + entity + 'Builder.ts', '',
  '## Valid Data', '```ts', 'const valid = new ' + entity + 'Builder().build()', '```', '',
  '## Invalid Data', '- Missing required field', '- Wrong types', '- Boundary values', '',
  '## Edge Cases', '- Empty strings', '- Very long values', '- Special characters', '- Null vs undefined', '',
  '## Seed Data', 'Use builder in beforeAll/beforeEach hooks.', ''
].join('\n')
fs.writeFileSync(path.join(scenarioDir, slug + '.md'), scenario, 'utf-8')

info('Data scenario generated: builder + scenario doc for ' + entity)