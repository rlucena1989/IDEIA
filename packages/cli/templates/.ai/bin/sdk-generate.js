#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, slugify } = require('./lib/common')
const { toPascalCase, toCamelCase } = require('../../generators/helpers/naming')

const args = parseArgs(process.argv.slice(2))
const name = args._[0]

if (args.help || !name) {
  printHelp('sdk-generate.js', 'node .ai/bin/sdk-generate.js <module-name> [--out <dir>]', [
    '<module-name>  Target module for SDK client',
    '--out <dir>     Output dir (default: sdk/)',
    '--help           Show this help'
  ])
  process.exit(args.help ? 0 : 1)
}

const pascal = toPascalCase(name)
const camel = toCamelCase(name)

const sdkDir = path.join(ROOT, args.out || 'sdk')
fs.mkdirSync(sdkDir, { recursive: true })
fs.mkdirSync(path.join(sdkDir, 'clients'), { recursive: true })
fs.mkdirSync(path.join(sdkDir, 'types'), { recursive: true })
fs.mkdirSync(path.join(sdkDir, 'errors'), { recursive: true })

const indexContent = [
  'export { ' + pascal + 'Client } from \'./clients/' + pascal + 'Client\''
  'export * from \'./types/' + pascal + '\''
  ''
].join('\n')

const clientContent = [
  'export class ' + pascal + 'Client {',
  '  constructor(private readonly baseUrl: string, private readonly token?: string) {}',
  ''
  '  private get headers(): Record<string, string> {',
  '    const h: Record<string, string> = { \'Content-Type\': \'application/json\' }',
  '    if (this.token) h[\'Authorization\'] = \'Bearer \' + this.token',
  '    return h',
  '  }',
  ''
  '  async list(page = 1, perPage = 20) {'
  '    const res = await fetch(\\`' + '$' + '{this.baseUrl}/api/v1/' + name + 's?page=' + '$' + '{page}&perPage=' + '$' + '{perPage}\\`)'
  '    if (!res.ok) throw new Error(\\`HTTP ' + '$' + '{res.status}: ' + '$' + '{await res.text()}\\`)'
  '    return res.json()'
  '  }',
  ''
  '  async getById(id: string) {'
  '    const res = await fetch(\\`' + '$' + '{this.baseUrl}/api/v1/' + name + 's/' + '$' + '{id}\\`)'
  '    if (!res.ok) throw new Error(\\`HTTP ' + '$' + '{res.status}: ' + '$' + '{await res.text()}\\`)'
  '    return res.json()'
  '  }',
  '}',
  ''
].join('\n')

const typesContent = [
  'export interface ' + pascal + ' {'
  '  id: string'
  '  createdAt: string'
  '  updatedAt: string'
  '}'
  ''
].join('\n')

const indexPath = path.join(sdkDir, 'index.ts')
if (!fs.existsSync(indexPath)) fs.writeFileSync(indexPath, indexContent, 'utf-8')
const clientPath = path.join(sdkDir, 'clients', pascal + 'Client.ts')
if (!fs.existsSync(clientPath)) fs.writeFileSync(clientPath, clientContent, 'utf-8')
const typesPath = path.join(sdkDir, 'types', pascal + '.ts')
if (!fs.existsSync(typesPath)) fs.writeFileSync(typesPath, typesContent, 'utf-8')

info('SDK client generated: sdk/ (index.ts + clients/' + pascal + 'Client.ts + types/' + pascal + '.ts)')