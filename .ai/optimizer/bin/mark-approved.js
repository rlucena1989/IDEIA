#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

function main() {
  const root = process.cwd();
  const runtime = path.join(root, '.ai/optimizer/runtime');
  fs.mkdirSync(runtime, { recursive: true });

  const approval = {
    approved: true,
    approved_by: 'optimizer-ui',
    approved_at: new Date().toISOString(),
    reason: 'Approved via optimizer workflow'
  };

  fs.writeFileSync(
    path.join(runtime, 'latest-approval.json'),
    JSON.stringify(approval, null, 2),
    'utf8'
  );

  const decisionPath = path.join(runtime, 'latest-decision.json');
  const decision = fs.existsSync(decisionPath)
    ? JSON.parse(fs.readFileSync(decisionPath, 'utf8'))
    : {};

  decision.approval_state = 'approved';
  decision.approved_at = approval.approved_at;

  fs.writeFileSync(decisionPath, JSON.stringify(decision, null, 2), 'utf8');
  console.log(JSON.stringify(approval, null, 2));
  process.exit(0);
}

main();
