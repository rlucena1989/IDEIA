#!/usr/bin/env node
// CI script: classifica tipo de tarefa a partir de arquivo de descricao
// Uso: node .ai/bin/classify-task.js --input task.md [--model qwen2:0.5b]

const { spawnSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const inputIdx = args.indexOf('--input');
const modelIdx = args.indexOf('--model');

if (inputIdx === -1) {
  console.error('Uso: classify-task.js --input <file> [--model <model>]');
  process.exit(1);
}

const input = args[inputIdx + 1];
const model = modelIdx !== -1 ? args[modelIdx + 1] : undefined;

const cliArgs = ['ai', 'classify', input];
if (model) cliArgs.push('--model', model);

const cliPath = path.join(__dirname, '..', '..', 'packages', 'cli', 'dist', 'index.js');
const result = spawnSync('node', [cliPath, ...cliArgs], { encoding: 'utf8' });

console.log(result.stdout);
if (result.stderr) console.error(result.stderr);

process.exit(result.status ?? 1);
