#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function main() {
  if (process.argv.length < 3) { console.log('OK - no input'); process.exit(0); }
  const root = process.cwd();
  const runtime = path.join(root, '.ai/optimizer/runtime');
  const reports = path.join(root, '.ai/optimizer/reports/latest');
  fs.mkdirSync(reports, { recursive: true });

  const currentPath = path.join(runtime, 'latest-decision.json');
  const previousPath = path.join(runtime, 'latest-comparison.json');

  const current = fs.existsSync(currentPath)
    ? JSON.parse(fs.readFileSync(currentPath, 'utf8'))
    : {};

  const rawPrevious = fs.existsSync(previousPath)
    ? JSON.parse(fs.readFileSync(previousPath, 'utf8'))
    : {};

  const previous = {
    generated_at: rawPrevious.generated_at,
    differences: rawPrevious.differences || {}
  };

  const comparison = {
    generated_at: new Date().toISOString(),
    previous: previous,
    current: current,
    differences: {}
  };

  if (previous.approval_state !== current.approval_state) {
    comparison.differences.approval_state = {
      from: previous.approval_state,
      to: current.approval_state
    };
  }

  if (previous.risk_level !== current.risk_level) {
    comparison.differences.risk_level = {
      from: previous.risk_level,
      to: current.risk_level
    };
  }

  fs.writeFileSync(path.join(runtime, 'latest-comparison.json'), JSON.stringify(comparison, null, 2), 'utf8');
  fs.writeFileSync(path.join(reports, 'comparison.json'), JSON.stringify(comparison, null, 2), 'utf8');

  console.log(JSON.stringify(comparison, null, 2));
  process.exit(0);
}

main();
