import fs from 'node:fs';
import path from 'node:path';

const timestamp = new Date().toISOString();

const report = {
  generatedAt: timestamp,
  metadata: {
    project: '@ideia/monorepo',
    version: '1.0.0',
    nodeVersion: process.version,
    platform: process.platform,
  },
  status: 'pending',
  steps: [] as { name: string; status: string; durationMs: number }[],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  },
  notes: [] as string[],
};

const outDir = path.resolve('.ai-devkit');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'audit-report.json'), JSON.stringify(report, null, 2), 'utf8');

console.log(`[write-report] Audit report initialized at ${path.join(outDir, 'audit-report.json')}`);