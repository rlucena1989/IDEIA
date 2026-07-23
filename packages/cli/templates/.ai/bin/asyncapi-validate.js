#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, fail, printHelp, parseArgs } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('asyncapi-validate.js', 'node .ai/bin/asyncapi-validate.js', ['--help  Mostra esta ajuda'])
  process.exit(0)
}

const file = path.join(ROOT, 'docs/api/asyncapi.yaml')
if (!fs.existsSync(file)) { fail('docs/api/asyncapi.yaml nao encontrado'); process.exit(1) }
const content = fs.readFileSync(file, 'utf-8')

const errors = []
if (!/^asyncapi:/m.test(content)) errors.push('campo "asyncapi" ausente')
if (!/^info:/m.test(content)) errors.push('campo "info" ausente')
if (!/^channels:/m.test(content)) errors.push('campo "channels" ausente')

if (errors.length) { errors.forEach(e => fail(e)); process.exit(1) }
info('docs/api/asyncapi.yaml passou na validacao estrutural basica')