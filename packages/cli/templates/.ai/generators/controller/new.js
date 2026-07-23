'use strict'
const { printHelp, parseArgs, info } = require('../../bin/lib/common')
const { generateController } = require('../controller.generator')

const args = parseArgs(process.argv.slice(2))
const [moduleName, entityName] = args._
if (args.help || !moduleName || !entityName) {
  printHelp('controller/new.js', 'node .ai/generators/controller/new.js <modulo> <entidade>', ['--help  Mostra esta ajuda'])
  process.exit(args.help ? 0 : 1)
}
const filePath = generateController(moduleName, entityName)
info('Controller criado em ' + filePath)