#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { ROOT, info, printHelp, parseArgs, writeTextIdempotent } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('init-interactive.js', 'node .ai/bin/init-interactive.js [--reset]', [
    '--reset  Start fresh (ignore existing config)',
    '--help    Show this help'
  ])
  process.exit(0)
}

const FRAMEWORKS = ['none', 'nestjs', 'express', 'fastify']
const DATABASES = ['postgresql', 'mysql', 'mongodb', 'sqlite']
const ORMS = ['prisma', 'typeorm', 'mongoose', 'none']
const FEATURES = ['auth', 'users', 'roles', 'audit', 'api-docs', 'file-upload', 'email', 'queue']

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = q => new Promise(resolve => rl.question(q + ' ', resolve))
const pick = async (q, options, def) => {
  const opts = options.map((o, i) => (i + 1) + '. ' + o + (o === def ? ' (default)' : '')).join(' | ')
  const ans = await ask(q + ' [' + opts + ']')
  const idx = parseInt(ans, 10) - 1
  if (idx >= 0 && idx < options.length) return options[idx]
  return def
}

async function main() {
  const configPath = path.join(ROOT, 'ai-devkit.config.json')
  const current = (!args.reset && fs.existsSync(configPath)) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {}
  const manifestPath = path.join(ROOT, '.ai/project-manifest.yaml')

  console.log('')
  info('ai-devkit v12.1 — Project Initialization Wizard')
  console.log('')

  const projectName = (await ask('Project name (' + (current.projectName || 'my-app') + '):')) || current.projectName || 'my-app'
  const description = (await ask('Description:')) || current.description || ''

  const framework = await pick('Backend framework:', FRAMEWORKS, current.framework || 'nestjs')
  const database = await pick('Database:', DATABASES, current.database || 'postgresql')
  const orm = await pick('ORM:', ORMS, current.orm || 'prisma')
  const pkgMgr = (await ask('Package manager (npm|yarn|pnpm) (' + (current.packageManager || 'npm') + '):')) || current.packageManager || 'npm'

  console.log('')
  info('Select features to include (comma-separated numbers):')
  FEATURES.forEach((f, i) => console.log('  ' + (i + 1) + '. ' + f))
  const selected = (await ask('Features:'))
  const featureList = selected.split(/[,\s]+/).map(s => parseInt(s, 10)).filter(n => n > 0 && n <= FEATURES.length).map(n => FEATURES[n - 1])

  rl.close()
  console.log('')

  const config = {
    projectName, description, framework, database, orm, packageManager: pkgMgr,
    stack: 'typescript-node', architecture: 'clean-architecture-modular-monolith',
    features: featureList
  }

  writeTextIdempotent(configPath, JSON.stringify(config, null, 2) + '\n')
  info('ai-devkit.config.json updated')

  const manifestDef = {
    project: { name: projectName, description, version: '0.1.0', status: 'discovery', createdAt: new Date().toISOString().split('T')[0] },
    stack: { language: 'typescript', runtime: 'nodejs', framework, database, orm, testing: 'jest', packageManager: pkgMgr },
    architecture: { pattern: 'clean-architecture', style: 'modular-monolith', layers: ['domain', 'application', 'infrastructure'] }
  }

  if (!args.reset && fs.existsSync(manifestPath)) {
    info('.ai/project-manifest.yaml preserved (use --reset to overwrite)')
  } else {
    writeTextIdempotent(manifestPath, Object.entries(manifestDef).map(([k, v]) => k + ':' + '\n' + Object.entries(v).map(([sk, sv]) => '  ' + sk + ': ' + (typeof sv === 'string' ? '"' + sv + '"' : Array.isArray(sv) ? JSON.stringify(sv) : sv)).join('\n')).join('\n\n') + '\n')
    info('.ai/project-manifest.yaml generated')
  }

  if (featureList.length > 0) {
    const featureMd = ['# Features', '', 'Selected during init:', '']
    featureList.forEach(f => featureMd.push('- [ ] ' + f))
    featureMd.push('')
    writeTextIdempotent(path.join(ROOT, '.ai/features/_selected.md'), featureMd.join('\n'))
    info(featureList.length + ' feature(s) registered in .ai/features/_selected.md')
  }

  info('Project initialized: ' + projectName + ' (' + framework + ' + ' + database + ' + ' + orm + ')')
}

main()