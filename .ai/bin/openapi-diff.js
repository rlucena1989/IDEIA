#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, warn, fail, printHelp, parseArgs } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('openapi-diff.js', 'node .ai/bin/openapi-diff.js [--baseline <file>] [--current <file>]', [
    '--baseline <file>  Baseline spec (default: .ai/contracts/api-baseline.yaml)',
    '--current <file>   Current spec (default: docs/api/openapi.yaml)',
    '--breaking-only    Only report breaking changes',
    '--help              Show this help'
  ])
  process.exit(0)
}

function extractPathsAndMethods(content) {
  const result = {}
  const lines = content.split(/\r?\n/)
  let inPaths = false
  let currentPath = ''
  for (const line of lines) {
    if (/^paths:/.test(line)) { inPaths = true; continue }
    if (inPaths) {
      if (/^\S/.test(line)) break
      const pm = line.match(/^\s{2}(\/[^:]*):/)
      if (pm) { currentPath = pm[1]; result[currentPath] = new Set(); continue }
      const mm = line.match(/^\s{4}(get|post|put|delete|patch|options|head):/)
      if (mm && currentPath) result[currentPath].add(mm[1])
    }
  }
  return result
}

function extractParams(content) {
  const params = new Set()
  const paramSections = content.matchAll(/parameters?:\s*\n([\s\S]*?)(?=\n\s*\S|$)/g)
  for (const section of paramSections) {
    const lines = section[1].split('\n')
    for (const line of lines) {
      const pm = line.match(/^\s+-\s+name:\s*(\S+)/)
      if (pm) params.add(pm[1])
    }
  }
  return params
}

const baselineFile = path.join(ROOT, args.baseline || '.ai/contracts/api-baseline.yaml')
const currentFile = path.join(ROOT, args.current || 'docs/api/openapi.yaml')
const baseline = fs.existsSync(baselineFile) ? fs.readFileSync(baselineFile, 'utf-8') : ''
const current = fs.existsSync(currentFile) ? fs.readFileSync(currentFile, 'utf-8') : ''

if (!baseline) {
  info('No baseline found. Saving current as baseline.')
  fs.mkdirSync(path.dirname(baselineFile), { recursive: true })
  fs.writeFileSync(baselineFile, current, 'utf-8')
  process.exit(0)
}

const baselineMap = extractPathsAndMethods(baseline)
const currentMap = extractPathsAndMethods(current)

const breaking = []
const added = []
const dependencies = []

for (const [p, methods] of Object.entries(baselineMap)) {
  if (!currentMap[p]) {
    breaking.push('REMOVED path: ' + p)
    continue
  }
  for (const m of methods) {
    if (!currentMap[p].has(m)) breaking.push('REMOVED method: ' + m.toUpperCase() + ' ' + p)
    else if (m === 'post' || m === 'put' || m === 'patch') {
      const bSchema = baseline.match(new RegExp(p + ':[\s\S]*?' + m + ':[\s\S]*?requestBody:[\s\S]*?schema:[\s\S]*?type:\s*(\S+)'))
      const cSchema = current.match(new RegExp(p + ':[\s\S]*?' + m + ':[\s\S]*?requestBody:[\s\S]*?schema:[\s\S]*?type:\s*(\S+)'))
      if (bSchema && cSchema && bSchema[1] !== cSchema[1]) breaking.push('TYPE CHANGED: requestBody of ' + m.toUpperCase() + ' ' + p + ' (' + bSchema[1] + ' -> ' + cSchema[1] + ')')
    }
  }
}

for (const p of Object.keys(currentMap)) {
  if (!baselineMap[p]) {
    added.push('ADDED path: ' + p)
    for (const m of currentMap[p]) added.push('  + ' + m.toUpperCase() + ' ' + p)
  } else {
    for (const m of currentMap[p]) {
      if (!baselineMap[p].has(m)) dependencies.push('NEW method: ' + m.toUpperCase() + ' ' + p)
    }
  }
}

if (breaking.length) {
  info('BREAKING CHANGES (' + breaking.length + '):')
  breaking.forEach(b => console.error('  ❌ ' + b))
}
if (dependencies.length && !args['breaking-only']) {
  info('NON-BREAKING additions (' + dependencies.length + '):')
  dependencies.forEach(d => info(d))
}
if (added.length && !args['breaking-only']) {
  info('New paths (' + added.length + '):')
  added.forEach(a => info(a))
}
if (!breaking.length && !dependencies.length && !added.length) info('No changes detected')
process.exitCode = breaking.length > 0 ? 1 : 0