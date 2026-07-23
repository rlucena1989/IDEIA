#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, fail, printHelp, parseArgs } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('openapi-validate.js', 'node .ai/bin/openapi-validate.js [--file <path>]', [
    '--file <path>  OpenAPI spec to validate (default: docs/api/openapi.yaml)',
    '--help          Show this help'
  ])
  process.exit(0)
}

const file = path.join(ROOT, args.file || 'docs/api/openapi.yaml')
if (!fs.existsSync(file)) {
  console.warn('WARN: OpenAPI spec not found: ' + path.relative(ROOT, file) + ' — nada a validar (skip).')
  process.exit(0)
}
const content = fs.readFileSync(file, 'utf-8')

const warnings = []
const errors = []

if (!/^openapi:\s*"?3\./m.test(content) && !/^"openapi":\s*"?3\./m.test(content)) errors.push('Missing or invalid openapi version (expected 3.x)')
if (!/^info:/m.test(content)) errors.push('Missing info section')
else {
  if (!/title:/m.test(content)) errors.push('Missing info.title')
  if (!/version:/m.test(content)) errors.push('Missing info.version')
}
if (!/^paths:/m.test(content)) errors.push('Missing paths section')
if (/components:\s*\n\s*schemas:\s*\{\}/.test(content)) warnings.push('components.schemas is empty')

if (errors.length === 0) {
  const pathMatches = content.match(/^\s{2}(\/[^:\s]+):/gm) || []
  const uniquePaths = new Set(pathMatches.map(m => m.replace(/^\s{2}/, '').replace(/:$/, '')))
  info('Paths defined: ' + uniquePaths.size)

  const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head']
  let methodCount = 0
  let hasSecurity = false
  for (const p of uniquePaths) {
    const pathSection = content.split(p + ':')[1]?.split(/\n\S/)[0] || ''
    for (const m of methods) {
      if (pathSection.includes(m + ':')) methodCount++
    }
    if (pathSection.includes('security:')) hasSecurity = true
  }
  info('Endpoints defined: ' + methodCount)
  if (!hasSecurity) warnings.push('No per-endpoint security defined')
  if (!/^tags:/m.test(content)) warnings.push('No tags defined')
  if (content.includes('$ref') && !fs.existsSync(path.join(path.dirname(file), 'schemas'))) {
    const localRefs = (content.match(/\$ref:\s*'([^']+)'/g) || []).filter(r => r.includes('./'))
    if (localRefs.length > 0 && !content.includes('x-resolved')) {
      warnings.push(localRefs.length + ' local $ref(s) found — ensure referenced schemas exist')
    }
  }
}

if (errors.length) { errors.forEach(e => fail('ERROR: ' + e)); process.exit(1) }
if (warnings.length) { warnings.forEach(w => console.error('WARN:  ' + w)) }
info('OpenAPI validation complete: ' + (errors.length === 0 ? 'OK' : errors.length + ' errors, ') + warnings.length + ' warnings')