import type { AsvsCheck, AsvsCategory, AsvsCategoryResult, AsvsReport } from './asvs-types';
import { ASVS_CATEGORIES } from './asvs-types';
import { runAllV1Checks } from './asvs-v1-architecture';
import { runAllV2Checks } from './asvs-v2-auth';
import { runAllV3Checks } from './asvs-v3-session';
import { runAllV4Checks } from './asvs-v4-access-control';
import { runAllV5Checks } from './asvs-v5-validation';
import { runAllV6Checks } from './asvs-v6-crypto';
import { runAllV7Checks } from './asvs-v7-errors';
import { runAllV8Checks } from './asvs-v8-data';
import { runAllV9Checks } from './asvs-v9-comm';
import { runAllV10Checks } from './asvs-v10-malicious';
import { runAllV11Checks } from './asvs-v11-logic';
import { runAllV12Checks } from './asvs-v12-files';
import { runAllV13Checks } from './asvs-v13-api';
import { createLogger } from '@ideia/logger';

const log = createLogger('asvs-checker');

const CATEGORY_RUNNERS: Record<AsvsCategory, (rootDir: string) => AsvsCheck[]> = {
  V1: runAllV1Checks,
  V2: runAllV2Checks,
  V3: runAllV3Checks,
  V4: runAllV4Checks,
  V5: runAllV5Checks,
  V6: runAllV6Checks,
  V7: runAllV7Checks,
  V8: runAllV8Checks,
  V9: runAllV9Checks,
  V10: runAllV10Checks,
  V11: runAllV11Checks,
  V12: runAllV12Checks,
  V13: runAllV13Checks,
};

export class AsvsChecker {
  private rootDir: string;

  constructor(rootDir?: string) {
    this.rootDir = rootDir ?? process.cwd();
  }

  runAll(): AsvsReport {
    log.info('Running all ASVS L1-L3 checks');
    const categories = this.runCategories(Object.keys(CATEGORY_RUNNERS) as AsvsCategory[]);
    return this.buildReport(categories);
  }

  runCategories(selected: AsvsCategory[]): AsvsCategoryResult[] {
    const results: AsvsCategoryResult[] = [];
    for (const category of selected) {
      const runner = CATEGORY_RUNNERS[category];
      if (!runner) continue;
      const checks = runner(this.rootDir);
      const passed = checks.filter(c => c.passed);
      results.push({
        category,
        name: ASVS_CATEGORIES[category] || category,
        total: checks.length,
        passed: passed.length,
        checks,
      });
    }
    return results;
  }

  private buildReport(categories: AsvsCategoryResult[]): AsvsReport {
    const allChecks = categories.flatMap(c => c.checks);
    const l1Checks = allChecks.filter(c => c.level === 1);
    const l1Passed = l1Checks.filter(c => c.passed);
    const l2Checks = allChecks.filter(c => c.level === 2);
    const l2Passed = l2Checks.filter(c => c.passed);
    const l3Checks = allChecks.filter(c => c.level === 3);
    const l3Passed = l3Checks.filter(c => c.passed);
    const total = allChecks.length;
    const passed = allChecks.filter(c => c.passed).length;

    return {
      summary: {
        total,
        passed,
        failed: total - passed,
        overallPercent: total > 0 ? Math.round((passed / total) * 100) : 0,
      },
      l1Summary: {
        total: l1Checks.length,
        passed: l1Passed.length,
        percent: l1Checks.length > 0 ? Math.round((l1Passed.length / l1Checks.length) * 100) : 0,
      },
      categories,
      timestamp: new Date().toISOString(),
      l2Summary: {
        total: l2Checks.length,
        passed: l2Passed.length,
        percent: l2Checks.length > 0 ? Math.round((l2Passed.length / l2Checks.length) * 100) : 0,
      },
      l3Summary: {
        total: l3Checks.length,
        passed: l3Passed.length,
        percent: l3Checks.length > 0 ? Math.round((l3Passed.length / l3Checks.length) * 100) : 0,
      },
    };
  }
}

export function formatAsvsReport(report: AsvsReport): string {
  const lines: string[] = [];
  lines.push('=== OWASP ASVS Compliance Report ===');
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push('');
  lines.push(`L1 Summary: ${report.l1Summary.passed}/${report.l1Summary.total} checks passed (${report.l1Summary.percent}%)`);
  lines.push(`L2 Summary: ${report.l2Summary.passed}/${report.l2Summary.total} checks passed (${report.l2Summary.percent}%)`);
  lines.push(`L3 Summary: ${report.l3Summary.passed}/${report.l3Summary.total} checks passed (${report.l3Summary.percent}%)`);
  lines.push(`Overall: ${report.summary.passed}/${report.summary.total} checks passed (${report.summary.overallPercent}%)`);
  lines.push('');

  for (const cat of report.categories) {
    const pct = cat.total > 0 ? Math.round((cat.passed / cat.total) * 100) : 0;
    lines.push(`${cat.category} — ${cat.name}: ${cat.passed}/${cat.total} (${pct}%)`);
    for (const check of cat.checks) {
      const icon = check.passed ? '[PASS]' : '[FAIL]';
      lines.push(`  ${icon} [L${check.level}] ${check.id} — ${check.name}`);
      lines.push(`    Evidence: ${check.evidence}`);
    }
    lines.push('');
  }

  const failed = report.categories.flatMap(c => c.checks).filter(c => !c.passed);
  if (failed.length > 0) {
    lines.push('Failed Checks:');
    for (const f of failed) {
      lines.push(`  [L${f.level}][${f.category}] ${f.id} — ${f.name}`);
    }
    lines.push('');
  }

  lines.push('========================================');
  return lines.join('\n');
}
