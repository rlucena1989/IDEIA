#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, fail, printHelp, parseArgs } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('graphql-validate.js', 'node .ai/bin/graphql-validate.js', ['--help  Mostra esta ajuda'])
  process.exit(0)
}

const file = path.join(ROOT, '.ai/contracts/graphql/schema.graphql')
if (!fs.existsSync(file)) { fail('.ai/contracts/graphql/schema.graphql nao encontrado'); process.exit(1) }
const content = fs.readFileSync(file, 'utf-8')

if (!/type\s+Query/.test(content)) { fail('schema.graphql nao possui tipo Query'); process.exit(1) }

const openBraces = (content.match(/\{/g) || []).length
const closeBraces = (content.match(/\}/g) || []).length
if (openBraces !== closeBraces) { fail('chaves desbalanceadas em schema.graphql'); process.exit(1) }

info('.ai/contracts/graphql/schema.graphql passou na validacao estrutural basica')