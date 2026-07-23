#!/usr/bin/env node
'use strict'

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ROOT, info, warn, fail } = require('./lib/common');

const HANDOFF_PATH = path.join(ROOT, '.ai/context/ai-handoff.md');
const PKG_JSON_PATH = path.join(ROOT, 'package.json');
const MANIFEST_PATH = path.join(ROOT, '.ai/project-manifest.yaml');

function getGitLog() {
    try {
        return execSync('git log -n 5 --oneline', { cwd: ROOT, encoding: 'utf8' });
    } catch (e) {
        return 'Nenhum commit recente ou repositório não inicializado.';
    }
}

function updateHandoff() {
    info('Iniciando Context Agent (TSK-2.1)');

    if (!fs.existsSync(HANDOFF_PATH)) {
        warn('Arquivo ai-handoff.md não encontrado. Pulando Context Agent.');
        return;
    }

    let handoff = fs.readFileSync(HANDOFF_PATH, 'utf8');

    // 1. Atualizar Tarefa Atual com base nos últimos commits
    const gitLog = getGitLog();
    const taskSectionMatch = handoff.match(/## Tarefa atual[\s\S]*?(?=\n## |\Z)/);
    
    if (taskSectionMatch) {
        const newTaskSection = `## Tarefa atual\n_Últimos commits:_\n\`\`\`\n${gitLog.trim()}\n\`\`\`\n_Atualizado via context-agent_`;
        handoff = handoff.replace(taskSectionMatch[0], newTaskSection);
        info('Tarefa atual atualizada com log de commits recentes.');
    }

    // 2. Tentar atualizar a Stack dinamicamente
    if (fs.existsSync(PKG_JSON_PATH)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(PKG_JSON_PATH, 'utf8'));
            const depsCount = Object.keys(pkg.dependencies || {}).length;
            const devDepsCount = Object.keys(pkg.devDependencies || {}).length;
            
            const stackSectionMatch = handoff.match(/## Stack[\s\S]*?(?=\n## |\Z)/);
            if (stackSectionMatch) {
                let stackContent = stackSectionMatch[0];
                if (!stackContent.includes('Dependências Atuais:')) {
                     stackContent += `\n\n*Dependências Atuais:* ${depsCount} prod, ${devDepsCount} dev.`;
                } else {
                     stackContent = stackContent.replace(/Dependências Atuais:.*/, `Dependências Atuais: ${depsCount} prod, ${devDepsCount} dev.`);
                }
                handoff = handoff.replace(stackSectionMatch[0], stackContent);
                info('Seção de stack atualizada.');
            }
        } catch(e) {
            warn('Falha ao processar package.json');
        }
    }

    fs.writeFileSync(HANDOFF_PATH, handoff, 'utf8');
    info('ai-handoff.md salvo com sucesso.');
}

updateHandoff();
