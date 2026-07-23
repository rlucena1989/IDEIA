#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, slugify } = require('./lib/common')
const { toPascalCase } = require('../generators/helpers/naming')

const args = parseArgs(process.argv.slice(2))
const name = args._[0]

if (args.help || !name) {
  printHelp('integration-generate.js', 'node .ai/bin/integration-generate.js <provider-name> [--module <name>]', [
    '<provider-name>  e.g. stripe, sendgrid, aws-s3',
    '--module <name>   Target module (default: integrations)',
    '--help             Show this help'
  ])
  process.exit(args.help ? 0 : 1)
}

const pascal = toPascalCase(name)
const moduleName = args.module || 'integrations'
const moduleSlug = slugify(moduleName)

const portDir = path.join(ROOT, 'src/modules', moduleSlug, 'application/ports')
const adapterDir = path.join(ROOT, 'src/modules', moduleSlug, 'infrastructure/integrations', slugify(name))
fs.mkdirSync(portDir, { recursive: true })
fs.mkdirSync(adapterDir, { recursive: true })

const portContent = [
  'export interface I' + pascal + 'Adapter {',
  '  execute(input: unknown): Promise<unknown>',
  '}',
  ''
].join('\n')

const adapterContent = [
  'import { I' + pascal + 'Adapter } from \'../../application/ports/I' + pascal + 'Adapter\'',
  '',
  'export class ' + pascal + 'Adapter implements I' + pascal + 'Adapter {',
  '  constructor(private readonly config: Record<string, string>) {}',
  '',
  '  async execute(input: unknown): Promise<unknown> {',
  '    throw new Error(\'Not implemented\')',
  '  }',
  '}',
  ''
].join('\n')

const portPath = path.join(portDir, 'I' + pascal + 'Adapter.ts')
const adapterPath = path.join(adapterDir, pascal + 'Adapter.ts')
if (!fs.existsSync(portPath)) fs.writeFileSync(portPath, portContent, 'utf-8')
if (!fs.existsSync(adapterPath)) fs.writeFileSync(adapterPath, adapterContent, 'utf-8')

info('Integration adapter generated: I' + pascal + 'Adapter + ' + pascal + 'Adapter')