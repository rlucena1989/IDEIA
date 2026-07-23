#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, warn, printHelp, parseArgs } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('e2e-plan.js', 'node .ai/bin/e2e-plan.js [--out <dir>]', [
    '--out <dir>   Output dir for test files (default: tests/e2e/)',
    '--api <file>  OpenAPI spec path (default: docs/api/openapi.yaml)',
    '--help         Show this help'
  ])
  process.exit(0)
}

const apiPath = path.join(ROOT, args.api || 'docs/api/openapi.yaml')
if (!fs.existsSync(apiPath)) {
  warn('OpenAPI spec not found: ' + apiPath)
  info('Create docs/api/openapi.yaml first, then re-run.')
  process.exit(0)
}

const spec = fs.readFileSync(apiPath, 'utf-8')

const paths = []
const pathRegex = /^\s{2}(\/[^:]+):/gm
let m
while ((m = pathRegex.exec(spec)) !== null) {
  paths.push(m[1])
}

if (paths.length === 0) {
  warn('No paths found in OpenAPI spec')
  process.exit(0)
}

const outDir = path.join(ROOT, args.out || 'tests/e2e')
fs.mkdirSync(outDir, { recursive: true })

let generated = 0

for (const apiPath of paths) {
  const safeName = apiPath.replace(/[\/{}]/g, '_').replace(/^_|_$/g, '').replace(/_+/g, '-') || 'root'
  const methods = []
  if (spec.includes(apiPath + ':')) {
    const section = spec.split(apiPath + ':')[1]?.split(/\n\S/)[0] || ''
    if (section.includes('get:')) methods.push('GET')
    if (section.includes('post:')) methods.push('POST')
    if (section.includes('put:')) methods.push('PUT')
    if (section.includes('delete:')) methods.push('DELETE')
    if (section.includes('patch:')) methods.push('PATCH')
  }

  const testContent = [
    "import request from 'supertest'"
    ''
    "const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'"
    "const apiPath = '" + apiPath + "'"
    ''
    "describe('" + apiPath + "', () => {"
  ]

  for (const method of methods) {
    const httpMethod = method.toLowerCase()
    testContent.push("  describe('" + method + " " + apiPath + "', () => {")
    testContent.push("    it('should return valid response', async () => {")
    testContent.push("      const res = await request(BASE_URL)." + httpMethod + "(apiPath)")
    testContent.push("      expect(res.status).toBeGreaterThanOrEqual(200)")
    testContent.push("      expect(res.status).toBeLessThan(500)")
    testContent.push("    })")

    testContent.push('')
    testContent.push("    it('should handle authentication', async () => {")
    testContent.push("      const res = await request(BASE_URL)." + httpMethod + "(apiPath)")
    testContent.push("      expect([401, 403, 200]).toContain(res.status)")
    testContent.push("    })")

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      testContent.push('')
      testContent.push("    it('should reject invalid input', async () => {")
      testContent.push("      const res = await request(BASE_URL)." + httpMethod + "(apiPath).send({})")
      testContent.push("      expect([400, 422, 401, 403]).toContain(res.status)")
      testContent.push("    })")
    }
    testContent.push('  })')
    testContent.push('')
  }

  testContent.push('})')
  testContent.push('')

  const filePath = path.join(outDir, safeName + '.e2e-spec.ts')
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, testContent.join('\n'), 'utf-8')
    generated++
  }
}

info('E2E test skeletons generated: ' + generated + ' files in ' + path.relative(ROOT, outDir))
if (generated > 0) {
  info('Run with: npm run test:e2e')
}