#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function main() {
  if (process.argv.length < 3) { console.log('OK - no input'); process.exit(0); }
  const root = process.cwd();
  const files = [
    '.ai/optimizer/optimizer.yaml',
    '.ai/optimizer/impact-router.yaml',
    '.ai/optimizer/context-minimizer.yaml',
    '.ai/optimizer/patch-engine.yaml',
    '.ai/optimizer/quality-scoring.yaml',
    '.ai/optimizer/risk-scoring.yaml',
    '.ai/optimizer/schemas/impact-request.schema.json',
    '.ai/optimizer/schemas/context-manifest.schema.json',
    '.ai/optimizer/schemas/patch-manifest.schema.json',
    '.ai/optimizer/schemas/score.schema.json'
  ];

  const missing = files.filter((f) => !fs.existsSync(path.join(root, f)));
  if (missing.length > 0) {
    console.error('Missing optimizer files:');
    for (const file of missing) console.error(`- ${file}`);
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  console.log('Optimizer configuration validated.');
  console.log('EXIT_CODE=0');
  process.exit(0);
}

main();
