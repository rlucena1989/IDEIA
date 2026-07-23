'use strict'
const { printHelp, parseArgs, info, fail } = require('../../bin/lib/common')
const { generateModule } = require('../module.generator')

const args = parseArgs(process.argv.slice(2))
const name = args._[0]
if (args.help || !name) {
  printHelp('module/new.js', 'node .ai/generators/module/new.js <nome-do-modulo>', ['--help  Mostra esta ajuda'])
  process.exit(args.help ? 0 : 1)
}
const base = generateModule(name)
info('Modulo criado em ' + base)