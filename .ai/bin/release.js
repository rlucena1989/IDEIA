#!/usr/bin/env node
// release.js -- valida checklists e artefatos de entrega
'use strict'
const fs = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname, '../..')

const checks = [
  { path: '.ai/checklists/release-readiness-checklist.md', label: 'Release readiness checklist' },
  { path: '.ai/checklists/ai-release-checklist.md', label: 'AI release checklist' },
  { path: '.ai/context/ai-handoff.md', label: 'AI handoff context' },
  { path: '.ai/tasks/current-task.md', label: 'Current task' },
  { path: '.ai/project-manifest.yaml', label: 'Project manifest' },
  { path: '.ai/architecture/adr', label: 'Architecture ADRs', optionalDir: true },
  { path: '.ai/errors/error-catalog.md', label: 'Error catalog' },
  { path: '.ai/technologies/ai-guide.md', label: 'AI delivery guide' },
  { path: '.ai/reports', label: 'Reports directory', optionalDir: true },
]

const requiredInReleaseChecklist = [
  'Prompt de release escolhido: 26-high-quality-delivery.md',
  'Contexto de projeto atualizado em .ai/context/ai-handoff.md',
  'Tarefa atual definida em .ai/tasks/current-task.md',
  'Stack e regras confirmadas em .ai/project-manifest.yaml',
  'Decisões recentes documentadas em .ai/architecture/adr/',
  'Erros e contratos revisados em .ai/errors/error-catalog.md e .ai/contracts/',
]
const requiredInReadinessChecklist = [
  'Todos os testes passando',
  'Segurança revisado',
  'Deploy documentado e rollback previsto',
  'Documentação dos módulos atualizada',
  'Contexto da IA e session-log atualizados',
]

let errors = []
let warnings = []

function exists(file) {
  return fs.existsSync(path.join(ROOT, file))
}

function read(file) {
  const full = path.join(ROOT, file)
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf-8') : ''
}

console.log('\nrelease.js -- validando artefatos de entrega...\n')

for (const check of checks) {
  const full = path.join(ROOT, check.path)
  if (!fs.existsSync(full)) {
    errors.push(`FALHA: ${check.label} ausente (${check.path})`)
    continue
  }
  if (check.optionalDir && fs.statSync(full).isDirectory()) {
    console.log(`OK: ${check.label}`)
    continue
  }
  const content = fs.readFileSync(full, 'utf-8')
  if (content.trim().length === 0) {
    errors.push(`FALHA: ${check.label} vazio (${check.path})`)
  } else {
    console.log(`OK: ${check.label}`)
  }
}

const releaseChecklist = read('.ai/checklists/ai-release-checklist.md')
for (const marker of requiredInReleaseChecklist) {
  if (!releaseChecklist.includes(marker)) {
    warnings.push(`Aviso: item ausente em ai-release-checklist.md => ${marker}`)
  }
}

const readinessChecklist = read('.ai/checklists/release-readiness-checklist.md')
for (const marker of requiredInReadinessChecklist) {
  if (!readinessChecklist.includes(marker)) {
    warnings.push(`Aviso: item ausente em release-readiness-checklist.md => ${marker}`)
  }
}

const reportPath = path.join(ROOT, '.ai/reports/release-report.md')
const reportLines = [
  '# Release Report',
  '',
  `Data: ${new Date().toISOString()}`,
  '',
  '## Status',
  errors.length > 0 ? 'FAILED' : 'OK',
  '',
  '## Erros',
  errors.length > 0 ? errors.map(e => '- ' + e).join('\n') : '- Nenhum',
  '',
  '## Avisos',
  warnings.length > 0 ? warnings.map(w => '- ' + w).join('\n') : '- Nenhum',
  '',
  '## Checagens',
  checks.map(check => `- [${exists(check.path) ? 'x' : ' '}] ${check.label}`).join('\n'),
]
fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf-8')

console.log('\nRelatorio de release gerado: .ai/reports/release-report.md')
if (errors.length > 0) {
  console.error('\nErros detectados:')
  errors.forEach(line => console.error('  ' + line))
  console.error('\nCorrija os erros e execute novamente: npm run ai:release')
  process.exit(1)
}

if (warnings.length > 0) {
  console.warn('\nAvisos:')
  warnings.forEach(line => console.warn('  ' + line))
  console.log('\nRevise os avisos antes de liberar.')
} else {
  console.log('\nRelease validation passed. Pronto para entregar.')
}
