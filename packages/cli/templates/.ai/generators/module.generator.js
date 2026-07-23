'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, ensureDir } = require('../bin/lib/common')
const { toKebabCase } = require('./helpers/naming')

function generateModule(name) {
  const slug = toKebabCase(name)
  const base = path.join(ROOT, 'src/modules', slug)
  const dirs = ['domain/entities', 'domain/repositories', 'application/usecases', 'infrastructure/repositories', 'presentation/controllers']
  dirs.forEach(d => ensureDir(path.join(base, d)))
  const gitkeep = path.join(base, 'README.md')
  if (!fs.existsSync(gitkeep)) {
    fs.writeFileSync(gitkeep, '# Modulo ' + slug + '\n\nEstrutura Clean Architecture gerada por module.generator.js.\n', 'utf-8')
  }
  return base
}

module.exports = { generateModule }