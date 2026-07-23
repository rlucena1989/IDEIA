#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, writeTextIdempotent } = require('./lib/common')
const { render } = require('./lib/templates')

const args = parseArgs(process.argv.slice(2))
const templatePath = args._[0]

if (args.help || !templatePath) {
  printHelp('render-template.js', 'node .ai/bin/render-template.js <template> [--out <arquivo>]', ['--out <arquivo>  Caminho de saida (padrao: stdout)'])
  process.exit(args.help ? 0 : 1)
}

const configPath = path.join(ROOT, 'ai-devkit.config.json')
const vars = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {}

const raw = fs.readFileSync(path.join(ROOT, templatePath), 'utf-8')
const rendered = render(raw, vars)

if (args.out) {
  writeTextIdempotent(path.join(ROOT, args.out), rendered)
  info('Renderizado em ' + args.out)
} else {
  console.log(rendered)
}