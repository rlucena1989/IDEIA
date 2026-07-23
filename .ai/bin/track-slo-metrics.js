#!/usr/bin/env node
/**
 * track-slo-metrics.js — Mede e registra SLOs reais via tinybench
 *
 * Executa benchmarks nos pacotes core e armazena histórico em .ai/metrics/slo-history.json
 *
 * Uso: node .ai/bin/track-slo-metrics.js [--ci] [--json]
 */

const fs = require('fs');
const path = require('path');
const { Bench } = require('tinybench');

const ROOT = path.resolve(__dirname, '../..');
const CI = process.argv.includes('--ci');
const AS_JSON = process.argv.includes('--json');
const HISTORY_FILE = path.join(ROOT, '.ai/metrics/slo-history.json');

const now = new Date().toISOString();

async function runBenchmarks() {
  const metrics = { timestamp: now, environment: process.env.NODE_ENV || 'development', results: {} };

  // 1. Audit Trail Append
  try {
    let AuditTrail;
    try { AuditTrail = require(path.join(ROOT, 'packages/audit-trail/dist/audit-trail')).AuditTrail; } catch { AuditTrail = require(path.join(ROOT, 'packages/audit-trail/src/audit-trail')).AuditTrail; }
    const { mkdtempSync, rmSync } = require('fs');
    const { join } = require('path');
    const { tmpdir } = require('os');
    const tmpDir = mkdtempSync(join(tmpdir(), 'slo-audit-'));
    const trail = new AuditTrail(join(tmpDir, 'audit.jsonl'));

    const bench = new Bench({ time: 500, iterations: 50 });
    bench.add('audit-append', () => {
      trail.append({ actor: 'ai', eventType: 'test', target: '/test.ts', decision: 'auto', result: 'success' });
    });
    await bench.run();
    const auditResult = bench.tasks[0].result;
    metrics.results['audit-trail-append-ops'] = Math.round(auditResult?.hz || 0);
    metrics.results['audit-trail-append-latency-us'] = Math.round((auditResult?.hz ? 1000000 / auditResult.hz : 0));
    rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {
    metrics.results['audit-trail-append'] = `error: ${e.message}`;
  }

  // 2. Policy Engine Evaluation
  try {
    const { evaluatePolicy } = require(path.join(ROOT, 'packages/policy-engine/src/policy'));
    const bench = new Bench({ time: 500, iterations: 100 });
    bench.add('policy-eval', () => {
      evaluatePolicy({ actionType: 'file.write', resource: 'src/app.ts', riskLevel: 'low' });
    });
    await bench.run();
    const policyResult = bench.tasks[0].result;
    metrics.results['policy-eval-ops'] = Math.round(policyResult?.hz || 0);
    metrics.results['policy-eval-latency-us'] = Math.round((policyResult?.hz ? 1000000 / policyResult.hz : 0));
  } catch (e) {
    metrics.results['policy-eval'] = `error: ${e.message}`;
  }

  // 3. Prompt Security Scan
  try {
    const { PromptSecurity } = require(path.join(ROOT, 'packages/prompt-security/src/prompt-security'));
    const ps = new PromptSecurity();
    const testInput = 'Write a function to calculate fibonacci numbers using recursion';
    const bench = new Bench({ time: 500, iterations: 50 });
    bench.add('prompt-scan', () => { ps.scan(testInput); });
    await bench.run();
    const psResult = bench.tasks[0].result;
    metrics.results['prompt-scan-ops'] = Math.round(psResult?.hz || 0);
    metrics.results['prompt-scan-latency-us'] = Math.round((psResult?.hz ? 1000000 / psResult.hz : 0));
  } catch (e) {
    metrics.results['prompt-scan'] = `error: ${e.message}`;
  }

  // 4. Event Bus Emit
  try {
    const { EventEmitter } = require('events');
    const bus = new EventEmitter();
    let counter = 0;
    bus.on('test', () => counter++);
    const bench = new Bench({ time: 500, iterations: 100 });
    bench.add('event-emit', () => { bus.emit('test'); });
    await bench.run();
    const eventResult = bench.tasks[0].result;
    metrics.results['event-emit-ops'] = Math.round(eventResult?.hz || 0);
    metrics.results['event-emit-latency-us'] = Math.round((eventResult?.hz ? 1000000 / eventResult.hz : 0));
  } catch (e) {
    metrics.results['event-emit'] = `error: ${e.message}`;
  }

  // Save history
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  let history = [];
  if (fs.existsSync(HISTORY_FILE)) {
    try { history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')); } catch {}
  }
  history.push(metrics);
  if (history.length > 100) history = history.slice(-100);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

  return metrics;
}

runBenchmarks().then(metrics => {
  if (AS_JSON) {
    console.log(JSON.stringify(metrics, null, 2));
    process.exit(0);
  }

  console.log(`\n\x1b[1mSLO Metrics — ${metrics.timestamp}\x1b[0m\n`);
  console.log(`${'Metric'.padEnd(35)} ${'Value'.padEnd(15)} Status`);
  console.log(`${'-'.repeat(35)} ${'-'.repeat(15)} ${'-'.repeat(20)}`);

  for (const [key, value] of Object.entries(metrics.results)) {
    const val = typeof value === 'number' ? value.toLocaleString() : String(value);
    const isOk = typeof value === 'number' ? (value > 0 ? '\x1b[32m✅' : '\x1b[31m❌') : '\x1b[33m⚠';
    console.log(`${isOk}\x1b[0m ${key.padEnd(32)} ${val.padEnd(15)}`);
  }

  console.log(`\nHistory: ${HISTORY_FILE}`);
  if (CI) process.exit(0);
}).catch(err => {
  console.error('Benchmark error:', err.message);
  if (CI) process.exit(1);
});
