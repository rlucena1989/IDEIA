#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

function run(script, args) {
  const result = spawnSync('node', [path.join(process.cwd(), script), ...args], {
    stdio: 'inherit'
  });
  return result.status || 0;
}

function main() {
  if (process.argv.length < 3) { console.log('OK - no input'); process.exit(0); }
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: optimize-request.js <request.json>');
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  const steps = [
    '.ai/optimizer/bin/validate-request.js',
    '.ai/optimizer/bin/analyze-impact.js',
    '.ai/optimizer/bin/get-repository-memory.js',
    '.ai/optimizer/bin/read-git-diff.js',
    '.ai/optimizer/bin/minimize-context.js',
    '.ai/optimizer/bin/summarize-impact.js',
    '.ai/optimizer/bin/generate-patch.js',
    '.ai/optimizer/bin/score-quality.js',
    '.ai/optimizer/bin/score-risk.js'
  ];

  for (const step of steps) {
    const code = run(step, [input]);
    if (code !== 0) {
      console.log('EXIT_CODE=1');
      process.exit(1);
    }
  }

  console.log('Optimizer pipeline completed.');
  console.log('EXIT_CODE=0');
  process.exit(0);
}

main();
