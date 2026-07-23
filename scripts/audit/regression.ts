import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['run', 'test'], { stdio: 'inherit', cwd: process.cwd() });

if (result.status !== 0) {
  console.error('[regression] Regression tests failed');
  process.exit(result.status ?? 1);
}

console.log('[regression] Regression suite passed');