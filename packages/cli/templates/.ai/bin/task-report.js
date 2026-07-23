#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, readTextSafe, writeTextIdempotent } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('task-report.js', 'node .ai/bin/task-report.js [--json] [--gh-issues]', [
    '--json         Output JSON instead of Markdown',
    '--gh-issues    Export as GitHub Issues CSV',
    '--help          Show this help'
  ])
  process.exit(0)
}

function countTasks(content) {
  if (!content) return 0
  return (content.match(/^- \[([ x])\]/gm) || []).length
}

function countCompleted(content) {
  if (!content) return 0
  return (content.match(/^- \[[xX]\]/gm) || []).length
}

const current = readTextSafe(path.join(ROOT, '.ai/tasks/current-task.md')) || ''
const done = readTextSafe(path.join(ROOT, '.ai/tasks/done.md')) || ''
const blocked = readTextSafe(path.join(ROOT, '.ai/tasks/blocked.md')) || ''
const backlog = readTextSafe(path.join(ROOT, '.ai/tasks/backlog.md')) || ''

const metrics = {
  current: { total: countTasks(current), done: countCompleted(current) },
  backlog: { total: countTasks(backlog), done: countCompleted(backlog) },
  done: { total: countTasks(done), done: countCompleted(done) },
  blocked: { total: countTasks(blocked), done: countCompleted(blocked) },
}

const totalTasks = metrics.current.total + metrics.backlog.total + metrics.done.total + metrics.blocked.total
const totalDone = metrics.current.done + metrics.backlog.done + metrics.done.done + metrics.blocked.done
const pct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0

if (args.json) {
  console.log(JSON.stringify({
    generated: new Date().toISOString(),
    metrics,
    totals: { tasks: totalTasks, completed: totalDone, percentage: pct },
    hasCurrentTask: current.trim().length > 0,
    hasBlockers: blocked.trim().length > 0
  }, null, 2))
  process.exit(0)
}

if (args['gh-issues']) {
  const csv = ['title,labels,state']
  const extractTasks = (text, state, labels) => {
    if (!text) return
    const matches = text.match(/^- \[[ xX]\] (.+)/gm)
    if (!matches) return
    matches.forEach(m => {
      const title = m.replace(/^- \[[ xX]\] /, '').replace(/"/g, '""')
      csv.push('"' + title + '",' + labels + ',' + state)
    })
  }
  extractTasks(backlog, 'open', 'backlog')
  extractTasks(blocked, 'open', 'blocked')
  extractTasks(current, 'in_progress', 'current')
  extractTasks(done, 'closed', 'done')
  const out = path.join(ROOT, '.ai/reports/github-issues.csv')
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, csv.join('\n'), 'utf-8')
  info('GitHub Issues CSV exported: ' + out + ' (' + (csv.length - 1) + ' issues)')
  process.exit(0)
}

const barLen = 30
const filled = Math.round((pct / 100) * barLen)
const burndown = '█'.repeat(filled) + '░'.repeat(barLen - filled)

const content = [
  '# Task Report',
  '',
  'Gerado em ' + new Date().toISOString(),
  '',
  '## Progresso',
  '',
  '| Métrica | Valor |',
  '|----------|-------|',
  '| Total de tasks | ' + totalTasks + ' |',
  '| Completas | ' + totalDone + ' |',
  '| Progresso | ' + pct + '% ' + burndown + ' |',
  '| Pendentes | ' + (totalTasks - totalDone) + ' |',
  '',
  '```',
  'Progress: [' + burndown + '] ' + pct + '%',
  '```',
  '',
  '## Detalhamento',
  '',
  '| Fila | Total | Concluídas |',
  '|------|-------|------------|',
  '| Backlog | ' + metrics.backlog.total + ' | ' + metrics.backlog.done + ' |',
  '| Em andamento | ' + metrics.current.total + ' | ' + metrics.current.done + ' |',
  '| Bloqueadas | ' + metrics.blocked.total + ' | ' + metrics.blocked.done + ' |',
  '| Concluídas | ' + metrics.done.total + ' | ' + metrics.done.done + ' |',
  '',
  '## Tarefa atual',
  current.trim() || '_Nenhuma tarefa em andamento._',
  '',
  '## Bloqueadas',
  blocked.trim() || '_Nenhuma._',
  '',
  '## Concluidas',
  done.trim() || '_Nenhuma._',
  ''
].join('\n')

const out = path.join(ROOT, '.ai/reports/task-report.md')
writeTextIdempotent(out, content)
info('.ai/reports/task-report.md gerado (' + totalTasks + ' tasks, ' + pct + '% concluido)')