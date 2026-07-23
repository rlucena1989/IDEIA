/**
 * pipeline-metrics.ts — Métricas do Pipeline CI/CD
 *
 * Coleta métricas dos workflows GitHub Actions e da execução de deploys.
 *
 * Uso:
 *   npx tsx scripts/pipeline-metrics.ts              # relatório completo
 *   npx tsx scripts/pipeline-metrics.ts --json       # saída JSON
 *   npx tsx scripts/pipeline-metrics.ts --ci         # exit 1 se métricas críticas falharem
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const WORKFLOWS_DIR = join(ROOT, '.github', 'workflows');
const DELIVERY_DIR = join(ROOT, 'packages', 'delivery-orchestrator', 'src');

interface WorkflowMetrics {
  name: string;
  file: string;
  jobs: number;
  hasLint: boolean;
  hasTest: boolean;
  hasBuild: boolean;
  hasSecurity: boolean;
  hasDeploy: boolean;
  hasDocsVerify: boolean;
  size: number;
}

interface PipelineMetricsReport {
  timestamp: string;
  totalWorkflows: number;
  workflows: WorkflowMetrics[];
  totalJobs: number;
  coverage: {
    lint: number;
    test: number;
    build: number;
    security: number;
    deploy: number;
    docsVerify: number;
  };
  deliveryPackage: {
    loc: number;
    files: number;
    exports: string[];
  };
}

function scanWorkflows(): WorkflowMetrics[] {
  if (!existsSync(WORKFLOWS_DIR)) return [];

  return readdirSync(WORKFLOWS_DIR)
    .filter(f => f.endsWith('.yml'))
    .map(file => {
      const content = readFileSync(join(WORKFLOWS_DIR, file), 'utf-8');
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const name = nameMatch ? nameMatch[1].trim() : file;
      const jobs = (content.match(/^\s{2}\w+:\s*$/gm) || []).length;

      return {
        name,
        file,
        jobs,
        hasLint: /\blint\b/i.test(content),
        hasTest: /\btest\b/i.test(content) || /\bjest\b/i.test(content),
        hasBuild: /\bbuild\b/i.test(content) || /\btsc\b/i.test(content),
        hasSecurity: /\bsecurity\b/i.test(content) || /\baudit\b/i.test(content) || /\bcodeql\b/i.test(content),
        hasDeploy: /\bdeploy\b/i.test(content),
        hasDocsVerify: /docs-sync|docs.verify/i.test(content),
        size: content.length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function scanDeliveryPackage(): { loc: number; files: number; exports: string[] } {
  if (!existsSync(DELIVERY_DIR)) return { loc: 0, files: 0, exports: [] };

  let totalLoc = 0;
  let fileCount = 0;
  const exports: string[] = [];

  for (const f of readdirSync(DELIVERY_DIR)) {
    if (!f.endsWith('.ts') || f === 'index.ts') continue;
    const fp = join(DELIVERY_DIR, f);
    if (statSync(fp).isFile()) {
      fileCount++;
      totalLoc += readFileSync(fp, 'utf-8').split('\n').length;
      exports.push(f.replace('.ts', ''));
    }
  }

  return { loc: totalLoc, files: fileCount, exports };
}

function generateReport(): PipelineMetricsReport {
  const workflows = scanWorkflows();
  const delivery = scanDeliveryPackage();

  const totalJobs = workflows.reduce((s, w) => s + w.jobs, 0);
  const total = workflows.length;

  return {
    timestamp: new Date().toISOString(),
    totalWorkflows: total,
    workflows,
    totalJobs,
    coverage: {
      lint: workflows.filter(w => w.hasLint).length,
      test: workflows.filter(w => w.hasTest).length,
      build: workflows.filter(w => w.hasBuild).length,
      security: workflows.filter(w => w.hasSecurity).length,
      deploy: workflows.filter(w => w.hasDeploy).length,
      docsVerify: workflows.filter(w => w.hasDocsVerify).length,
    },
    deliveryPackage: delivery,
  };
}

function main(): void {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');
  const isCi = args.includes('--ci');

  const report = generateReport();

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('=== Pipeline Metrics ===\n');
  console.log(`Total Workflows: ${report.totalWorkflows}`);
  console.log(`Total Jobs: ${report.totalJobs}\n`);

  console.log('Coverage:');
  console.log(`  ✅ Lint:       ${report.coverage.lint}/${report.totalWorkflows}`);
  console.log(`  ✅ Test:       ${report.coverage.test}/${report.totalWorkflows}`);
  console.log(`  ✅ Build:      ${report.coverage.build}/${report.totalWorkflows}`);
  console.log(`  ✅ Security:   ${report.coverage.security}/${report.totalWorkflows}`);
  console.log(`  ✅ Deploy:     ${report.coverage.deploy}/${report.totalWorkflows}`);
  console.log(`  ✅ Docs Verify: ${report.coverage.docsVerify}/${report.totalWorkflows}`);

  console.log('\nDelivery Package:');
  console.log(`  Files: ${report.deliveryPackage.files}`);
  console.log(`  LOC: ~${report.deliveryPackage.loc}`);
  console.log(`  Exports: ${report.deliveryPackage.exports.join(', ')}`);

  console.log('\nWorkflows:');
  for (const w of report.workflows) {
    const badges = [];
    if (w.hasLint) badges.push('lint');
    if (w.hasTest) badges.push('test');
    if (w.hasBuild) badges.push('build');
    if (w.hasSecurity) badges.push('security');
    if (w.hasDeploy) badges.push('deploy');
    if (w.hasDocsVerify) badges.push('docs');
    console.log(`  ${w.file}: ${w.jobs} jobs [${badges.join(', ')}]`);
  }

  if (isCi) {
    const critical = report.workflows.filter(w => w.hasDeploy && !w.hasDocsVerify);
    if (critical.length > 0) {
      console.error(`\n❌ ${critical.length} deploy workflow(s) without docs-verify:`);
      critical.forEach(w => console.error(`   ${w.file}`));
      process.exit(1);
    }
    console.log('\n✅ All pipeline metrics OK');
  }
}

main();
