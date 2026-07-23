#!/usr/bin/env node
'use strict'

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { ROOT, info, warn, fail } = require('./lib/common');

info('Iniciando Quality Agent (TSK-2.2)');

try {
    info('Rodando verificação de limites (boundaries)...');
    execSync('node .ai/bin/check-boundaries.js', { cwd: ROOT, stdio: 'inherit' });
    info('Boundaries OK.');
} catch (e) {
    warn('Detectada violação de limites (Boundaries).');
    process.exit(1);
}

const staticRuleScanPath = path.join(ROOT, '.ai/bin/static-rule-scan.js');
if (!fs.existsSync(staticRuleScanPath)) {
    warn('Script de rastreio estático ausente: .ai/bin/static-rule-scan.js — pulando static-rule-scan.');
} else {
    try {
        info('Rodando rastreio estático de regras (static-rule-scan)...');
        execSync('node .ai/bin/static-rule-scan.js', { cwd: ROOT, stdio: 'inherit' });
        info('Static Rule Scan OK.');
    } catch (e) {
        warn('Detectada violação de leis arquiteturais.');
        process.exit(1);
    }
}

info('Quality Agent finalizou com sucesso. Nenhuma quebra arquitetural detectada.');
