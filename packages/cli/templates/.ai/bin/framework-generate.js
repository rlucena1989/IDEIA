#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, writeTextIdempotent, slugify } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
const framework = args._[0]
const name = args._[1]

if (args.help || !framework || !name) {
  printHelp('framework-generate.js', 'node .ai/bin/framework-generate.js <nestjs|express|fastify> <nome>', ['--help  Mostra esta ajuda'])
  process.exit(args.help ? 0 : 1)
}

const slug = slugify(name)
const pascal = slug.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('')

const templates = {
  nestjs: { src: '.ai/frameworks/nestjs/module.template.ts', out: 'src/modules/' + slug + '/' + pascal + '.module.ts', replace: [['__MODULE_NAME__', pascal]] },
  express: { src: '.ai/frameworks/express/route.template.ts', out: 'src/modules/' + slug + '/' + slug + '.routes.ts', replace: [['__ROUTE_NAME__', slug]] },
  fastify: { src: '.ai/frameworks/fastify/plugin.template.ts', out: 'src/modules/' + slug + '/' + slug + '.plugin.ts', replace: [['__PLUGIN_NAME__', pascal], ['__ROUTE_NAME__', slug]] },
}

const tpl = templates[framework]
if (!tpl) { console.error('Framework desconhecido: ' + framework); process.exit(1) }

let content = fs.readFileSync(path.join(ROOT, tpl.src), 'utf-8')
tpl.replace.forEach(([find, value]) => { content = content.split(find).join(value) })

writeTextIdempotent(path.join(ROOT, tpl.out), content)
info(tpl.out + ' gerado')