#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('generate-github-actions.js', 'node .ai/bin/generate-github-actions.js [--out <path>]', [
    '--out <path>   Output path (default: .github/workflows/ci.yml)',
    '--matrix       Generate node version matrix workflow',
    '--help          Show this help'
  ])
  process.exit(0)
}

const nodeVersions = ['18', '20', '22']
const yaml = [
  'name: CI',
  '',
  'on:',
  '  push:',
  '    branches: [main]',
  '  pull_request:',
  '    branches: [main]',
  '',
  'jobs:',
  '  build:',
  '    runs-on: ubuntu-latest',
  '    strategy:',
  '      matrix:',
  '        node-version: [' + nodeVersions.join(', ') + ']',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - uses: actions/setup-node@v4',
  '        with:',
  '          node-version: ${{ matrix.node-version }}',
  '          cache: npm',
  '      - run: npm ci',
  '      - run: npm run lint',
  '      - run: npm run typecheck',
  '      - run: npm test',
  '      - run: npm run build',
  ''
]

const out = path.join(ROOT, args.out || '.github/workflows/ci.yml')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, yaml.join('\n'), 'utf-8')
info('GitHub Actions CI generated: ' + out + ' (matrix: Node ' + nodeVersions.join('/') + ')')