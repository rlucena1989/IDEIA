#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { ROOT, info, printHelp, parseArgs, readTextSafe, writeTextIdempotent } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('update-memory.js', 'node .ai/bin/update-memory.js [--message <text>] [--session-only]', [
    '--message <text>   Message to append to session log',
    '--session-only      Only update session log (skip decisions/open-questions)',
    '--help               Show this help'
  ])
  process.exit(0)
}

const now = new Date().toISOString()
let message = args.message || args._.join(' ')

function getGitChanges() {
  try {
    const changed = execSync('git diff --name-only HEAD', { cwd: ROOT, encoding: 'utf-8', stdio: ['pipe','pipe','ignore'] }).trim()
    const staged = execSync('git diff --name-only --cached', { cwd: ROOT, encoding: 'utf-8', stdio: ['pipe','pipe','ignore'] }).trim()
    const files = [...new Set([...changed.split(/\r?\n/).filter(Boolean), ...staged.split(/\r?\n/).filter(Boolean)])]
    return files
  } catch (e) { return [] }
}

if (!message) {
  const files = getGitChanges()
  if (files.length > 0) {
    message = 'Modified ' + files.length + ' file(s): ' + files.slice(0, 10).join(', ') + (files.length > 10 ? '...' : '')
  } else {
    message = 'Manual session checkpoint at ' + now
  }
}

const sessionLog = path.join(ROOT, '.ai/memory/session-log.md')
const existing = readTextSafe(sessionLog) || '# Session Log\n\n'
const entry = '\n## ' + now.split('T')[0] + '\n\n- **' + now.split('T')[1].split('.')[0] + '**: ' + message + '\n'
writeTextIdempotent(sessionLog, existing + entry)
info('Session log updated: .ai/memory/session-log.md')

if (!args['session-only']) {
  const decisionsPath = path.join(ROOT, '.ai/memory/decisions-log.md')
  const decisions = readTextSafe(decisionsPath) || ''
  if (!decisions.includes(now.split('T')[0])) {
    writeTextIdempotent(decisionsPath, decisions + '\n- [' + now.split('T')[0] + '] Session recorded via update-memory.js\n')
    info('Decisions file touched')
  }

  const questionsPath = path.join(ROOT, '.ai/memory/open-questions.md')
  const questions = readTextSafe(questionsPath) || ''
  if (questions.trim() === '# Open Questions') {
    writeTextIdempotent(questionsPath, '# Open Questions\n\n- Liste duvidas, riscos e perguntas abertas.\n')
  }
}

const files = getGitChanges()
if (files.length > 0) {
  info(files.length + ' changed file(s) detected via git')
}