#!/usr/bin/env node
'use strict'

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ROOT, info, warn } = require('./lib/common');

const LOG_PATH = path.join(ROOT, '.ai/memory/agent-activity-log.md');

info('Iniciando Audit Agent (TSK-2.3)');

function generateAuditReport() {
    let report = `## Auditoria Semanal (${new Date().toISOString().split('T')[0]})\n\n`;

    // Testar cobertura de boundaries
    try {
        execSync('node .ai/bin/check-boundaries.js', { cwd: ROOT });
        report += `- [x] Boundaries: Nenhuma violação detectada.\n`;
    } catch(e) {
        report += `- [ ] Boundaries: Falhou na verificação. O sistema requer autocura ou intervenção.\n`;
    }

    // Verificar atualização do Contexto
    const handoffPath = path.join(ROOT, '.ai/context/ai-handoff.md');
    if (fs.existsSync(handoffPath)) {
        const stats = fs.statSync(handoffPath);
        const daysOld = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        if (daysOld > 7) {
            report += `- [ ] Contexto: ai-handoff.md desatualizado há mais de ${Math.round(daysOld)} dias.\n`;
        } else {
            report += `- [x] Contexto: Atualizado recentemente.\n`;
        }
    }

    report += '\n---\n\n';

    if (!fs.existsSync(LOG_PATH)) {
        fs.writeFileSync(LOG_PATH, '# Log de Atividades dos Agentes\n\n', 'utf8');
    }

    const currentLog = fs.readFileSync(LOG_PATH, 'utf8');
    fs.writeFileSync(LOG_PATH, currentLog.replace('# Log de Atividades dos Agentes\n\n', '# Log de Atividades dos Agentes\n\n' + report), 'utf8');
    
    info('Relatório de Auditoria anexado em agent-activity-log.md');
}

generateAuditReport();
