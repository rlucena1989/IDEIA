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

const errors = []

if (!/type\s+Query/.test(content)) errors.push('schema.graphql nao possui tipo Query')

const openBraces = (content.match(/\{/g) || []).length
const closeBraces = (content.match(/\}/g) || []).length
if (openBraces !== closeBraces) errors.push('chaves desbalanceadas em schema.graphql ( { = ' + openBraces + ' , } = ' + closeBraces + ' )')

const openParens = (content.match(/\(/g) || []).length
const closeParens = (content.match(/\)/g) || []).length
if (openParens !== closeParens) errors.push('parenteses desbalanceados em schema.graphql ( ( = ' + openParens + ' , ) = ' + closeParens + ' )')

const typeMatches = content.match(/^\s*type\s+\w+\s*\{/gm) || []
if (typeMatches.length === 0) errors.push('nenhuma definicao "type X {" encontrada')

const fieldDefMatches = content.match(/^\s*[A-Za-z_][A-Za-z0-9_]*\s*:/gm) || []
if (typeMatches.length > 0 && fieldDefMatches.length === 0) errors.push('tipos definidos mas nenhum campo encontrado')

const lines = content.split(/\r?\n/)
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+?)\s*(?:#.*)?$/)
  if (m) {
    const fieldType = m[2].replace(/[!\[\]]/g, '').trim()
    if (fieldType === '') errors.push('campo com tipo vazio na linha ' + (i + 1) + ': ' + line.trim())
  }
}

if (errors.length) { errors.forEach(e => fail(e)); process.exit(1) }

info('.ai/contracts/graphql/schema.graphql passou na validacao estrutural (Query presente, chaves/parenteses balanceados, ' + typeMatches.length + ' tipo(s), ' + fieldDefMatches.length + ' campo(s))')