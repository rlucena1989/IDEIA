#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, slugify } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
const name = args._.join(' ')

if (args.help || !name) {
  printHelp('acceptance-generate.js', 'node .ai/bin/acceptance-generate.js <feature-name> [--out <dir>]', [
    '--out <dir>  Output dir (default: .ai/testing/acceptance/)',
    '--help        Show this help'
  ])
  process.exit(args.help ? 0 : 1)
}

const slug = slugify(name)
const outDir = path.join(ROOT, args.out || '.ai/testing/acceptance')
fs.mkdirSync(outDir, { recursive: true })

const scenarios = [
  { name: 'Happy path', given: 'valid input data is provided', when: 'the feature is executed', then: 'the expected result is returned' },
  { name: 'Missing required field', given: 'a required field is empty', when: 'the feature is executed', then: 'VALIDATION_ERROR is returned' },
  { name: 'Invalid input type', given: 'a field has wrong type', when: 'the feature is executed', then: 'VALIDATION_ERROR is returned' },
  { name: 'Unauthorized access', given: 'user has no permission', when: 'the feature is executed', then: 'FORBIDDEN is returned' },
  { name: 'Resource not found', given: 'target resource does not exist', when: 'the feature is executed', then: 'NOT_FOUND is returned' },
  { name: 'Duplicate resource', given: 'a resource with same key exists', when: 'the feature is executed', then: 'CONFLICT is returned' },
]

const gherkin = [
  '# Acceptance Criteria: ' + name,
  '', 'Generated: ' + new Date().toISOString(), '',
  '```gherkin', 'Feature: ' + name, ''
]
for (const s of scenarios) {
  const safeName = s.name.replace(/\s+/g, '-').toLowerCase()
  gherkin.push('  Scenario: ' + s.name)
  gherkin.push('    Given ' + s.given)
  gherkin.push('    When ' + s.when)
  gherkin.push('    Then ' + s.then)
  gherkin.push('')
}
gherkin.push('```', '')

const specPath = path.join(outDir, slug + '.acceptance.md')
fs.writeFileSync(specPath, gherkin.join('\n'), 'utf-8')

const testContent = [
  "import { describe, it, expect, beforeAll } from '@jest/globals'"
  ''
  "describe('" + name + "', () => {"
  "  beforeAll(async () => {"
  "    // Setup: seed data, configure test environment"
  "  })"
  ''
]
for (const s of scenarios) {
  const testName = 'should handle: ' + s.name
  testContent.push('  it(\'' + testName + '\', async () => {')
  testContent.push('    // Given ' + s.given)
  testContent.push('    // When ' + s.when)
  testContent.push('    // Then ' + s.then)
  testContent.push('    // PENDING_ACTION: implement test')
  testContent.push('  })')
  testContent.push('')
}
testContent.push('})', '')

const testDir = path.join(ROOT, 'tests/acceptance')
fs.mkdirSync(testDir, { recursive: true })
const testPath = path.join(testDir, slug + '.acceptance.spec.ts')
if (!fs.existsSync(testPath)) fs.writeFileSync(testPath, testContent.join('\n'), 'utf-8')

info('Acceptance tests generated: ' + slug + '.acceptance.md + test skeleton (' + scenarios.length + ' scenarios)')