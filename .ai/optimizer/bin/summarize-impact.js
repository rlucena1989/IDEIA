#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function main() {
  if (process.argv.length < 3) { console.log('OK - no input'); process.exit(0); }
  const requestPath = process.argv[2];
  if (!requestPath) {
    console.error('Usage: summarize-impact.js <request.json>');
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  const root = process.cwd();
  const request = JSON.parse(fs.readFileSync(path.resolve(root, requestPath), 'utf8'));

  const decisionPath = path.join(root, '.ai/optimizer/runtime/latest-decision.json');
  const decision = fs.existsSync(decisionPath)
    ? JSON.parse(fs.readFileSync(decisionPath, 'utf8'))
    : { task_type: request.task_hint || 'unknown', risk_level: 'unknown', risk_score: 0 };

  const files = (request.files || []).join(', ') || 'nenhum arquivo informado';

  const summary = [
    `# Impact Summary`,
    ``,
    `- Request: ${request.id || 'unknown'}`,
    `- Task type: ${decision.task_type || request.task_hint || 'standard'}`,
    `- Risk: ${decision.risk_level} (${decision.risk_score}/100)`,
    `- Files: ${files}`,
    `- Summary: ${request.summary || ''}`,
    `- Details: ${request.details || ''}`
  ].join('\n');

  const outDir = path.join(root, '.ai/optimizer/runtime');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'latest-summary.md'), summary, 'utf8');

  console.log(summary);
  console.log('EXIT_CODE=0');
  process.exit(0);
}

main();
