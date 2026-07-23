#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname, '../..')
const src = path.join(ROOT, '.ai/templates/aider-task-template.md')
const dst = path.join(ROOT, '.ai/aider/README.md')
fs.copyFileSync(src, dst)
console.log('export-aider-config.js: .ai/aider/README.md atualizado')