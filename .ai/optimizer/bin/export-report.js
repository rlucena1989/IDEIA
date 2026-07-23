#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function main() {
  const root = process.cwd();
  const runtime = path.join(root, '.ai/optimizer/runtime');
  const reports = path.join(root, '.ai/optimizer/reports/latest');
  fs.mkdirSync(reports, { recursive: true });

  const exportData = { generated_at: new Date().toISOString(), artifacts: {} };
  const runtimeFiles = fs.readdirSync(runtime);

  for (const file of runtimeFiles) {
    const filePath = path.join(runtime, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      exportData.artifacts[file] = content;
    } catch {
      exportData.artifacts[file] = '(unreadable)';
    }
  }

  fs.writeFileSync(path.join(reports, 'export.json'), JSON.stringify(exportData, null, 2), 'utf8');
  console.log(`Export saved: ${path.join(reports, 'export.json')}`);
  process.exit(0);
}

main();
