'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, ensureDir } = require('../bin/lib/common')
const { render } = require('../bin/lib/templates')
const { toPascalCase, toKebabCase } = require('./helpers/naming')

function generateUseCase(moduleName, useCaseName) {
  const moduleSlug = toKebabCase(moduleName)
  const pascal = toPascalCase(useCaseName)
  const dir = path.join(ROOT, 'src/modules', moduleSlug, 'application/usecases')
  ensureDir(dir)
  const tplDir = path.join(ROOT, '.ai/generators/templates')
  const useCaseTpl = fs.readFileSync(path.join(tplDir, 'usecase.ts.hbs'), 'utf-8')
  const specTpl = fs.readFileSync(path.join(tplDir, 'usecase.spec.ts.hbs'), 'utf-8')
  const vars = { PascalName: pascal }
  const filePath = path.join(dir, pascal + 'UseCase.ts')
  const specPath = path.join(dir, pascal + 'UseCase.spec.ts')
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, render(useCaseTpl, vars), 'utf-8')
  if (!fs.existsSync(specPath)) fs.writeFileSync(specPath, render(specTpl, vars), 'utf-8')
  return { filePath, specPath }
}

module.exports = { generateUseCase }