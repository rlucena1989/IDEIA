#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, slugify } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
const name = args._[0]

if (args.help || !name) {
  printHelp('endpoint-generate.js', 'node .ai/bin/endpoint-generate.js <METHOD /path> [--module <name>]', [
    '<METHOD /path>   e.g. "POST /api/v1/users"',
    '--module <name>   Target module',
    '--help             Show this help'
  ])
  process.exit(args.help ? 0 : 1)
}

const parts = name.split(/\s+/)
const method = parts[0].toUpperCase()
const endpoint = parts[1] || '/'
const slug = slugify(endpoint.replace(/\//g, '-'))

const authzPath = path.join(ROOT, '.ai/permissions/matrix.md')
fs.mkdirSync(path.dirname(authzPath), { recursive: true })
const matrix = fs.existsSync(authzPath) ? fs.readFileSync(authzPath, 'utf-8') : '# Permissions Matrix\n\n| Endpoint | Method | SUPER_ADMIN | ADMIN | USER | Guest |\n|----------|--------|-------------|-------|------|-------|\n'

if (!matrix.includes(endpoint)) {
  const row = '| ' + endpoint + ' | ' + method + ' | S | S | N | N |'
  const updated = matrix.replace(/\|----------\|--------\|[-\s|]+\n/, function(m) { return m + row + '\n' })
  fs.writeFileSync(authzPath, updated, 'utf-8')
  info('Permissions matrix updated: ' + method + ' ' + endpoint)
}

const openApiPath = path.join(ROOT, 'docs/api/openapi.yaml')
if (fs.existsSync(openApiPath)) {
  const api = fs.readFileSync(openApiPath, 'utf-8')
  if (!api.includes(endpoint + ':')) {
    const entry = [
      '', '  ' + endpoint + ':',
      '    ' + method.toLowerCase() + ':',
      '      summary: PENDING_ACTION',
      '      operationId: ' + slug.replace(/-/g, '_'),
      '      responses:',
      '        \'200\':',
      '          description: OK',
      '        \'400\':',
      '          description: Bad Request',
    ].join('\n')
    const updated = api.replace(/(paths:\s*\n)/, '$1' + entry + '\n')
    fs.writeFileSync(openApiPath, updated, 'utf-8')
    info('OpenAPI updated with ' + method + ' ' + endpoint)
  }
}

const planDir = path.join(ROOT, '.ai/features', slug)
fs.mkdirSync(planDir, { recursive: true })
const plan = [
  '# Endpoint Plan: ' + method + ' ' + endpoint,
  '', 'Generated: ' + new Date().toISOString(), '',
  '| Aspect | Value |', '|--------|-------|',
  '| Method | ' + method + ' |',
  '| Path | ' + endpoint + ' |',
  '| Required Role | ADMIN |',
  '| Rate Limit | 100/min |',
  '', '## Input', '- PENDING_ACTION', '', '## Output', '- PENDING_ACTION', '',
  'Permissions: .ai/permissions/matrix.md',
  'OpenAPI: docs/api/openapi.yaml'
].join('\n')
fs.writeFileSync(path.join(planDir, 'endpoint-plan.md'), plan, 'utf-8')

info('Endpoint generated: ' + method + ' ' + endpoint + ' (permissions + OpenAPI updated)')