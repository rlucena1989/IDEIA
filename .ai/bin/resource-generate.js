#!/usr/bin/env node
'use strict'
const path = require('path')
const { ROOT, info, printHelp, parseArgs, slugify } = require('./lib/common')
const { generateModule } = require('../generators/module.generator')
const { generateEntity } = require('../generators/entity.generator')
const { generateUseCase } = require('../generators/usecase.generator')
const { generateRepository } = require('../generators/repository.generator')
const { generateController } = require('../generators/controller.generator')

const args = parseArgs(process.argv.slice(2))
const name = args._[0]

if (args.help || !name) {
  printHelp('resource-generate.js', 'node .ai/bin/resource-generate.js <resource-name>', [
    'Generates full Clean Architecture resource: module + entity + repository + use cases + controller',
    '--help  Mostra esta ajuda'
  ])
  process.exit(args.help ? 0 : 1)
}

const slug = slugify(name)

info('Generating resource: ' + name + ' (' + slug + ')')
const base = generateModule(name)
info('  Module: ' + path.relative(ROOT, base))

const entityPath = generateEntity(name, name)
info('  Entity: ' + path.relative(ROOT, entityPath))

const { interfacePath, implPath } = generateRepository(name, name)
info('  Repository interface: ' + path.relative(ROOT, interfacePath))
info('  Repository impl: ' + path.relative(ROOT, implPath))

const useCases = ['Create' + name, 'Find' + name + 'ById', 'List' + name + 's', 'Update' + name, 'Delete' + name]
for (const uc of useCases) {
  const { filePath, specPath } = generateUseCase(name, uc)
  info('  UseCase: ' + path.relative(ROOT, filePath))
}

const ctrlPath = generateController(name, name)
info('  Controller: ' + path.relative(ROOT, ctrlPath))

info('Resource ' + name + ' generated successfully')