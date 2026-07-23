'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, ensureDir } = require('../bin/lib/common')
const { toPascalCase, toKebabCase } = require('./helpers/naming')

function generateController(moduleName, entityName) {
  const moduleSlug = toKebabCase(moduleName)
  const pascal = toPascalCase(entityName)
  const dir = path.join(ROOT, 'src/modules', moduleSlug, 'presentation/controllers')
  ensureDir(dir)

  const content = [
    "const repoInterfacePath = '../../domain/repositories/I" + pascal + "Repository'"
    "const entityPath = '../../domain/entities/' + pascal"
    ''
    'export class ' + pascal + 'Controller {'
    '  constructor(private readonly repository: I' + pascal + 'Repository) {}'
    ''
    '  async list(page: number = 1, perPage: number = 20) {'
    '    return this.repository.findAll(page, perPage)'
    '  }'
    ''
    '  async getById(id: string) {'
    '    const entity = await this.repository.findById(id)'
    '    if (!entity) throw new Error(\'' + pascal + ' not found\')'
    '    return entity'
    '  }'
    '}'
    ''
  ].join('\n')

  const filePath = path.join(dir, pascal + 'Controller.ts')
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, content, 'utf-8')
  return filePath
}

module.exports = { generateController }