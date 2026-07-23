import { Command } from 'commander';
import path from 'node:path';
import { printHeader, printLine, printResult } from '../utils/output';
import { getIO } from '../io';

interface ReportSection {
  name: string;
  status: 'pass' | 'warn' | 'fail' | 'missing';
  data: Record<string, unknown>;
  source: string;
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function reportCommand(): Command {
  const cmd = new Command('report')
    .description('Agregador unificado de relatórios (scorecard + coverage + telemetry + security + drift)');

  cmd
    .command('aggregate')
    .description('Agrega todos os relatórios disponíveis em um único artefato')
    .option('--dir <path>', 'Diretório raiz do projeto', '.')
    .option('--json', 'Saída em JSON')
    .option('--output <path>', 'Salvar agregado em arquivo')
    .action((options: { dir: string; json?: boolean; output?: string }) => {
      const root = path.resolve(options.dir);
      const sections: ReportSection[] = [];

      // 1. Scorecard
      const scorecardPath = path.join(root, '.ai/reports/scorecard.json');
      if (getIO().fs.exists(scorecardPath)) {
        try {
          const data = JSON.parse(getIO().fs.read(scorecardPath, 'utf8'));
          sections.push({
            name: 'Scorecard',
            status: data.overallScore >= 80 ? 'pass' : data.overallScore >= 50 ? 'warn' : 'fail',
            data,
            source: '.ai/reports/scorecard.json',
          });
        } catch {
          sections.push({ name: 'Scorecard', status: 'fail', data: {}, source: scorecardPath });
        }
      } else {
        sections.push({ name: 'Scorecard', status: 'missing', data: {}, source: 'N/A (rodar scorecard)' });
      }

      // 2. Coverage
      const coveragePath = path.join(root, 'coverage/coverage-summary.json');
      if (getIO().fs.exists(coveragePath)) {
        try {
          const data = JSON.parse(getIO().fs.read(coveragePath, 'utf8'));
          const total = data.total || {};
          const statements = total.statements?.pct ?? 0;
          const branches = total.branches?.pct ?? 0;
          sections.push({
            name: 'Coverage',
            status: statements >= 80 ? 'pass' : statements >= 50 ? 'warn' : 'fail',
            data: { statements, branches, functions: total.functions?.pct ?? 0, lines: total.lines?.pct ?? 0 },
            source: 'coverage/coverage-summary.json',
          });
        } catch {
          sections.push({ name: 'Coverage', status: 'fail', data: {}, source: coveragePath });
        }
      } else {
        sections.push({ name: 'Coverage', status: 'missing', data: {}, source: 'N/A (rodar npm run test:cov:standard)' });
      }

      // 3. Observability Telemetry
      const telemetryDir = path.join(root, '.ai/reports/observability');
      const tracesPath = path.join(telemetryDir, 'traces.jsonl');
      const metricsPath = path.join(telemetryDir, 'metrics.json');
      if (getIO().fs.exists(metricsPath)) {
        try {
          const data = JSON.parse(getIO().fs.read(metricsPath, 'utf8'));
          sections.push({
            name: 'Telemetry',
            status: data.success_rate >= 90 ? 'pass' : data.success_rate >= 70 ? 'warn' : 'fail',
            data: { totalCalls: data.total_calls, avgLatency: data.avg_latency_ms, p95: data.p95_latency_ms, successRate: data.success_rate, totalCost: data.total_cost_usd },
            source: '.ai/reports/observability/metrics.json',
          });
        } catch {
          sections.push({ name: 'Telemetry', status: 'fail', data: {}, source: metricsPath });
        }
      } else if (getIO().fs.exists(tracesPath)) {
        sections.push({ name: 'Telemetry', status: 'warn', data: {}, source: 'traces.jsonl (rodar observability metrics para agregar)' });
      } else {
        sections.push({ name: 'Telemetry', status: 'missing', data: {}, source: 'N/A (sem traces)' });
      }

      // 4. Security
      const securityPath = path.join(root, '.ai/reports/security-report.json');
      if (getIO().fs.exists(securityPath)) {
        try {
          const data = JSON.parse(getIO().fs.read(securityPath, 'utf8'));
          const issuesCount = data.issues?.length ?? data.vulnerabilities?.length ?? 0;
          sections.push({
            name: 'Security',
            status: issuesCount === 0 ? 'pass' : issuesCount < 5 ? 'warn' : 'fail',
            data,
            source: '.ai/reports/security-report.json',
          });
        } catch {
          sections.push({ name: 'Security', status: 'fail', data: {}, source: securityPath });
        }
      } else {
        sections.push({ name: 'Security', status: 'missing', data: {}, source: 'N/A (rodar security check)' });
      }

      // 5. Audit (drift / compliance)
      const auditDir = path.join(root, '.ai/audit');
      const auditFiles = getIO().fs.exists(auditDir) ? getIO().fs.readDir(auditDir).filter(f => f.endsWith('.json')) : [];
      if (auditFiles.length > 0) {
        const auditData: Record<string, unknown> = {};
        for (const f of auditFiles) {
          try {
            auditData[f] = JSON.parse(getIO().fs.read(path.join(auditDir, f), 'utf8'));
          } catch { /* skip */ }
        }
        sections.push({
          name: 'Audit',
          status: 'pass',
          data: { files: auditFiles.length, details: auditData },
          source: `.ai/audit/ (${auditFiles.length} arquivos)`,
        });
      } else {
        sections.push({ name: 'Audit', status: 'missing', data: {}, source: 'N/A (rodar audit)' });
      }

      // 6. Performance Metrics
      const perfDir = path.join(root, '.ai/reports/performance');
      const perfPath = path.join(perfDir, 'metrics.jsonl');
      if (getIO().fs.exists(perfPath)) {
        try {
          const lines = getIO().fs.read(perfPath, 'utf8').split('\n').filter(Boolean);
          const lastMetric = JSON.parse(lines[lines.length - 1]);
          sections.push({
            name: 'Performance',
            status: 'pass',
            data: lastMetric.metrics || lastMetric,
            source: '.ai/reports/performance/metrics.jsonl',
          });
        } catch {
          sections.push({ name: 'Performance', status: 'fail', data: {}, source: perfPath });
        }
      } else {
        sections.push({ name: 'Performance', status: 'missing', data: {}, source: 'N/A (rodar performance collect)' });
      }

      const passCount = sections.filter(s => s.status === 'pass').length;
      const warnCount = sections.filter(s => s.status === 'warn').length;
      const failCount = sections.filter(s => s.status === 'fail').length;
      const missingCount = sections.filter(s => s.status === 'missing').length;

      const aggregate = {
        generatedAt: new Date().toISOString(),
        summary: { totalSections: sections.length, pass: passCount, warn: warnCount, fail: failCount, missing: missingCount },
        sections,
      };

      if (options.json || options.output) {
        const output = JSON.stringify(aggregate, null, 2);
        if (options.output) {
          const outPath = path.resolve(options.output);
          getIO().fs.mkDir(path.dirname(outPath), true);
          getIO().fs.write(outPath, output);
          printLine(`Relatório agregado salvo em: ${outPath}`);
        } else {
          printLine(output);
        }
        return;
      }

      printHeader('Relatório Agregado Unificado');
      for (const s of sections) {
        const icon = s.status === 'pass' ? '✅' : s.status === 'warn' ? '⚠️' : s.status === 'fail' ? '❌' : '⬜';
        printLine(`${icon} ${s.name}: ${s.status.toUpperCase()} — ${s.source}`);
      }
      printLine('');
      printLine(`Resumo: ${passCount} pass, ${warnCount} warn, ${failCount} fail, ${missingCount} missing`);
    });

  return cmd;
}