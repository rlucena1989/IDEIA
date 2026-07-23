#!/usr/bin/env node
/**
 * track-all-metrics.js — Relatório Consolidado de Todas as Métricas do Projeto
 *
 * Coleta: coverage, SLOs, KPIs, gaps, pacotes, workflows, scripts, docs
 *
 * Uso: node .ai/bin/track-all-metrics.js [--json] [--ci]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const AS_JSON = process.argv.includes('--json');
const CI = process.argv.includes('--ci');

const metrics = { timestamp: new Date().toISOString(), categories: {} };

// === Project Structure ===
metrics.categories.structure = {
  packages: fs.readdirSync(path.join(ROOT, 'packages')).length,
  auditScripts: fs.readdirSync(path.join(ROOT, '.ai/bin')).filter(f => f.endsWith('.js')).length,
  workflows: fs.readdirSync(path.join(ROOT, '.github/workflows')).filter(f => f.endsWith('.yml')).length,
  studies: fs.readdirSync(path.join(ROOT, '..', 'docs/ESTUDOS')).filter(f => f.endsWith('.md')).length,
  governance: fs.readdirSync(path.join(ROOT, '..', 'docs/governance')).filter(f => f.endsWith('.md')).length,
};

// === Coverage Threshold ===
try {
  const jestConfig = fs.readFileSync(path.join(ROOT, 'jest.config.js'), 'utf-8');
  const thresholds = jestConfig.match(/coverageThreshold:\s*\{[^}]+\}/s);
  if (thresholds) metrics.categories.coverage = { threshold: thresholds[0].match(/\w+:\s*\d+/g) };
} catch {}

// === Gap Check Status ===
try {
  const out = execSync('node .ai/bin/gap-check.js --quiet 2>&1', { cwd: ROOT, encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
  const passMatch = out.match(/(\d+)\s+pass/);
  const failMatch = out.match(/(\d+)\s+fail/);
  metrics.categories.gaps = { pass: passMatch ? parseInt(passMatch[1]) : 0, fail: failMatch ? parseInt(failMatch[1]) : 0 };
} catch {}

// === Compliance Status ===
try {
  const out = execSync('node .ai/bin/compliance-check.js 2>&1', { cwd: ROOT, encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
  const totalMatch = out.match(/(\d+)\/(\d+)\s+passed/);
  if (totalMatch) metrics.categories.compliance = { pass: parseInt(totalMatch[1]), total: parseInt(totalMatch[2]) };
} catch {}

// === Secrets Status ===
try {
  const out = execSync('node .ai/bin/check-secrets.js 2>&1', { cwd: ROOT, encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
  const critMatch = out.match(/(\d+)\s+critical/);
  const highMatch = out.match(/(\d+)\s+high/);
  metrics.categories.secrets = { critical: critMatch ? parseInt(critMatch[1]) : 0, high: highMatch ? parseInt(highMatch[1]) : 0 };
} catch {}

// === Study Compliance ===
try {
  const out = execSync('node .ai/bin/verify-study-compliance.js 2>&1', { cwd: ROOT, encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
  const m = out.match(/(\d+)\/(\d+)\s+checks\s+passing/);
  if (m) metrics.categories.studyCompliance = { pass: parseInt(m[1]), total: parseInt(m[2]) };
} catch {}

// === Actual Test Coverage ===
try {
  const out = execSync('npx jest packages/audit-trail --coverage --no-cache --silent 2>&1', { cwd: ROOT, encoding: 'utf8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'] });
  const covMatch = out.match(/All files[^|]+\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)/);
  if (covMatch) metrics.categories.actualCoverage = { stmts: covMatch[1], branch: covMatch[2], funcs: covMatch[3], lines: covMatch[4] };
} catch {}

// === Document Registry ===
try {
  const registryContent = fs.readFileSync(path.join(ROOT, '..', '.ai/governance/document-registry.md'), 'utf-8');
  metrics.categories.documentation = { registered: (registryContent.match(/\| `[^`]+`/g) || []).length };
} catch {}

// === Audit History ===
try {
  const historyFile = path.join(ROOT, '.ai/audit/history.json');
  if (fs.existsSync(historyFile)) {
    const history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    metrics.categories.auditHistory = {
      totalRuns: history.length,
      lastRun: history[history.length - 1]?.timestamp,
      averagePassRate: history.length > 0 ? Math.round(history.reduce((s, h) => s + (h.total > 0 ? h.pass / h.total : 0), 0) / history.length * 100) : 0,
    };
  }
} catch {}

// === SLO History ===
try {
  const sloFile = path.join(ROOT, '.ai/metrics/slo-history.json');
  if (fs.existsSync(sloFile)) {
    const sloHistory = JSON.parse(fs.readFileSync(sloFile, 'utf-8'));
    metrics.categories.sloHistory = { totalRuns: sloHistory.length, lastRun: sloHistory[sloHistory.length - 1]?.timestamp };
  }
} catch {}

// === Output ===
if (AS_JSON) {
  console.log(JSON.stringify(metrics, null, 2));
} else {
  console.log(`\n\x1b[1m═══════════════════════════════════════════\x1b[0m`);
  console.log(`\x1b[1m  IDEIA Complete Metrics Report\x1b[0m`);
  console.log(`\x1b[1m  ${metrics.timestamp}\x1b[0m`);
  console.log(`\x1b[1m═══════════════════════════════════════════\x1b[0m\n`);

  for (const [category, data] of Object.entries(metrics.categories)) {
    console.log(`\x1b[36m${category}:\x1b[0m`);
    for (const [key, value] of Object.entries(data)) {
      console.log(`  ${key}: ${value}`);
    }
    console.log();
  }

  console.log(`\n\x1b[1mSummary:\x1b[0m`);
  const gaps = metrics.categories.gaps || {};
  const compliance = metrics.categories.compliance || {};
  console.log(`  GAPS: ${gaps.pass || '?'} pass, ${gaps.fail || '?'} fail`);
  console.log(`  Compliance: ${compliance.pass || '?'}/${compliance.total || '?'}`);
  console.log(`  Coverage threshold: ${metrics.categories.coverage || 'N/A'}`);
  console.log(`  Actual coverage: ${metrics.categories.actualCoverage?.lines || 'N/A'}% lines`);
  console.log(`  Packages: ${metrics.categories.structure?.packages || '?'}`);
  console.log(`  Audit scripts: ${metrics.categories.structure?.auditScripts || '?'}`);
  console.log(`  Workflows: ${metrics.categories.structure?.workflows || '?'}`);
  console.log(`  Documents registered: ${metrics.categories.documentation?.registered || '?'}`);
}

if (CI) process.exit(0);
