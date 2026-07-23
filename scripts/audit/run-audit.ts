import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { existsSync } from 'node:fs';

const SCRIPTS_DIR = path.resolve(__dirname);
const AUDIT_TRAIL_DIR = path.resolve(__dirname, '../../.ai/audit');

function verifyAuditTrail(): void {
  const trailPath = path.join(AUDIT_TRAIL_DIR, 'cli-trail.jsonl');
  if (!existsSync(trailPath)) {
    console.log('[check-ledger] No CLI audit trail found (first run).');
    return;
  }
  try {
    const content = require('fs').readFileSync(trailPath, 'utf-8');
    const events = content.split('\n').filter((l: string) => l.trim()).map((l: string) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter((e: unknown) => e !== null);

    let valid = true;
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1];
      const curr = events[i];
      if (curr.previousHash && prev?.hash && curr.previousHash !== prev.hash) {
        valid = false;
        console.error(`[check-ledger] CHAIN BROKEN at event ${i}: hash mismatch`);
        break;
      }
    }
    if (valid) {
      console.log(`[check-ledger] Audit trail verified: ${events.length} events, chain intact`);
    }
  } catch (err) {
    console.warn('[check-ledger] Could not verify audit trail:', err);
  }
}

type Step = {
  name: string;
  command: string;
  args: string[];
};

const steps: Step[] = [
  { name: 'check-env', command: 'node', args: ['--import', 'tsx/esm', path.join(SCRIPTS_DIR, 'check-env.ts')] },
  { name: 'check-imports', command: 'node', args: ['--import', 'tsx/esm', path.join(SCRIPTS_DIR, 'check-imports.ts')] },
  { name: 'check-duplicates', command: 'node', args: ['--import', 'tsx/esm', path.join(SCRIPTS_DIR, 'check-duplicates.ts')] },
  { name: 'check-tests', command: 'node', args: ['--import', 'tsx/esm', path.join(SCRIPTS_DIR, 'check-tests.ts')] },
  { name: 'check-contracts', command: 'node', args: ['--import', 'tsx/esm', path.join(SCRIPTS_DIR, 'check-contracts.ts')] },
  { name: 'check-mocks', command: 'node', args: ['--import', 'tsx/esm', path.join(SCRIPTS_DIR, 'check-mocks.ts')] },
  { name: 'check-flows', command: 'node', args: ['--import', 'tsx/esm', path.join(SCRIPTS_DIR, 'check-flows.ts')] },
  { name: 'lint', command: 'npm', args: ['run', 'lint'] },
  { name: 'typecheck', command: 'npm', args: ['run', 'typecheck'] },
  { name: 'build', command: 'npm', args: ['run', 'build'] },
  { name: 'test', command: 'npm', args: ['run', 'test'] },
  { name: 'coverage', command: 'npm', args: ['run', 'test:cov'] },
];

const results: { name: string; status: 'passed' | 'failed' }[] = [];
let allPassed = true;

console.log('[check-ledger] Verifying audit trail integrity...');
verifyAuditTrail();

for (const step of steps) {
  process.stdout.write(`\n[run-audit] Running ${step.name}...\n`);
  const shell = process.platform === 'win32' && step.command === 'npm';
  const result = spawnSync(step.command, step.args, { stdio: 'inherit', cwd: process.cwd(), shell });

  if (result.status !== 0) {
    console.error(`[run-audit] FAILED: ${step.name}`);
    results.push({ name: step.name, status: 'failed' });
    allPassed = false;
  } else {
    results.push({ name: step.name, status: 'passed' });
  }
}

console.log('\n[run-audit] === AUDIT SUMMARY ===');
for (const r of results) {
  const icon = r.status === 'passed' ? 'PASS' : 'FAIL';
  console.log(`  [${icon}] ${r.name}`);
}
console.log(`\n[run-audit] ${allPassed ? 'ALL STEPS PASSED' : 'SOME STEPS FAILED'}`);

if (!allPassed) process.exit(1);
