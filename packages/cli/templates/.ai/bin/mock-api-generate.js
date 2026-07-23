#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs, slugify } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
const name = args._.join(' ')

if (args.help || !name) {
  printHelp('mock-api-generate.js', 'node .ai/bin/mock-api-generate.js <scenario-name> [--port <n>]', [
    '--port <n>  Port for mock server (default: 3001)',
    '--help       Show this help'
  ])
  process.exit(args.help ? 0 : 1)
}

const slug = slugify(name)
const port = args.port || '3001'

const mockDir = path.join(ROOT, 'mock-server')
const routesDir = path.join(mockDir, 'routes')
fs.mkdirSync(routesDir, { recursive: true })

const serverContent = [
  'const express = require(\'express\')'
  'const app = express()'
  'const PORT = process.env.MOCK_PORT || ' + port
  ''
  'app.use(express.json())'
  ''
  'app.get(\'/health\', (req, res) => res.json({ status: \'ok\' }))'
  ''
  'require(\'./routes/' + slug + '\')(app)'
  ''
  'app.listen(PORT, () => console.log(\'Mock API: http://localhost:\' + PORT))'
  ''
].join('\n')

const routeContent = [
  "module.exports = function(app) {"
  "  app.get('/api/v1/" + slug + "s', (req, res) => {"
  "    res.json({ data: [], meta: { total: 0, page: 1, perPage: 20, totalPages: 0 } })"
  "  })"
  "  app.get('/api/v1/" + slug + "s/:id', (req, res) => {"
  "    res.json({ id: req.params.id })"
  "  })"
  "  app.post('/api/v1/" + slug + "s', (req, res) => {"
  "    res.status(201).json({ id: 'new-id', ...req.body })"
  "  })"
  "}"
  ''
].join('\n')

const serverPath = path.join(mockDir, 'server.js')
if (!fs.existsSync(serverPath)) fs.writeFileSync(serverPath, serverContent, 'utf-8')
const routePath = path.join(routesDir, slug + '.js')
if (!fs.existsSync(routePath)) fs.writeFileSync(routePath, routeContent, 'utf-8')

info('Mock API generated: mock-server/server.js + mock-server/routes/' + slug + '.js (port ' + port + ')')