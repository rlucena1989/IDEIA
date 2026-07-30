import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.retrospective');
import path from 'node:path';

import { printHeader, printLine } from "../utils/output";
import { getIO } from '../io';

const RETRO_DIR = '.ai/reports/retrospective';

interface RetroData {
  generatedAt: string;
  period: string;
  qualityGatesRun: number;
  qualityGatesPassed: number;
  violationsDetected: number;
  violationsFixed: number;
  avgFixTime: string;
  totalCommits: number;
  findings: string[];
  improvements: string[];
  previousReport?: string;
  trends?: {
    qualityGatesPassed: number[];
    violationsDetected: number[];
  };
}

function runGit(cwd: string, args: string): string {
  const r = getIO().shell.execString(`git ${args}`, cwd);
  return r.status === 0 ? r.stdout.trim() : '';
}

function countQualityGateRuns(root: string): { total: number; passed: number } {
  const ledgerPath = path.join(root, '.ai/reports/latest-sync-report.json');
  if (!getIO().fs.exists(ledgerPath)) return { total: 0, passed: 0 };
  try {
    const ledger = JSON.parse(getIO().fs.read(ledgerPath, 'utf8'));
    const entries = Array.isArray(ledger) ? ledger : ledger.entries || [];
    const verifyEntries = entries.filter((e: { command?: string; checkpoint?: string }) => e.command === 'verify' || e.checkpoint === 'verify');
    return {
      total: verifyEntries.length,
      passed: verifyEntries.filter((e: { status?: string; ok?: boolean }) => e.status === 'passed' || e.ok === true).length,
    };
  } catch {
    return { total: 0, passed: 0 };
  }
}

function countPlaceholderViolations(root: string): number {
  const reportPath = path.join(root, '.ai/reports/placeholder-policy-report.json');
  if (!getIO().fs.exists(reportPath)) return 0;
  try {
    const report = JSON.parse(getIO().fs.read(reportPath, 'utf8'));
    return report.findings?.length || 0;
  } catch {
    return 0;
  }
}

function getExistingRetros(root: string): string[] {
  const dir = path.join(root, RETRO_DIR);
  if (!getIO().fs.exists(dir)) return [];
  return getIO().fs.readDir(dir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse();
}

function loadRetro(root: string, file: string): RetroData | null {
  try {
    const content = getIO().fs.read(path.join(root, RETRO_DIR, file), 'utf8');
    const match = content.match(/^## Dados Brutos\s*\n\s*(\{.+?\})/ms);
    if (match) return JSON.parse(match[1]);
  } catch { /* ignore */ }
  return null;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function retrospectiveCommand(): Command {
  const cmd = new Command('retrospective')
    .description('Gera relatorio de retrospectiva pos-release');

  cmd
    .command('generate')
    .description('Gera relatorio de retrospectiva')
    .option('--since <tag>', 'Analisa periodo desde uma tag git')
    .option('--auto', 'Executa automaticamente apos git tag')
    .action((options) => {
      const root = process.cwd();
      const now = new Date().toISOString();
      const retrosDir = path.join(root, RETRO_DIR);
      getIO().fs.mkDir(retrosDir, true);

      let period = 'all';
      let commits: string[] = [];
      let totalCommits = 0;

      if (options.since) {
        period = `since ${options.since}`;
        const log = runGit(root, `log ${options.since}..HEAD --oneline`);
        commits = log ? log.split('\n') : [];
        totalCommits = commits.length;
      } else {
        const lastTag = runGit(root, 'describe --tags --abbrev=0 2>/dev/null');
        if (lastTag) {
          period = `since ${lastTag}`;
          const log = runGit(root, `log ${lastTag}..HEAD --oneline`);
          commits = log ? log.split('\n') : [];
          totalCommits = commits.length;
        } else {
          const log = runGit(root, 'log --oneline -50');
          commits = log ? log.split('\n') : [];
          totalCommits = commits.length;
        }
      }

      const gates = countQualityGateRuns(root);
      const violations = countPlaceholderViolations(root);

      const recentRetros = getExistingRetros(root);
      const lastRetro = recentRetros.length > 0 ? loadRetro(root, recentRetros[0]) : null;

      let avgFixTime = 'N/A';
      if (totalCommits > 0) {
        const firstCommit = runGit(root, `log --reverse --format=%ct ${period === 'all' ? '' : period}`);
        const dates = firstCommit.split('\n').filter(Boolean).map(Number);
        if (dates.length >= 2) {
          const totalSeconds = dates[dates.length - 1] - dates[0];
          avgFixTime = formatDuration(Math.round(totalSeconds / dates.length));
        }
      }

      const trends: { qualityGatesPassed: number[]; violationsDetected: number[] } = {
        qualityGatesPassed: [gates.passed],
        violationsDetected: [violations],
      };
      if (lastRetro && lastRetro.trends) {
        trends.qualityGatesPassed = [...lastRetro.trends.qualityGatesPassed, gates.passed];
        trends.violationsDetected = [...lastRetro.trends.violationsDetected, violations];
      }

      const data: RetroData = {
        generatedAt: now,
        period,
        qualityGatesRun: gates.total,
        qualityGatesPassed: gates.passed,
        violationsDetected: violations,
        violationsFixed: 0,
        avgFixTime,
        totalCommits,
        findings: [],
        improvements: [],
        previousReport: recentRetros[0] || undefined,
        trends,
      };

      if (gates.total > 0) {
        const passRate = Math.round((gates.passed / gates.total) * 100);
        if (passRate >= 90) {
          data.findings.push('Alta taxa de aprovacao nos quality gates');
        } else {
          data.findings.push(`${100 - passRate}% dos quality gates falharam — revisar processo de verificacao`);
        }
      }

      if (violations > 0) {
        data.findings.push(`${violations} violacoes de placeholder detectadas`);
        data.improvements.push('Reduzir placeholders antes do commit (usar ai-devkit hook install)');
      }

      if (totalCommits === 0) {
        data.findings.push('Nenhum commit no periodo analisado');
      } else {
        data.findings.push(`${totalCommits} commits no periodo`);
      }

      const filename = `retro-${now.slice(0, 10)}.md`;
      const filePath = path.join(retrosDir, filename);

      const report = `# Relatorio de Retrospectiva

**Gerado em:** ${now}
**Periodo:** ${period}

## Resumo

| Metrica | Valor |
|---------|-------|
| Commits | ${totalCommits} |
| Quality gates executados | ${gates.total} |
| Quality gates aprovados | ${gates.passed} |
| Violacoes detectadas | ${violations} |
| Tempo medio por commit | ${avgFixTime} |

## O que funcionou
${data.findings.filter(f => !f.includes('falharam') && !f.includes('violaco') && !f.includes('Nenhum')).map(f => `- ${f}`).join('\n') || '- N/A'}

## O que falhou
${data.findings.filter(f => f.includes('falharam') || f.includes('violaco')).map(f => `- ${f}`).join('\n') || '- Nenhuma falha registrada'}

## Melhorias sugeridas
${data.improvements.map(i => `- ${i}`).join('\n') || '- Nenhuma sugestao no momento'}

## Tendencias
| Retrospectiva | Gates Aprovados | Violacoes |
|${trends.qualityGatesPassed.map((_, i) => `| Retro ${i + 1} | ${trends.qualityGatesPassed[i]} | ${trends.violationsDetected[i]}`).join(' |\n|')} |

## Dados Brutos
${JSON.stringify(data, null, 2)}
`;
      getIO().fs.write(filePath, report);
      logger.info('[ai-devkit] Relatorio gerado: ${filePath}');
    });

  cmd
    .command('list')
    .description('Lista relatorios de retrospectiva existentes')
    .action(() => {
      const root = process.cwd();
      const retros = getExistingRetros(root);
      if (retros.length === 0) {
        printLine('Nenhum relatorio de retrospectiva encontrado.');
        return;
      }
      printHeader('Retrospectivas');
      retros.forEach((r, i) => {
        const data = loadRetro(root, r);
        const summary = data ? ` (${data.qualityGatesPassed}/${data.qualityGatesRun} gates OK, ${data.totalCommits} commits)` : '';
        printLine(`${i + 1}. ${r}${summary}`);
      });
    });

  return cmd;
}
