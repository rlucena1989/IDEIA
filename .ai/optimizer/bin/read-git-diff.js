#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function main() {
  const root = process.cwd();
  const result = spawnSync('git', ['diff', '--unified=2'], {
    cwd: root,
    encoding: 'utf8'
  });

  const diff = result.stdout || '';
  const outDir = path.join(root, '.ai/optimizer/runtime');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'latest-diff.txt'), diff, 'utf8');

  console.log(diff);
  console.log('EXIT_CODE=0');
  process.exit(0);
}

main();
