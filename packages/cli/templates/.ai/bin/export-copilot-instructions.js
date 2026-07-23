#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname, '../..')
const src = path.join(ROOT, '.ai/templates/copilot-instructions-template.md')
const dst = path.join(ROOT, '.github/copilot-instructions.md')
fs.copyFileSync(src, dst)
console.log('export-copilot-instructions.js: .github/copilot-instructions.md gerado')