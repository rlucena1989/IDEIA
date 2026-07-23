#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
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
  const lines = matrix.split(/\r?\n/)
  let insertAt = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\|[-\s|]+\|\s*$/.test(lines[i]) && i > 0) {
      insertAt = i + 1
      break
    }
  }
  if (insertAt === -1) {
    lines.push(row)
  } else {
    lines.splice(insertAt, 0, row)
  }
  const updated = lines.join('\n')
  fs.writeFileSync(authzPath, updated, 'utf-8')
  info('Permissions matrix updated: ' + method + ' ' + endpoint)
}

const openApiPath = path.join(ROOT, 'docs/api/openapi.yaml')
if (fs.existsSync(openApiPath)) {
  const raw = fs.readFileSync(openApiPath, 'utf-8')
  if (!raw.includes(endpoint + ':')) {
    try {
      const doc = yaml.load(raw) || {}
      doc.paths = doc.paths || {}
      doc.paths[endpoint] = doc.paths[endpoint] || {}
      doc.paths[endpoint][method.toLowerCase()] = {
        summary: 'PENDING_ACTION',
        operationId: slug.replace(/-/g, '_'),
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Bad Request' }
        }
      }
      const updated = yaml.dump(doc, { lineWidth: 120, noRefs: true })
      fs.writeFileSync(openApiPath, updated, 'utf-8')
      info('OpenAPI updated with ' + method + ' ' + endpoint)
    } catch (e) {
      info('WARN: nao foi possivel parsear docs/api/openapi.yaml como YAML (' + e.message + ') — endpoint ' + method + ' ' + endpoint + ' nao adicionado')
    }
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