#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname, '../..')
const source = path.join(ROOT, '.ai/rules/global.rules.md')
const dest = path.join(ROOT, '.ai/rules/exported-rules.md')
fs.copyFileSync(source, dest)
console.log('export-cursor-rules.js: Regras exportadas para .ai/rules/exported-rules.md')