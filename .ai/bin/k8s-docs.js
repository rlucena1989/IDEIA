#!/usr/bin/env node
'use strict'
const { info, printHelp, parseArgs } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('k8s-docs.js', 'node .ai/bin/k8s-docs.js', ['--help  Mostra esta ajuda'])
  process.exit(0)
}

info('Consulte .ai/deployment/k8s.md. Nenhum manifest e aplicado automaticamente por este script.')