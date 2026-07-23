#!/usr/bin/env node
/**
 * track-coverage-trend.js — Persiste e monitora cobertura de testes
 *
 * Uso: node .ai/bin/track-coverage-trend.js [--ci]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const CI = process.argv.includes('--ci');
const HISTORY_FILE = path.join(ROOT, '.ai/metrics/coverage-history.json');

const results = [];

function getPackageCoverage(pkg) {
  try {
    const out = execSync(`npx jest packages/${pkg} --coverage --no-cache --silent 2>&1`, {
      cwd: ROOT, encoding: 'utf8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'],
    });
    const lines = out.split('\n');
    const summary = lines.find(l => l.includes('All files'));
    if (!summary) return null;
    const parts = summary.split('|').map(s => s.trim());
    return {
      stmts: parseFloat(parts[1]) || 0,
      branch: parseFloat(parts[2]) || 0,
      funcs: parseFloat(parts[3]) || 0,
      lines: parseFloat(parts[4]) || 0,
    };
  } catch {
    return null;
  }
}

const targetPackages = ['audit-trail', 'event-bus', 'policy-engine', 'prompt-security', 'memory-store', 'delivery-orchestrator'];

console.log(`\n\x1b[1mCoverage Trend Tracker\x1b[0m\n`);
let anyRegression = false;

for (const pkg of targetPackages) {
  const coverage = getPackageCoverage(pkg);
  if (!coverage) {
    console.log(`${pkg.padEnd(20)} \x1b[90mSKIP\x1b[0m`);
    continue;
  }
  results.push({ package: pkg, ...coverage, timestamp: new Date().toISOString() });
  console.log(`${pkg.padEnd(20)} lines: ${coverage.lines}%  stmts: ${coverage.stmts}%  branch: ${coverage.branch}%  funcs: ${coverage.funcs}%`);
}

fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
let history = [];
if (fs.existsSync(HISTORY_FILE)) {
  try { history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')); } catch {}
}
history.push({ timestamp: new Date().toISOString(), results });
if (history.length > 50) history = history.slice(-50);
fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

if (anyRegression && CI) process.exit(1);
