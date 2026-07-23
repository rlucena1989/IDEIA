#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function main() {
  if (process.argv.length < 3) { console.log('OK - no input'); process.exit(0); }
  const root = process.cwd();
  const runtime = path.join(root, '.ai/optimizer/runtime');
  const reports = path.join(root, '.ai/optimizer/reports/latest');
  fs.mkdirSync(reports, { recursive: true });

  const summary = [];
  const files = ['latest-request.json', 'latest-decision.json', 'latest-quality.json', 'latest-risk.json', 'latest-patch.json'];

  for (const file of files) {
    const filePath = path.join(runtime, file);
    if (fs.existsSync(filePath)) {
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        summary.push({ file, content });
      } catch {
        summary.push({ file, error: 'parse error' });
      }
    } else {
      summary.push({ file, error: 'not found' });
    }
  }

  let report = '# Optimizer Report\n\n';
  report += `Generated at: ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `| File | Status |\n|------|--------|\n`;

  for (const item of summary) {
    const status = item.error || 'ok';
    report += `| ${item.file} | ${status} |\n`;
  }

  report += `\n## Details\n\n`;
  for (const item of summary) {
    if (item.content) {
      report += `### ${item.file}\n\n`;
      report += '```json\n';
      report += JSON.stringify(item.content, null, 2);
      report += '\n```\n\n';
    }
  }

  fs.writeFileSync(path.join(reports, 'report.md'), report, 'utf8');
  fs.writeFileSync(
    path.join(reports, 'report.json'),
    JSON.stringify({ generated_at: new Date().toISOString(), summary }, null, 2),
    'utf8'
  );

  console.log(`Report generated: ${reports}`);
  process.exit(0);
}

main();
