#!/usr/bin/env node
// verify.js -- verifica se o contexto de IA esta preenchido
'use strict'
const fs   = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname, '../..')

const PLACEHOLDERS = [
    '[Nome do Projeto]', '[Nome do Produto]', '[DESCREVER]', '[modulo]', 'Nenhum modulo criado ainda',
    '[Descricao em uma linha]', '[Descricao em 2 linhas]', '[nestjs | express | fastify]',
    '[postgresql | mysql | mongodb | sqlite]', '[prisma | typeorm | mongoose]',
    '[Qual dor este produto resolve?]', '[Quem sao os usuarios principais?]',
    '[Como o produto resolve o problema?]', '[O que torna este produto unico?]'
  ]
const CHECK = [
  '.ai/project-manifest.yaml',
  '.ai/product/vision.md',
  '.ai/context/ai-handoff.md',
  '.ai/tasks/current-task.md',
]

let warnings = 0
console.log('\nverify.js -- verificando contexto de IA...\n')

for (const f of CHECK) {
  const full = path.join(ROOT, f)
  if (!fs.existsSync(full)) { console.warn('  AUSENTE: ' + f); warnings++; continue }
  const content = fs.readFileSync(full, 'utf-8')
  const found   = PLACEHOLDERS.filter(p => content.includes(p))
  if (found.length > 0) {
    console.warn('  PLACEHOLDER em ' + f + ': ' + found.join(', '))
    warnings++
  } else {
    console.log('  OK: ' + f)
  }
}

if (warnings > 0) {
  console.warn('\n' + warnings + ' arquivo(s) com placeholders. Preencha antes de usar a IA.')
  process.exit(1)
}
console.log('\nContexto OK. Pronto para usar a IA.')