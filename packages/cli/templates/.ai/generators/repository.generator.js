'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, ensureDir } = require('../bin/lib/common')
const { toPascalCase, toKebabCase } = require('./helpers/naming')

function generateRepository(moduleName, entityName) {
  const moduleSlug = toKebabCase(moduleName)
  const pascal = toPascalCase(entityName)
  const interfaceDir = path.join(ROOT, 'src/modules', moduleSlug, 'domain/repositories')
  const implDir = path.join(ROOT, 'src/modules', moduleSlug, 'infrastructure/repositories')
  ensureDir(interfaceDir)
  ensureDir(implDir)

  const interfaceContent = [
    'export interface I' + pascal + 'Repository {',
    '  findById(id: string): Promise<' + pascal + ' | null>',
    '  findAll(page: number, perPage: number): Promise<{ items: ' + pascal + '[]; total: number }>',
    '  save(entity: ' + pascal + '): Promise<void>',
    '  update(entity: ' + pascal + '): Promise<void>',
    '  delete(id: string): Promise<void>',
    '}',
    ''
  ].join('\n')

  const implContent = [
  "import { AppScaffoldError } from '../../../shared/errors/AppError'",
  "import { I" + pascal + "Repository } from '../../domain/repositories/I" + pascal + "Repository'",
  "import { " + pascal + " } from '../../domain/entities/" + pascal + "'",
  "",
  "export class " + pascal + "Repository implements I" + pascal + "Repository {",
  "  async findById(id: string): Promise<" + pascal + " | null> {",
  "    // @scaffold-pending: substituir por implementação real (ORM) antes de produção",
  "    throw new AppScaffoldError('SCAFFOLD_PENDING', '" + pascal + "Repository.findById requires ORM implementation');",
  "  }",
  "  async findAll(page: number, perPage: number): Promise<{ items: " + pascal + "[]; total: number }> {",
  "    // @scaffold-pending: substituir por implementação real (ORM) antes de produção",
  "    throw new AppScaffoldError('SCAFFOLD_PENDING', '" + pascal + "Repository.findAll requires ORM implementation');",
  "  }",
  "  async save(entity: " + pascal + "): Promise<void> {",
  "    // @scaffold-pending: substituir por implementação real (ORM) antes de produção",
  "    throw new AppScaffoldError('SCAFFOLD_PENDING', '" + pascal + "Repository.save requires ORM implementation');",
  "  }",
  "  async update(entity: " + pascal + "): Promise<void> {",
  "    // @scaffold-pending: substituir por implementação real (ORM) antes de produção",
  "    throw new AppScaffoldError('SCAFFOLD_PENDING', '" + pascal + "Repository.update requires ORM implementation');",
  "  }",
  "  async delete(id: string): Promise<void> {",
  "    // @scaffold-pending: substituir por implementação real (ORM) antes de produção",
  "    throw new AppScaffoldError('SCAFFOLD_PENDING', '" + pascal + "Repository.delete requires ORM implementation');",
  "  }",
  "}"
].join('\n');

  const ifacePath = path.join(interfaceDir, 'I' + pascal + 'Repository.ts')
  const implPath = path.join(implDir, pascal + 'Repository.ts')
  if (!fs.existsSync(ifacePath)) fs.writeFileSync(ifacePath, interfaceContent, 'utf-8')
  if (!fs.existsSync(implPath)) fs.writeFileSync(implPath, implContent, 'utf-8')
  return { interfacePath: ifacePath, implPath }
}

module.exports = { generateRepository }