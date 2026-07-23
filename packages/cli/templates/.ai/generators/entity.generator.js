'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, ensureDir } = require('../bin/lib/common')
const { toPascalCase, toKebabCase } = require('./helpers/naming')

function generateEntity(moduleName, entityName) {
  const moduleSlug = toKebabCase(moduleName)
  const pascal = toPascalCase(entityName)
  const dir = path.join(ROOT, 'src/modules', moduleSlug, 'domain/entities')
  ensureDir(dir)
  const filePath = path.join(dir, pascal + '.ts')
  if (!fs.existsSync(filePath)) {
    const content = [
      'export class ' + pascal + ' {',
      '  constructor(private readonly id: string) {}',
      '',
      '  getId(): string {',
      '    return this.id',
      '  }',
      '}',
      ''
    ].join('\n')
    fs.writeFileSync(filePath, content, 'utf-8')
  }
  return filePath
}

module.exports = { generateEntity }