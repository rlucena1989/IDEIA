import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { Gap } from './types';

function readScorecardFailures(): string[] {
  const latestPath = '.ai/reports/scorecard/latest.json';
  if (!fs.existsSync(latestPath)) return [];

  try {
    const data = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
    const failures: string[] = [];
    for (const cat of data.categories ?? []) {
      for (const item of cat.items ?? []) {
        if (!item.passed) {
          failures.push(`[${cat.name}] ${item.description}`);
        }
      }
    }
    return failures;
  } catch {
    return [];
  }
}

function scanNpmAudit(): Gap[] {
  try {
    const output = execSync('npm audit --json 2>&1', { stdio: 'pipe', timeout: 30000 }).toString();
    const data = JSON.parse(output);
    const gaps: Gap[] = [];
    const vulns = data.metadata?.vulnerabilities;
    if (vulns) {
      if ((vulns.critical ?? 0) > 0) gaps.push({ id: 'audit-critical', severity: 'high', description: `${vulns.critical} vulnerabilidade(s) critica(s) em dependencias` });
      if ((vulns.high ?? 0) > 0) gaps.push({ id: 'audit-high', severity: 'medium', description: `${vulns.high} vulnerabilidade(s) alta(s) em dependencias` });
    }
    return gaps;
  } catch {
    return [];
  }
}

export function detectGaps(): Gap[] {
  const gaps: Gap[] = [];
  const seen = new Set<string>();

  // Scorecard failures
  for (const failure of readScorecardFailures()) {
    if (!seen.has(failure)) {
      seen.add(failure);
      const isHigh = failure.includes('Seguranca') || failure.includes('Cobertura') || failure.includes('Security');
      gaps.push({ id: `fail-${gaps.length + 1}`, severity: isHigh ? 'high' : 'medium', description: failure });
    }
  }

  // NPM audit
  for (const g of scanNpmAudit()) {
    if (!seen.has(g.description)) { seen.add(g.description); gaps.push(g); }
  }

  // Coverage not generated
  if (!fs.existsSync('coverage/coverage-summary.json')) {
    gaps.push({ id: 'gap-coverage', severity: 'high', description: 'Cobertura de testes nao gerada (rode npm run test:cov)' });
  }

  // No .ai-devkit directory
  if (!fs.existsSync('.ai-devkit')) {
    gaps.push({ id: 'gap-state-dir', severity: 'low', description: 'Diretorio .ai-devkit/ ausente â€” metricas nao serao persistidas' });
  }

  return gaps;
}
