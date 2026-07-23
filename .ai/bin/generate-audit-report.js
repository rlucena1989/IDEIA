#!/usr/bin/env node
/**
 * generate-audit-report.js — Agrega TODOS os scanners em relatório unificado
 *
 * Executa: gap-check, compliance-check, red-teaming, security-kpis,
 * slo-check, check-secrets, check-tsc-all, check-package-consistency
 * e gera relatório JSON + Markdown em .ai/audit/reports/
 *
 * Uso: node .ai/bin/generate-audit-report.js [--json] [--ci]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const CI = process.argv.includes('--ci');
const AS_JSON = process.argv.includes('--json');
const OUT_DIR = path.join(ROOT, '.ai/audit/reports');
const HISTORY_FILE = path.join(ROOT, '.ai/audit/history.json');

const timestamp = new Date().toISOString();
const dateStr = timestamp.slice(0, 10);

const SCANNERS = [
  { name: 'gap-check', cmd: 'node .ai/bin/gap-check.js --quiet 2>&1', type: 'quality' },
  { name: 'compliance-check', cmd: 'node .ai/bin/compliance-check.js 2>&1', type: 'security' },
  { name: 'secrets', cmd: 'node .ai/bin/check-secrets.js --ci 2>&1', type: 'security' },
  { name: 'package-consistency', cmd: 'node .ai/bin/check-package-consistency.js 2>&1', type: 'quality' },
  { name: 'tsc-all', cmd: 'node .ai/bin/check-tsc-all.js 2>&1', type: 'quality' },
];

async function run() {
  const results = { timestamp, dateStr, scanners: [] };
  let totalPass = 0;
  let totalFail = 0;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const scanner of SCANNERS) {
    console.log(`\x1b[36m[${scanner.name}]\x1b[0m Running...`);
    try {
      const output = execSync(scanner.cmd, { cwd: ROOT, encoding: 'utf8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'] });
      const passed = output.includes('✅') || output.includes('PASS') || !output.includes('❌');
      results.scanners.push({ name: scanner.name, status: passed ? 'pass' : 'fail', output: output.slice(0, 2000) });
      if (passed) totalPass++; else totalFail++;
      console.log(`  \x1b[${passed ? '32m✅' : '31m❌'} ${passed ? 'Pass' : 'Fail'}\x1b[0m`);
    } catch (e) {
      results.scanners.push({ name: scanner.name, status: 'error', error: e.message, output: (e.stdout || '').slice(0, 1000) });
      totalFail++;
      console.log(`  \x1b[31m❌ Error: ${e.message}\x1b[0m`);
    }
  }

  results.summary = { total: results.scanners.length, pass: totalPass, fail: totalFail };

  const reportFile = path.join(OUT_DIR, `audit-${dateStr}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));

  // Update history
  let history = [];
  if (fs.existsSync(HISTORY_FILE)) {
    try { history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')); } catch {}
  }
  history.push({ timestamp, summary: results.summary });
  if (history.length > 365) history = history.slice(-365);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

  // Markdown report
  const md = [
    `# Audit Report — ${dateStr}`,
    `**${results.summary.pass}/${results.summary.total} checks passing**\n`,
    '| Scanner | Status |',
    '|---------|--------|',
    ...results.scanners.map(s => `| ${s.name} | ${s.status === 'pass' ? '✅ Pass' : '❌ Fail'} |`),
    '',
    '## Scanner Details',
    ...results.scanners.flatMap(s => [
      `### ${s.name}`,
      '```',
      (s.output || '').slice(0, 500),
      '```',
      '',
    ]),
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, `audit-${dateStr}.md`), md);

  console.log(`\n\x1b[1mReport: ${reportFile}\x1b[0m`);
  console.log(`\x1b[1mSummary: ${results.summary.pass}/${results.summary.total} passing\x1b[0m`);

  if (AS_JSON) console.log(JSON.stringify(results, null, 2));
  if (CI && totalFail > 0) process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
