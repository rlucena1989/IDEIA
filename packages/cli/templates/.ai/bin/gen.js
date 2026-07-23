#!/usr/bin/env node
'use strict'
const { printHelp, parseArgs, info } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help || args._.length === 0) {
  printHelp('gen.js', 'node .ai/bin/gen.js <microtemplate> [nome]', [
    'Microgerador de atalho. Delega para generate.js com os mesmos argumentos.',
    '--help  Mostra esta ajuda'
  ])
  process.exit(args.help ? 0 : 1)
}

require('./generate.js')
info('gen.js: use "node .ai/bin/generate.js" diretamente para mais opcoes.')