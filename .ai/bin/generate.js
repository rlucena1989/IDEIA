#!/usr/bin/env node
'use strict'
const { printHelp, parseArgs, info, fail } = require('./lib/common')
const { generateModule } = require('../generators/module.generator')
const { generateUseCase } = require('../generators/usecase.generator')
const { generateEntity } = require('../generators/entity.generator')
const { generateRepository } = require('../generators/repository.generator')
const { generateController } = require('../generators/controller.generator')

const args = parseArgs(process.argv.slice(2))
const [type, ...rest] = args._

if (args.help || !type) {
  printHelp('generate.js', 'node .ai/bin/generate.js <module|usecase|entity|repository|controller> <args...>', [
    'module <nome>                 Cria um modulo Clean Architecture',
    'usecase <modulo> <nome>       Cria um use case com teste inicial',
    'entity <modulo> <nome>        Cria uma entidade de dominio',
    'repository <modulo> <entidade> Cria interface + implementacao de repository',
    'controller <modulo> <entidade> Cria um controller HTTP',
    '--help                        Mostra esta ajuda'
  ])
  process.exit(args.help ? 0 : 1)
}

switch (type) {
  case 'module':
    info('Modulo criado em ' + generateModule(rest[0]))
    break
  case 'usecase': {
    const { filePath, specPath } = generateUseCase(rest[0], rest[1])
    info('Use case criado em ' + filePath + ' (teste: ' + specPath + ')')
    break
  }
  case 'entity':
    info('Entidade criada em ' + generateEntity(rest[0], rest[1]))
    break
  case 'repository': {
    const { interfacePath, implPath } = generateRepository(rest[0], rest[1])
    info('Repository interface: ' + interfacePath)
    info('Repository impl: ' + implPath)
    break
  }
  case 'controller':
    info('Controller criado em ' + generateController(rest[0], rest[1]))
    break
  default:
    fail('Tipo desconhecido: ' + type)
}