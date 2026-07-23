#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, slugify } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
const target = args._[0]

if (args.help || !target) {
  printHelp('test-matrix.js', 'node .ai/bin/test-matrix.js <target> [--out <dir>]', [
    '<target>       UseCase, Entity, or module name to generate tests for',
    '--out <dir>    Output directory (default: auto-detect)',
    '--help          Show this help'
  ])
  process.exit(args.help ? 0 : 1)
}

const slug = slugify(target)
const outDir = args.out || path.join(ROOT, '.ai/testing/matrices')
fs.mkdirSync(outDir, { recursive: true })

const testContent = [
  'import { ' + target + ' } from \'./' + target + '\''
  ''
  "describe('" + target + "', () => {"
  "  // Success path"
  "  it('should handle valid input', async () => {"
  "    // Arrange — prepare valid input data"
  "    const input = {}"
  "    // Act — execute the target"
  "    // const result = await target.execute(input)"
  "    // Assert — verify expected outcome"
  "    // expect(result).toBeDefined()"
  "  })"
  ''
  "  // Validation errors"
  "  it('should reject invalid input', async () => {"
  "    await expect(target.execute(null as never)).rejects.toThrow()"
  "  })"
  ''
  "  it('should reject empty required fields', async () => {"
  "    const input = { name: '' }"
  "    await expect(target.execute(input)).rejects.toThrow()"
  "  })"
  ''
  "  // Business rules"
  "  it('should enforce business rules', async () => {"
  "    // Add business rule-specific tests here"
  "  })"
  ''
  "  // Edge cases"
  "  it('should handle boundary values', async () => {"
  "    // Test max length, zero values, negative numbers, etc."
  "  })"
  ''
  "  // Error states"
  "  it('should throw NOT_FOUND when resource missing', async () => {"
  "    // Mock repository to return null"
  "    // await expect(target.execute(input)).rejects.toThrow('not found')"
  "  })"
  ''
  "  it('should throw CONFLICT on duplicate', async () => {"
  "    // Mock repository to simulate existing record"
  "    // await expect(target.execute(input)).rejects.toThrow('already exists')"
  "  })"
  ''
  "  // Security"
  "  it('should enforce authorization', async () => {"
  "    // Verify permission checks are in place"
  "  })"
  ''
  "  // Concurrency (if applicable)"
  "  it('should handle concurrent operations', async () => {"
  "    // Test race conditions if resource is shared"
  "  })"
  "})"
  ''
]

const outPath = path.join(outDir, slug + '.spec.ts')
if (fs.existsSync(outPath)) {
  info('Test matrix already exists: ' + path.relative(ROOT, outPath))
  process.exit(0)
}

fs.writeFileSync(outPath, testContent.join('\n'), 'utf-8')

const matrixMd = [
  '# Test Matrix: ' + target,
  '',
  'Generated: ' + new Date().toISOString(),
  'Test file: ' + path.relative(ROOT, outPath),
  '',
  '| Scenario | Category | Status |',
  '|----------|----------|--------|',
  '| Valid input | Success | ⬜ |',
  '| Invalid input | Validation | ⬜ |',
  '| Empty required fields | Validation | ⬜ |',
  '| Business rules | Business | ⬜ |',
  '| Boundary values | Edge case | ⬜ |',
  '| Resource not found | Error | ⬜ |',
  '| Duplicate resource | Error | ⬜ |',
  '| Authorization | Security | ⬜ |',
  '| Concurrent operations | Concurrency | ⬜ |',
  ''
].join('\n')

const matrixPath = path.join(outDir, slug + '.md')
if (!fs.existsSync(matrixPath)) fs.writeFileSync(matrixPath, matrixMd, 'utf-8')

info('Test matrix generated: ' + path.relative(ROOT, outPath))
info('Matrix checklist: ' + path.relative(ROOT, matrixPath))