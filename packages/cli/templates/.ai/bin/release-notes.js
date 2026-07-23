#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { ROOT, info, printHelp, parseArgs, readTextSafe, writeTextIdempotent } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('release-notes.js', 'node .ai/bin/release-notes.js [--out <file>] [--since <tag>]', [
    '--out <file>    Output path (default: .ai/release/release-notes-draft.md)',
    '--since <tag>   Git ref to start from (default: last tag)',
    '--help           Show this help'
  ])
  process.exit(0)
}

function getGitLog(since) {
  try {
    const range = since || (function() {
      try { return execSync('git describe --tags --abbrev=0 2>nul', { cwd: ROOT, encoding: 'utf-8' }).trim() } catch(e) { return '' }
    })()
    const cmd = range ? `git log ${range}..HEAD --format="%s"` : 'git log --format="%s"'
    const output = execSync(cmd, { cwd: ROOT, encoding: 'utf-8', stdio: ['pipe','pipe','ignore'] })
    return output.trim().split(/\r?\n/).filter(Boolean)
  } catch (e) {
    return []
  }
}

function parseConventionalCommit(msg) {
  const m = msg.match(/^(\w+)(\(([^)]+)\))?(!)?\s*:\s*(.+)/)
  if (!m) return { type: 'other', scope: '', breaking: false, desc: msg }
  return { type: m[1], scope: m[3] || '', breaking: !!m[4] || msg.includes('BREAKING CHANGE'), desc: m[5].trim() }
}

const commits = getGitLog(args.since)
const parsed = commits.map(parseConventionalCommit)

const byType = {}
const typeLabels = { feat: 'Features', fix: 'Bug Fixes', docs: 'Documentation', style: 'Styles', refactor: 'Refactoring', perf: 'Performance', test: 'Tests', build: 'Build', ci: 'CI', chore: 'Chores', revert: 'Reverts', other: 'Other' }
for (const c of parsed) {
  const key = c.type
  if (!byType[key]) byType[key] = []
  byType[key].push(c)
}

const order = ['feat', 'fix', 'perf', 'refactor', 'test', 'docs', 'style', 'build', 'ci', 'chore', 'revert', 'other']

let hasBreaking = false
let hasFeat = false
let hasFix = false

const lines = [
  '# Release Notes (rascunho)',
  '',
  `Gerado em: ${new Date().toISOString()}`,
  `Commits analisados: ${commits.length}`,
  ''
]

for (const type of order) {
  const items = byType[type]
  if (!items || items.length === 0) continue
  lines.push('## ' + (typeLabels[type] || type))
  lines.push('')
  for (const item of items) {
    const scope = item.scope ? '**' + item.scope + '**: ' : ''
    const breaking = item.breaking ? ' [BREAKING]' : ''
    lines.push('- ' + scope + item.desc + breaking)
  }
  lines.push('')
  if (item && item.breaking) hasBreaking = true
}

for (const c of parsed) {
  if (c.type === 'feat') hasFeat = true
  if (c.type === 'fix') hasFix = true
  if (c.breaking) hasBreaking = true
}

let bump = 'patch'
if (hasBreaking) bump = 'major'
else if (hasFeat) bump = 'minor'

lines.push('## Suggested Version Bump')
lines.push('')
lines.push('- **' + bump.toUpperCase() + '** (' + (hasBreaking ? 'breaking changes detected' : hasFeat ? 'new features' : 'fixes only') + ')')
lines.push('')

const changesetDir = path.join(ROOT, '.changeset')
const changesets = fs.existsSync(changesetDir)
  ? fs.readdirSync(changesetDir).filter(f => f.endsWith('.md') && f !== 'README.md')
  : []
if (changesets.length > 0) {
  lines.push('## Changesets pendentes (' + changesets.length + ')')
  lines.push('')
  changesets.forEach(f => {
    const content = readTextSafe(path.join(changesetDir, f))
    lines.push('### ' + f)
    lines.push('')
    lines.push(content || '(vazio)')
    lines.push('')
  })
}

const done = readTextSafe(path.join(ROOT, '.ai/tasks/done.md'))
if (done) {
  lines.push('## Tarefas concluidas (.ai/tasks/done.md)')
  lines.push('')
  lines.push(done.trim())
  lines.push('')
}

const outPath = path.join(ROOT, args.out || '.ai/release/release-notes-draft.md')
writeTextIdempotent(outPath, lines.join('\n'))
info('Release notes generated: ' + path.relative(ROOT, outPath) + ' (suggested bump: ' + bump + ')')