'use strict'
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '../..')

function readJson(file) {
  const p = path.join(ROOT, file)
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : {}
}

module.exports = { ROOT, readJson }
