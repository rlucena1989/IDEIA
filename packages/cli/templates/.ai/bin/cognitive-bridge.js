#!/usr/bin/env node
// cognitive-bridge.js -- converte skeleton em mapa cognitivo
'use strict'
const fs   = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname, '../..')
const src  = path.join(ROOT, '.ai/docs/project-skeleton.md')

if (!fs.existsSync(src)) {
  console.error('ERRO: project-skeleton.md nao encontrado. Execute: npm run ai:skeleton')
  process.exit(1)
}

const text     = fs.readFileSync(src, 'utf-8')
const srcSection = (text.split('## src/')[1] || '').split('\n## ')[0]
const modules  = [...srcSection.matchAll(/^  (\w+)\/$/gm)].map(m => m[1])
const useCases = [...text.matchAll(/(\w+UseCase\.ts)/g)].map(m => m[1])

if (modules.length === 0) console.warn('AVISO: Nenhum modulo detectado em src/. Execute apos criar modulos.')
if (useCases.length === 0) console.warn('AVISO: Nenhum UseCase detectado em src/. Execute apos criar use cases.')

const lines = [
  '# Cognitive Map',
  '> Gerado em: ' + new Date().toLocaleString('pt-BR'),
  '',
  '## Modulos detectados (' + modules.length + ')',
  modules.length > 0 ? modules.map(m => '- ' + m).join('\n') : '_Nenhum modulo encontrado._',
  '',
  '## Use Cases detectados (' + useCases.length + ')',
  useCases.length > 0 ? useCases.map(u => '- ' + u).join('\n') : '_Nenhum use case encontrado._',
  '',
  '## Contexto para a IA',
  'Este projeto possui ' + modules.length + ' modulo(s) e ' + useCases.length + ' use case(s).',
  'Consulte .ai/context/ai-handoff.md para regras e contexto completo.',
]

const out = path.join(ROOT, '.ai/docs/cognitive-map.md')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, lines.join('\n'), 'utf-8')
console.log('cognitive-bridge.js: .ai/docs/cognitive-map.md gerado')