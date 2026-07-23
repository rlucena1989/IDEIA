#!/usr/bin/env node
const readline = require('readline');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function startChat() {
    const root = process.cwd();
    const logPath = path.join(root, '.ai/memory/decisions-log.md');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log(chalk.cyan('\n=== AI-Devkit: Modo de Resolução Guiada (Chat) ==='));
    console.log(chalk.gray('Detectamos que você solicitou ajuda interativa.\n'));

    rl.question(chalk.yellow('[?] O que quebrou na sua arquitetura ou no AI-Devkit? \n> '), (answer) => {
        if (!answer.trim()) {
            console.log(chalk.red('Sessão encerrada.'));
            rl.close();
            return;
        }

        // Ação Real 1: Gravar a intenção no Log de Decisões
        const logEntry = `| ${new Date().toLocaleDateString()} | Modo Interativo (Chat) | O desenvolvedor reportou: "${answer}". O devkit acionou a suite de prevenção. | A IA deve focar na correção dessa quebra na próxima iteração. |\n`;
        
        if (fs.existsSync(logPath)) {
            fs.appendFileSync(logPath, logEntry);
            console.log(chalk.green(`\n[OK] Problema reportado fisicamente em .ai/memory/decisions-log.md`));
        }

        // Ação Real 2: Acionar preventivamente a engine de Health Check
        console.log(chalk.cyan('\n[Ação Ativa] Rodando verificação de saúde com base na sua denúncia...'));
        const verifyBin = path.join(root, '.ai/bin/verify.js');
        const result = spawnSync('node', [verifyBin], { stdio: 'inherit', cwd: root });

        if (result.status !== 0) {
            console.log(chalk.red('\n⚠️ Os Quality Gates confirmam a falha. Por favor, acione "npx ai-devkit heal" para tentar autocura.'));
        } else {
            console.log(chalk.green('\n✅ Curiosamente, os Quality Gates não detectaram quebra de regras (Clean Architecture). Pode ser um erro de regra de negócio (Humana).'));
        }
        
        rl.close();
    });
}

module.exports = { startChat };
