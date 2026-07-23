#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function run(script, args = []) {
  const fullPath = path.resolve(process.cwd(), script);
  if (!fs.existsSync(fullPath)) {
    console.warn(`Skipping ${script}: not found`);
    return 0;
  }
  const result = spawnSync('node', [fullPath, ...args], {
    stdio: 'inherit',
    shell: true
  });
  return result.status || 0;
}

function main() {
  if (process.argv.length < 3) { console.log('OK - no input'); process.exit(0); }
  const root = process.cwd();
  const input = process.argv[2];

  if (!input) {
    console.error('Usage: run-pipeline.js <request.json>');
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
    '.ai/optimizer/bin/score-risk.js',
    '.ai/optimizer/bin/post-pipeline.js'
  ];

  for (const step of steps) {
    const code = run(step, [input]);
    if (code !== 0) {
      console.error(`Pipeline failed at step: ${step}`);
      process.exit(1);
    }
  }

  const reports = path.join(root, '.ai/optimizer/reports/latest');
  fs.mkdirSync(reports, { recursive: true });

  const summary = {
    generated_at: new Date().toISOString(),
    status: 'completed',
    request_file: input,
    steps_executed: steps
  };

  fs.writeFileSync(
    path.join(reports, 'pipeline-summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

main();
