#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, writeTextIdempotent, readTextSafe } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('generate-c4.js', 'node .ai/bin/generate-c4.js [--out <dir>]', [
    '--out <dir>   Output directory (default: .ai/architecture/c4/)',
    '--help         Show this help'
  ])
  process.exit(0)
}

const outDir = path.join(ROOT, args.out || '.ai/architecture/c4')
fs.mkdirSync(outDir, { recursive: true })

const modulesDir = path.join(ROOT, 'src/modules')
const foundModules = fs.existsSync(modulesDir)
  ? fs.readdirSync(modulesDir).filter(d => fs.statSync(path.join(modulesDir, d)).isDirectory())
  : []

const manifest = readTextSafe(path.join(ROOT, '.ai/project-manifest.yaml')) || ''
const projectName = (manifest.match(/name:\\s*"?([^"\\n]+)"?/)?.[1] || 'app')
const now = new Date().toISOString()

const ctx = [
  '# C4 Context — ' + projectName, ''
]
ctx.push('Generated: ' + now, '')
ctx.push('```mermaid')
ctx.push('C4Context')
ctx.push('  title System Context for ' + projectName)
ctx.push('  Person(user, \'User\', \'Application user\')')
ctx.push('  System(app, \'' + projectName + '\', \'Backend API\')')
ctx.push('  System_Ext(db, \'Database\', \'Data storage\')')
ctx.push('  Rel(user, app, \'Uses\')')
ctx.push('  Rel(app, db, \'Reads/Writes\')')
ctx.push('```')

const container = [
  '# C4 Container — ' + projectName, ''
]
container.push('Generated: ' + now, '')
container.push('```mermaid')
container.push('C4Container')
container.push('  title Container for ' + projectName)
container.push('  Person(user, \'User\')')
container.push('  Container(api, \'REST API\', \'Node.js/TypeScript\', \'Exposes API endpoints\')')
container.push('  ContainerDb(db, \'Database\', \'PostgreSQL\', \'Persistent storage\')')
container.push('  Rel(user, api, \'HTTPS\')')
container.push('  Rel(api, db, \'SQL\')')
container.push('```')

const comp = [
  '# C4 Component — ' + projectName, ''
]
comp.push('Generated: ' + now, '')
comp.push('```mermaid')
comp.push('C4Component')
comp.push('  title Components for ' + projectName)

for (const m of foundModules) {
  const base = path.join(modulesDir, m)
  if (fs.existsSync(path.join(base, 'presentation/controllers'))) {
    comp.push('  Component(' + m + '_ctrl, \'' + m + ' Controller\', \'HTTP\')')
  }
  if (fs.existsSync(path.join(base, 'application/usecases'))) {
    comp.push('  Component(' + m + '_uc, \'' + m + ' UseCases\', \'TypeScript\')')
  }
  if (fs.existsSync(path.join(base, 'infrastructure/repositories'))) {
    comp.push('  Component(' + m + '_repo, \'' + m + ' Repository\', \'TypeScript\')')
  }
}
comp.push('```')

writeTextIdempotent(path.join(outDir, 'context.md'), ctx.join('\\n'))
writeTextIdempotent(path.join(outDir, 'container.md'), container.join('\\n'))
writeTextIdempotent(path.join(outDir, 'component.md'), comp.join('\\n'))

info('C4 diagrams generated in .ai/architecture/c4/ (' + foundModules.length + ' modules)')