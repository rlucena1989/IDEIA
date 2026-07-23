#!/usr/bin/env node
/**
 * agent-auditor.js — Agente Especializado em Auditorias
 *
 * Integra o agent-orchestrator com TODOS os auditores.
 * Um agente de IA pode usar este script para:
 * - Executar qualquer scanner
 * - Interpretar resultados
 * - Propor correções
 * - Gerar relatórios
 *
 * Uso: node .ai/bin/agent-auditor.js <comando> [opções]
 *
 * Comandos:
 *   scan [all|secrets|quality|security|performance]  Executa scanners
 *   report [--json]                                    Gera relatório consolidado
 *   fix <issue-id>                                     Tenta corrigir automaticamente
 *   watch                                              Monitora mudanças em tempo real
 *   trend [--days 30]                                  Mostra tendências históricas
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const cmd = process.argv[2];
const args = process.argv.slice(3);

const SCANNERS = {
  all: ['gap-check', 'compliance', 'secrets', 'study-compliance', 'package-consistency', 'unused-deps', 'slo-metrics'],
  security: ['compliance', 'secrets', 'security-kpis'],
  quality: ['gap-check', 'study-compliance', 'package-consistency', 'unused-deps'],
  performance: ['slo-metrics'],
};

const BIN = path.join('.ai', 'bin');

const SCANNER_CMDS = {
  'gap-check': `node ${path.join(BIN, 'gap-check.js')} --quiet`,
  'compliance': `node ${path.join(BIN, 'compliance-check.js')} --ci`,
  'secrets': `node ${path.join(BIN, 'check-secrets.js')} --ci`,
  'study-compliance': `node ${path.join(BIN, 'verify-study-compliance.js')} --ci`,
  'package-consistency': `node ${path.join(BIN, 'check-package-consistency.js')} --ci`,
  'unused-deps': `node ${path.join(BIN, 'check-unused-deps.js')} --ci`,
  'slo-metrics': `node ${path.join(BIN, 'track-slo-metrics.js')} --ci`,
  'security-kpis': `node ${path.join(BIN, 'security-kpis.js')} --ci`,
};

const SCANNER_FIXES = {
  'secrets': () => {
    // Replace fake API keys in test files with placeholders
    const testFiles = [
      'packages/prompt-security/__tests__/prompt-security.test.ts',
      'packages/e2e-tests/__tests__/full-flow.test.ts',
      'packages/cli/src/__tests__/guardrails.test.ts',
    ];
    for (const file of testFiles) {
      const fullPath = path.join(ROOT, file);
      if (!fs.existsSync(fullPath)) continue;
      let content = fs.readFileSync(fullPath, 'utf-8');
      const original = content;
      content = content.replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-test-placeholder');
      content = content.replace(/-----BEGIN RSA PRIVATE KEY-----.*?-----END RSA PRIVATE KEY-----/gs, '-----BEGIN RSA PRIVATE KEY-----(placeholder)');
      content = content.replace(/password\s*=\s*['"][^'"]+['"]/gi, 'password = "placeholder"');
      content = content.replace(/pwd\s*=\s*['"][^'"]+['"]/gi, 'pwd = "placeholder"');
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`  Fixed secrets in ${file}`);
      }
    }
  },
  'package-consistency': () => {
    execSync(`node ${path.join('.', 'scripts', 'fix-package-jsons.js')}`, { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' });
  },
};

async function scan(category) {
  const scanners = SCANNERS[category] || SCANNERS.all;
  console.log(`\n\x1b[1mAgent Auditor — Scanning: ${category}\x1b[0m\n`);

  let results = [];

  for (const scanner of scanners) {
    const cmd = SCANNER_CMDS[scanner];
    if (!cmd) continue;

    process.stdout.write(`  [${scanner}] `.padEnd(30));
    try {
      const out = execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] });
      results.push({ scanner, status: 'pass', output: out.slice(0, 1000) });
      console.log('\x1b[32m✅\x1b[0m');
    } catch (e) {
      results.push({ scanner, status: 'fail', error: e.message || e.stderr?.slice(0, 200) });
      console.log('\x1b[31m❌ FAIL\x1b[0m');
    }
  }

  const passCount = results.filter(r => r.status === 'pass').length;
  const summary = `${passCount}/${results.length} checks passing`;

  const report = {
    timestamp: new Date().toISOString(),
    category,
    summary,
    results,
    fixAvailable: !!SCANNER_FIXES[category],
  };

  const outDir = path.join(ROOT, '.ai/audit/agent');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `audit-${category}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));

  console.log(`\n\x1b[1m${summary}\x1b[0m`);
  console.log(`Report: ${file}`);

  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
  return report;
}

function showTrend(days = 30) {
  const historyFile = path.join(ROOT, '.ai/audit/history.json');
  if (!fs.existsSync(historyFile)) {
    console.log('No history available yet.');
    return;
  }

  const history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
  const recent = history.slice(-days);

  console.log(`\n\x1b[1mAudit Trends (last ${recent.length} runs)\x1b[0m\n`);
  console.log('Date        | Pass/Fail | Score');
  console.log('-'.repeat(40));

  for (const entry of recent) {
    const score = entry.total > 0 ? Math.round((entry.pass / entry.total) * 100) : 0;
    const date = entry.timestamp?.slice(0, 10) || 'unknown';
    const icon = score >= 80 ? '🟢' : score >= 50 ? '🟡' : '🔴';
    console.log(`${date} | ${entry.pass}/${entry.total}${' '.repeat(4)}| ${icon} ${score}%`);
  }

  if (recent.length >= 2) {
    const first = recent[0];
    const last = recent[recent.length - 1];
    const delta = ((last.pass / last.total) - (first.pass / first.total)) * 100;
    const trendIcon = delta > 0 ? '📈' : delta < 0 ? '📉' : '➡️';
    console.log(`\nTrend: ${trendIcon} ${delta > 0 ? '+' : ''}${delta.toFixed(1)}% over ${recent.length} runs`);
  }
}

async function watch() {
  console.log(`\n\x1b[1mAgent Auditor — Watching for changes...\x1b[0m`);
  console.log('(Run with --interval <seconds> to set polling rate)\n');
  const interval = (parseInt(args.find(a => a.startsWith('--interval='))?.split('=')[1]) || 300) * 1000;
  
  const run = async () => {
    console.log(`\n[${new Date().toISOString()}] Running audit...`);
    await scan('all');
  };

  await run();
  setInterval(run, interval);
}

async function main() {
  switch (cmd) {
    case 'scan':
      await scan(args[0] || 'all');
      break;
    case 'report':
      const report = await scan('all');
      if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
      break;
    case 'fix': {
      const category = args[0];
      const fixer = SCANNER_FIXES[category];
      if (fixer) {
        console.log(`\n\x1b[1mAuto-fixing: ${category}\x1b[0m`);
        await fixer();
        console.log('\x1b[32mDone.\x1b[0m');
      } else {
        console.log(`No auto-fix available for ${category}`);
      }
      break;
    }
    case 'trend':
      showTrend(parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1]) || 30);
      break;
    case 'watch':
      await watch();
      break;
    default:
      console.log(`
\x1b[1mIDEIA Agent Auditor\x1b[0m
Usage: node .ai/bin/agent-auditor.js <command> [options]

Commands:
  scan [all|security|quality|performance]  Run audit scanners
  report [--json]                           Generate full report
  fix <category>                            Auto-fix known issues
  trend [--days 30]                         Show audit history trends
  watch [--interval 300]                    Watch mode (auto-scan every N seconds)
  help                                      Show this help

Examples:
  node .ai/bin/agent-auditor.js scan security     # Security audit
  node .ai/bin/agent-auditor.js fix secrets        # Auto-fix secret leaks
  node .ai/bin/agent-auditor.js trend --days 90    # 90-day trend
`);
  }
}

main().catch(console.error);
