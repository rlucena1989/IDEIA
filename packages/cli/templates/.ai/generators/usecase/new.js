'use strict'
const { printHelp, parseArgs, info } = require('../../bin/lib/common')
const { generateUseCase } = require('../usecase.generator')

const args = parseArgs(process.argv.slice(2))
const [moduleName, useCaseName] = args._
if (args.help || !moduleName || !useCaseName) {
  printHelp('usecase/new.js', 'node .ai/generators/usecase/new.js <modulo> <nome-do-usecase>', ['--help  Mostra esta ajuda'])
  process.exit(args.help ? 0 : 1)
}
const { filePath, specPath } = generateUseCase(moduleName, useCaseName)
info('Use case criado em ' + filePath)
info('Teste criado em ' + specPath)