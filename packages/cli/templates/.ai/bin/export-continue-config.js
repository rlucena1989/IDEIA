#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname, '../..')
const src = path.join(ROOT, '.ai/templates/continue-config-template.json')
const dst = path.join(ROOT, '.continue/config.json')
fs.copyFileSync(src, dst)
console.log('export-continue-config.js: .continue/config.json gerado')