#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, info, printHelp, parseArgs } = require('./lib/common')

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp('generate-docker.js', 'node .ai/bin/generate-docker.js [--out <dir>]', [
    '--out <dir>  Output dir (default: project root)',
    '--port <n>   Exposed port (default: 3000)',
    '--help        Show this help'
  ])
  process.exit(0)
}

const port = args.port || '3000'
const dockerfile = [
  'FROM node:22-alpine AS build',
  'WORKDIR /app',
  'COPY package*.json ./',
  'RUN npm ci',
  'COPY . .',
  'RUN npm run build',
  '',
  'FROM node:22-alpine',
  'WORKDIR /app',
  'ENV NODE_ENV=production',
  'COPY package*.json ./',
  'RUN npm ci --omit=dev && npm cache clean --force',
  'COPY --from=build /app/dist ./dist',
  'RUN addgroup -g 1001 -S nodejs && adduser -S appuser -u 1001 -G nodejs',
  'USER appuser',
  'HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:' + port + '/health || exit 1',
  'EXPOSE ' + port,
  'CMD ["node", "dist/index.js"]',
  ''
]

const dockerignore = [
  'node_modules/',
  'dist/',
  'coverage/',
  '.env',
  '*.log',
  '.DS_Store',
  '*.tsbuildinfo',
  '.ai/docs/',
  '.ai/reports/',
  '.ai/site/',
  '.git/',
  '.github/',
  'README.md',
  ''
]

const out = args.out || ROOT
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'Dockerfile'), dockerfile.join('\n'), 'utf-8')
fs.writeFileSync(path.join(out, '.dockerignore'), dockerignore.join('\n'), 'utf-8')
info('Dockerfile + .dockerignore generated (port ' + port + ', non-root user, healthcheck)')