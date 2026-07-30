#!/usr/bin/env tsx
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

interface Scorecard {
  timestamp: string;
  overall: number;
  dimensions: Record<string, { score: number; target: number; gap: number; status: '✅' | '⚠️' | '🔴' }>;
  metrics: Record<string, number | string>;
  violations: string[];
}

async function collect(): Promise<Scorecard> {
  const reportsDir = 'reports';
  const scorecard: Scorecard = {
    timestamp: new Date().toISOString(),
    overall: 0,
    dimensions: {},
    metrics: {},
    violations: [],
  };

  // 1. Código: ESLint + TypeScript + Jest + boundaries
  try {
    const eslintReport = existsSync(join(reportsDir, 'eslint.json'))
      ? JSON.parse(readFileSync(join(reportsDir, 'eslint.json'), 'utf-8'))
      : null;
    const tscOk = await checkTsc();
    const coverage = existsSync(join(reportsDir, 'coverage.json'))
      ? JSON.parse(readFileSync(join(reportsDir, 'coverage.json'), 'utf-8'))
      : null;

    const eslintScore = eslintReport ? Math.max(0, 100 - eslintReport.length * 2) : 50;
    const tscScore = tscOk ? 100 : 0;
    const covScore = coverage?.total?.lines?.pct ?? 0;
    const codeScore = Math.round((eslintScore + tscScore + covScore) / 3);
    scorecard.dimensions.code = { score: codeScore, target: 80, gap: 80 - codeScore, status: codeScore >= 80 ? '✅' : codeScore >= 50 ? '⚠️' : '🔴' };
    scorecard.metrics['code.eslint.warnings'] = eslintReport?.length ?? 'N/A';
    scorecard.metrics['code.tsc.ok'] = tscOk ? 'yes' : 'no';
    scorecard.metrics['code.coverage'] = `${covScore}%`;
  } catch (e) {
    scorecard.dimensions.code = { score: 0, target: 80, gap: 80, status: '🔴' };
  }

  // 2. Segurança: npm audit
  try {
    const audit = existsSync(join(reportsDir, 'audit.json'))
      ? JSON.parse(readFileSync(join(reportsDir, 'audit.json'), 'utf-8'))
      : null;
    const vulns = audit?.vulnerabilities ?? {};
    const critical = Object.values(vulns).filter((v: any) => v.severity === 'critical').length;
    const high = Object.values(vulns).filter((v: any) => v.severity === 'high').length;
    const securityScore = Math.round(Math.max(0, 100 - critical * 20 - high * 5));
    scorecard.dimensions.security = { score: securityScore, target: 90, gap: 90 - securityScore, status: securityScore >= 90 ? '✅' : securityScore >= 60 ? '⚠️' : '🔴' };
    scorecard.metrics['security.critical'] = critical;
    scorecard.metrics['security.high'] = high;
    if (critical > 0) scorecard.violations.push(`${critical} critical vulnerabilities`);
    if (high > 5) scorecard.violations.push(`${high} high vulnerabilities`);
  } catch {
    scorecard.dimensions.security = { score: 0, target: 80, gap: 80, status: '🔴' };
  }

  // 3. Performance: benchmark (if available)
  try {
    const bench = existsSync(join(reportsDir, 'benchmark.json'))
      ? JSON.parse(readFileSync(join(reportsDir, 'benchmark.json'), 'utf-8'))
      : null;
    const perfScore = bench ? Math.min(100, Math.round((bench.opsPerSecond || 0) / 10)) : 30;
    scorecard.dimensions.performance = { score: perfScore, target: 80, gap: 80 - perfScore, status: perfScore >= 80 ? '✅' : perfScore >= 40 ? '⚠️' : '🔴' };
  } catch {
    scorecard.dimensions.performance = { score: 30, target: 80, gap: 50, status: '🔴' };
  }

  // 4. UX
  try {
    const a11y = existsSync(join(reportsDir, 'a11y.json'))
      ? JSON.parse(readFileSync(join(reportsDir, 'a11y.json'), 'utf-8'))
      : null;
    const uxScore = a11y ? Math.max(0, 100 - a11y.violations * 10) : 40;
    scorecard.dimensions.ux = { score: uxScore, target: 75, gap: 75 - uxScore, status: uxScore >= 75 ? '✅' : uxScore >= 40 ? '⚠️' : '🔴' };
  } catch {
    scorecard.dimensions.ux = { score: 40, target: 75, gap: 35, status: '🔴' };
  }

  // 5. Integração
  try {
    const contracts = existsSync(join(reportsDir, 'contracts.json'))
      ? JSON.parse(readFileSync(join(reportsDir, 'contracts.json'), 'utf-8'))
      : null;
    const intScore = contracts ? (contracts.passed / contracts.total) * 100 : 50;
    scorecard.dimensions.integration = { score: Math.round(intScore), target: 85, gap: 85 - intScore, status: intScore >= 85 ? '✅' : intScore >= 50 ? '⚠️' : '🔴' };
  } catch {
    scorecard.dimensions.integration = { score: 50, target: 85, gap: 35, status: '🔴' };
  }

  // 6. Resiliência
  try {
    const chaos = existsSync(join(reportsDir, 'chaos.json'))
      ? JSON.parse(readFileSync(join(reportsDir, 'chaos.json'), 'utf-8'))
      : null;
    const resScore = chaos ? (chaos.passed / chaos.total) * 100 : 30;
    scorecard.dimensions.resilience = { score: Math.round(resScore), target: 80, gap: 80 - resScore, status: resScore >= 80 ? '✅' : resScore >= 40 ? '⚠️' : '🔴' };
  } catch {
    scorecard.dimensions.resilience = { score: 30, target: 80, gap: 50, status: '🔴' };
  }

  // 7. Dados
  try {
    const data = existsSync(join(reportsDir, 'data.json'))
      ? JSON.parse(readFileSync(join(reportsDir, 'data.json'), 'utf-8'))
      : null;
    const dataScore = data?.score ?? 30;
    scorecard.dimensions.data = { score: dataScore, target: 75, gap: 75 - dataScore, status: dataScore >= 75 ? '✅' : dataScore >= 40 ? '⚠️' : '🔴' };
  } catch {
    scorecard.dimensions.data = { score: 30, target: 75, gap: 45, status: '🔴' };
  }

  // Overall
  const scores = Object.values(scorecard.dimensions).map(d => d.score);
  scorecard.overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return scorecard;
}

async function checkTsc(): Promise<boolean> {
  try {
    const { execSync } = await import('node:child_process');
    execSync('npx tsc --noEmit', { stdio: 'pipe', timeout: 120000 });
    return true;
  } catch {
    return false;
  }
}

function printScorecard(sc: Scorecard): void {
  console.log(`\n=== QUALITY SCORECARD ===`);
  console.log(`Timestamp: ${sc.timestamp}`);
  console.log(`\nOverall: ${sc.overall}/100\n`);
  
  for (const [dim, data] of Object.entries(sc.dimensions)) {
    const bar = '█'.repeat(Math.floor(data.score / 10)) + '░'.repeat(10 - Math.floor(data.score / 10));
    console.log(`${data.status} ${dim.padEnd(15)} ${bar} ${data.score}/100 (target: ${data.target})`);
  }
  
  if (sc.violations.length > 0) {
    console.log(`\n❌ Violations:`);
    sc.violations.forEach(v => console.log(`  - ${v}`));
  }
  
  console.log(`\nMetrics:`);
  for (const [key, val] of Object.entries(sc.metrics)) {
    console.log(`  ${key}: ${val}`);
  }
}

async function main(): Promise<void> {
  const scorecard = await collect();
  printScorecard(scorecard);

  if (!existsSync('reports')) mkdirSync('reports', { recursive: true });
  writeFileSync(join('reports', 'scorecard.json'), JSON.stringify(scorecard, null, 2));

  const minScore = parseInt(process.argv.find(a => a.startsWith('--min-score='))?.split('=')[1] ?? '50');
  if (process.argv.includes('--ci') && scorecard.overall < minScore) {
    console.error(`\n❌ Score ${scorecard.overall} is below minimum ${minScore}`);
    process.exit(1);
  }
}

main().catch(console.error);
