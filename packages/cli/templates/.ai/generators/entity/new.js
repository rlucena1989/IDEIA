'use strict'
const { printHelp, parseArgs, info } = require('../../bin/lib/common')
const { generateEntity } = require('../entity.generator')

const args = parseArgs(process.argv.slice(2))
const [moduleName, entityName] = args._
if (args.help || !moduleName || !entityName) {
  printHelp('entity/new.js', 'node .ai/generators/entity/new.js <modulo> <nome-da-entidade>', ['--help  Mostra esta ajuda'])
  process.exit(args.help ? 0 : 1)
}
const filePath = generateEntity(moduleName, entityName)
info('Entidade criada em ' + filePath)