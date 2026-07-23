import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const auditDir = path.join(root, '.ai', 'audit');
const reportsDir = path.join(root, '.ai', 'reports');

interface AuditReport {
  generatedAt: string;
  checks: { name: string; passed: boolean; output?: string }[];
  ledger: { entries: number; valid: boolean } | null;
  timeline: { entries: number; enriched: number } | null;
  pendencies: { open: number; bySeverity: Record<string, number> };
  summary: { total: number; passed: number; failed: number };
}

function runChecks(): AuditReport['checks'] {
  const checkScripts = [
    'check-env', 'check-imports', 'check-duplicates',
    'check-tests', 'check-contracts', 'check-mocks', 'check-flows'
  ];
  return checkScripts.map(name => {
    const result = spawnSync('npx', ['tsx', `scripts/audit/${name}.ts`], { cwd: root, encoding: 'utf8' });
    return { name, passed: result.status === 0, output: result.stdout?.slice(0, 200) };
  });
}

function readJsonl(filePath: string): Record<string, unknown>[] {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim()).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean) as Record<string, unknown>[];
}

function consolidate(): void {
  fs.mkdirSync(auditDir, { recursive: true });

  const checks = runChecks();
  const ledger = readJsonl(path.join(auditDir, 'ledger.jsonl'));
  const timeline = readJsonl(path.join(auditDir, 'timeline.jsonl'));
  const pendencias = readJsonl(path.join(auditDir, 'pendencias.jsonl'));

  const bySeverity: Record<string, number> = {};
  let openPendencies = 0;
  for (const p of pendencias) {
    if (p.status === 'open' || p.status === 'acknowledged') {
      openPendencies++;
      const sev = (p.severity as string) || 'unknown';
      bySeverity[sev] = (bySeverity[sev] || 0) + 1;
    }
  }

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    checks,
    ledger: { entries: ledger.length, valid: true },
    timeline: { entries: timeline.length, enriched: timeline.filter(e => e.event_type).length },
    pendencies: { open: openPendencies, bySeverity },
    summary: { total: checks.length, passed: checks.filter(c => c.passed).length, failed: checks.filter(c => !c.passed).length },
  };

  const outPath = path.join(reportsDir, 'audit-consolidated.json');
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`[consolidate] Report written to ${outPath}`);
  console.log(`[consolidate] ${report.summary.passed}/${report.summary.total} checks passed, ${openPendencies} open pendencies`);

  if (report.summary.failed > 0) process.exit(1);
}

consolidate();
