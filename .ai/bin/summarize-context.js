#!/usr/bin/env node
// CI script: sumariza contexto de arquivo para perfil especifico
// Uso: node .ai/bin/summarize-context.js --input <file> [--profile feature] [--model qwen2:0.5b]

const { spawnSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const inputIdx = args.indexOf('--input');
const profileIdx = args.indexOf('--profile');
const modelIdx = args.indexOf('--model');

if (inputIdx === -1) {
  console.error('Uso: summarize-context.js --input <file> [--profile <type>] [--model <model>]');
  process.exit(1);
}

const input = args[inputIdx + 1];
const profile = profileIdx !== -1 ? args[profileIdx + 1] : 'general';
const model = modelIdx !== -1 ? args[modelIdx + 1] : undefined;

const cliArgs = ['ai', 'summarize', input, '--profile', profile];
if (model) cliArgs.push('--model', model);

const cliPath = path.join(__dirname, '..', '..', 'packages', 'cli', 'dist', 'index.js');
const result = spawnSync('node', [cliPath, ...cliArgs], { encoding: 'utf8' });

console.log(result.stdout);
if (result.stderr) console.error(result.stderr);

process.exit(result.status ?? 1);
