#!/usr/bin/env node
'use strict'
const { printHelp, parseArgs, info } = require('./lib/common')
const { generateModule } = require('../generators/module.generator')

const args = parseArgs(process.argv.slice(2))
const name = args._[0]
if (args.help || !name) {
  printHelp('create-module.js', 'node .ai/bin/create-module.js <nome-do-modulo>', ['--help  Mostra esta ajuda'])
  process.exit(args.help ? 0 : 1)
}
const base = generateModule(name)
info('Modulo Clean Architecture criado em ' + base)