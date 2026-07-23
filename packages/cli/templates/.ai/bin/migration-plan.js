#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, slugify } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
const name = args._.join(' ')

if (args.help || !name) {
  printHelp('migration-plan.js', 'node .ai/bin/migration-plan.js <description> [--table <name>]', [
    '<description>   e.g. "add status column to users"',
    '--table <name>   Target table',
    '--help            Show this help'
  ])
  process.exit(args.help ? 0 : 1)
}

const slug = slugify(name)
const now = new Date()
const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
const timestamp = dateStr + now.toTimeString().split(' ')[0].replace(/:/g, '').substring(0, 6)

const outDir = path.join(ROOT, '.ai/database/migration-plans')
fs.mkdirSync(outDir, { recursive: true })

const plan = [
  '# Migration Plan: ' + name,
  '', 'Date: ' + now.toISOString(), 'Status: draft', '',
  '## Objective', name, '',
  '## Pre-migration Checklist',
  '- [ ] Backup database',
  '- [ ] Test migration on staging',
  '- [ ] Review breaking changes',
  '- [ ] Notify team',
  '', '## Schema Changes', ''
  '| Table | Change | Type | Nullable | Default |',
  '|-------|--------|------|----------|---------|',
  '| ' + (args.table || 'PENDING_ACTION') + ' | | | | |',
  '', '## Indexes', '-', ''
  '## Rollback', '-', ''
  '## Expected Duration', '-', ''
  '## Risks', '-', ''
].join('\n')

const planPath = path.join(outDir, dateStr + '-' + slug + '.md')
fs.writeFileSync(planPath, plan, 'utf-8')

const prismaDir = path.join(ROOT, 'prisma/migrations')
if (!fs.existsSync(prismaDir)) fs.mkdirSync(prismaDir, { recursive: true })

const sqlContent = [
  '-- Migration: ' + name,
  '-- Generated: ' + now.toISOString(),
  '', '-- Up',
  '-- ALTER TABLE "' + (args.table || 'table_name') + '" ADD COLUMN "field" TYPE;',
  '', '-- Down (rollback)',
  '-- ALTER TABLE "' + (args.table || 'table_name') + '" DROP COLUMN "field";',
  ''
].join('\n')

const sqlDir = path.join(prismaDir, timestamp + '_' + slug) 
if (!fs.existsSync(sqlDir)) {
  fs.mkdirSync(sqlDir, { recursive: true })
  fs.writeFileSync(path.join(sqlDir, 'migration.sql'), sqlContent, 'utf-8')
  info('SQL skeleton: prisma/migrations/' + timestamp + '_' + slug + '/migration.sql')
}

info('Migration plan: ' + planPath + ' + SQL skeleton')