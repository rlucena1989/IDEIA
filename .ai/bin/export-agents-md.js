#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname, '../..')
const src = path.join(ROOT, '.ai/templates/agents-template.md')
const dst = path.join(ROOT, '.ai/agents/AGENTS.md')
fs.copyFileSync(src, dst)
console.log('export-agents-md.js: .ai/agents/AGENTS.md atualizado')