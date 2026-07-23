#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

function main() {
  const root = process.cwd();
  const runtime = path.join(root, '.ai/optimizer/runtime');
  fs.mkdirSync(runtime, { recursive: true });

  const rejection = {
    approved: false,
    approved_by: 'optimizer-ui',
    approved_at: new Date().toISOString(),
    reason: 'Rejected via optimizer workflow'
  };

  fs.writeFileSync(
    path.join(runtime, 'latest-approval.json'),
    JSON.stringify(rejection, null, 2),
    'utf8'
  );

  const decisionPath = path.join(runtime, 'latest-decision.json');
  const decision = fs.existsSync(decisionPath)
    ? JSON.parse(fs.readFileSync(decisionPath, 'utf8'))
    : {};

  decision.approval_state = 'rejected';
  decision.rejected_at = rejection.approved_at;

  fs.writeFileSync(decisionPath, JSON.stringify(decision, null, 2), 'utf8');
  console.log(JSON.stringify(rejection, null, 2));
  process.exit(0);
}

main();
