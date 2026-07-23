#!/usr/bin/env node
const { program } = require('commander');
const { spawnSync } = require('child_process');
const { startChat } = require('./interactive-chat');

program
  .version('1.0.0')
  .description('AI DevKit CLI - The Operating System for AI Development');

program
  .command('init')
  .description('Inicializa a governança do AI DevKit no projeto atual')
  .option('--lang <language>', 'Força um adapter específico (ex: typescript, python, go)')
  .option('--minimal', 'Instalação minimalista de contexto')
  .action((options) => {
     console.log(`Inicializando AI-Devkit. Adapter: ${options.lang || 'auto'} | Minimal: ${!!options.minimal}`);
     // Aqui ele acionaria o setup.js central
  });

program
  .command('heal')
  .description('Roda o processo de self-heal para corrigir regras arquiteturais corrompidas')
  .action(() => {
    console.log('Acionando Self-Heal...');
  });


program
  .command('chat')
  .description('Inicia o modo interativo para diagnóstico assistido em caso de falhas')
  .action(() => {
    startChat();
  });


program
  .command('mcp')
  .description('Inicia o servidor MCP (Model Context Protocol) para escuta da IDE via stdio')
  .action(() => {
    require('./mcp-server');
  });


program
  .command('agent:run')
  .description('Inicia o Loop ReAct permitindo a IA codificar e se auto-corrigir em sandbox')
  .action(() => {
    require('./ai-runner');
  });

program
  .command('prompt <type>')
  .description('Compila e imprime um prompt complexo baseando-se no estágio (ex: review)')
  .action((type) => {
    process.argv = [process.argv[0], process.argv[1], type];
    require('./prompt-engine');
  });

program.parse(process.argv);
