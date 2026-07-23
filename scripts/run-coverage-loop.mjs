#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const ITERATIONS = parseInt(process.argv[2] || '10', 10);
const CLI = 'node packages/cli/dist/index.js';

function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 120000, ...opts });
    return { ok: true, stdout: out.trim() };
  } catch (e) {
    return { ok: false, stdout: e.stdout?.trim?.() || '', stderr: e.stderr?.trim?.() || e.message };
  }
}

function readCov(path) {
  try { return JSON.parse(fs.readFileSync(path, 'utf8')); } catch { return null; }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`COVERAGE IMPROVEMENT LOOP — ${ITERATIONS} iterations`);
console.log(`${'='.repeat(60)}\n`);

let iteration = 0;
while (iteration < ITERATIONS) {
  iteration++;
  console.log(`\n--- Iteration ${iteration}/${ITERATIONS} ---\n`);

  // Step 1: Run coverage to get baseline
  console.log('[1/4] Running test:cov:unit...');
  run('npm run test:cov:quick', { timeout: 120000 });
  console.log('  done.');

  // Step 2: Run test-fix-broken
  console.log('[2/4] Running test-fix-broken...');
  const fixResult = run(`node ${CLI} test-fix-broken fix`);
  console.log(`  ${fixResult.stdout || 'done.'}`);

  // Step 3: Run coverage-improve to generate stubs
  console.log('[3/4] Running coverage-improve generate-stubs...');
  const stubResult = run(`node ${CLI} coverage-improve generate-stubs`);
  console.log(`  ${stubResult.stdout || 'done.'}`);

  // Step 4: Build and verify
  console.log('[4/4] Building...');
  run('npm run build', { timeout: 120000 });
  console.log('  done.');

  // Read current coverage
  const summary = readCov('coverage/coverage-summary.json') || readCov('packages/cli/coverage/coverage-summary.json');
  if (summary?.total) {
    const t = summary.total;
    console.log(`\n  Coverage: lines=${t.lines.pct}% functions=${t.functions.pct}% branches=${t.branches.pct}%`);
  }

  console.log(`\n--- Iteration ${iteration} complete ---`);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`LOOP COMPLETE — ${ITERATIONS} iterations`);
console.log(`${'='.repeat(60)}`);

const finalSummary = readCov('coverage/coverage-summary.json');
if (finalSummary?.total) {
  const t = finalSummary.total;
  console.log(`\nFinal coverage: lines=${t.lines.pct}% functions=${t.functions.pct}% branches=${t.branches.pct}%`);
}
