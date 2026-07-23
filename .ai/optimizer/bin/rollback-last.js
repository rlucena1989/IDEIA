#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { performance } = require('perf_hooks');

function main() {
  if (process.argv.length < 3) { console.log('OK - no input'); process.exit(0); }
  const root = process.cwd();
  const reports = path.join(root, '.ai/optimizer/reports/latest');
  const runtime = path.join(root, '.ai/optimizer/runtime');
  fs.mkdirSync(reports, { recursive: true });
  fs.mkdirSync(runtime, { recursive: true });

  const rollback = {
    generated_at: new Date().toISOString(),
    action: 'rollback',
    reason: 'manual or validation failure',
    status: 'prepared'
  };

  fs.writeFileSync(path.join(reports, 'rollback.json'), JSON.stringify(rollback, null, 2), 'utf8');
  fs.writeFileSync(path.join(runtime, 'latest-rollback.json'), JSON.stringify(rollback, null, 2), 'utf8');

  const gitCheck = spawnSync('git', ['rev-parse', '--git-dir'], { cwd: root, stdio: 'pipe', shell: true });
  if (gitCheck.status === 0) {
    const hasFiles = spawnSync('git', ['ls-files'], { cwd: root, stdio: 'pipe', shell: true });
    if (hasFiles.stdout && hasFiles.stdout.toString().trim().length > 0) {
      const gitResult = spawnSync('git', ['checkout', '--', '.'], {
        cwd: root, stdio: 'inherit', shell: true
      });
      if ((gitResult.status || 0) !== 0) {
        console.error('Git rollback failed.');
        process.exit(1);
      }
    } else {
      console.log('Empty git repository - no files to rollback.');
    }
  } else {
    console.log('Not a git repository - rollback simulated.');
  }

  console.log(JSON.stringify(rollback, null, 2));
  process.exit(0);
}

main();
