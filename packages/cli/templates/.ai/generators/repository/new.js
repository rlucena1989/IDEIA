'use strict'
const { printHelp, parseArgs, info } = require('../../bin/lib/common')
const { generateRepository } = require('../repository.generator')

const args = parseArgs(process.argv.slice(2))
const [moduleName, entityName] = args._
if (args.help || !moduleName || !entityName) {
  printHelp('repository/new.js', 'node .ai/generators/repository/new.js <modulo> <entidade>', ['--help  Mostra esta ajuda'])
  process.exit(args.help ? 0 : 1)
}
const { interfacePath, implPath } = generateRepository(moduleName, entityName)
info('Repository interface: ' + interfacePath)
info('Repository impl: ' + implPath)