import { spawnSync } from 'node:child_process';
import path from 'node:path';

const SCRIPTS_DIR = path.resolve(__dirname);

const checks: [string, string[]][] = [
  ['npx', ['tsx', path.join(SCRIPTS_DIR, 'run-audit.ts')]],
  ['npm', ['run', 'test:cov']],
];

for (const [cmd, args] of checks) {
  process.stdout.write(`\n[hardening] Running ${cmd} ${args.join(' ')}\n`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: process.cwd() });
  if (result.status !== 0) {
    console.error(`[hardening] Failed step: ${cmd} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n[hardening] System hardened successfully');