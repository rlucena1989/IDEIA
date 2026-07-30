import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.pr-review');

import path from 'node:path';
import { antiSlop, securityScan, performanceCheck, regressionCheck, ReviewFinding } from '../utils/review/index';
import { getIO } from '../io';

/** Interface que define a estrutura de diff file. */
export interface DiffFile {
  file: string;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

/** Interface que define a estrutura de diff hunk. */
export interface DiffHunk {
  startLine: number;
  lineCount: number;
  content: string;
}

/** Interface que define a estrutura de p r review report. */
export interface PRReviewReport {
  summary: {
    filesChanged: number;
    findings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    score: number;
  };
  findings: ReviewFinding[];
  inlineSuggestions: InlineSuggestion[];
  compliance: ComplianceResult[];
}

/** Interface que define a estrutura de inline suggestion. */
export interface InlineSuggestion {
  file: string;
  line: number;
  severity: string;
  message: string;
  suggestion: string;
  body: string;
}

/** Interface que define a estrutura de compliance result. */
export interface ComplianceResult {
  rule: string;
  status: 'passed' | 'failed' | 'skipped';
  details: string;
}

function getGitDiff(base: string = 'main'): string {
  const r1 = getIO().shell.execString(`git diff ${base} -- .`);
  if (r1.status === 0) return r1.stdout;
  const r2 = getIO().shell.execString(`git diff HEAD~1 -- .`);
  if (r2.status === 0) return r2.stdout;
  return '';
}

/**
 * Analisa diff.
 * @param diff - Valor diff.
 * @returns O resultado da operação.
 */
export function parseDiff(diff: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  const lines = diff.split('\n');
  let currentHunk: DiffHunk | null = null;

  for (const line of lines) {
    const hunkHeader = line.match(/^@@ -(\d+),\d+ \+(\d+),\d+ @@/);
    if (hunkHeader) {
      if (currentHunk) hunks.push(currentHunk);
      currentHunk = {
        startLine: parseInt(hunkHeader[2] ?? '0', 10),
        lineCount: 0,
        content: '',
      };
      continue;
    }

    if (currentHunk) {
      currentHunk.content += line + '\n';
      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentHunk.lineCount++;
      }
    }
  }

  if (currentHunk) hunks.push(currentHunk);
  return hunks;
}

function getChangedFiles(base: string = 'main'): DiffFile[] {
  const r = getIO().shell.execString(`git diff ${base} --name-only -- .`);
  if (r.status !== 0) return [];
  const files = r.stdout.split('\n').filter(Boolean);

  return files.map((file) => {
    const fr = getIO().shell.execString(`git diff ${base} -- "${file}"`);
    const fileDiff = fr.status === 0 ? fr.stdout : '';
    const hunks = fileDiff ? parseDiff(fileDiff) : [];
    const additions = hunks.reduce((sum, h) => sum + h.lineCount, 0);
    return { file, additions, deletions: 0, hunks };
  });
}

/**
 * Verifica file extension.
 * @param file - Valor file.
 * @returns O resultado da operação.
 */
export function checkFileExtension(file: string): boolean {
  return /\.(ts|tsx|js|jsx|md|yaml|yml|json)$/.test(file);
}

/**
 * Executa compliance checks.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function runComplianceChecks(root: string): ComplianceResult[] {
  const results: ComplianceResult[] = [];

  const policies = [
    { name: 'AGENTS.md exists', check: () => getIO().fs.exists(path.join(root, 'AGENTS.md')) },
    { name: 'CHANGELOG.md exists', check: () => getIO().fs.exists(path.join(root, 'CHANGELOG.md')) },
    { name: 'LICENSE exists', check: () => getIO().fs.exists(path.join(root, 'LICENSE')) || getIO().fs.exists(path.join(root, 'LICENSE.md')) },
    { name: '.ai/architecture exists', check: () => getIO().fs.exists(path.join(root, '.ai', 'architecture')) },
    { name: '.ai/policies exists', check: () => getIO().fs.exists(path.join(root, '.ai', 'policies')) },
  ];

  for (const policy of policies) {
    results.push({
      rule: policy.name,
      status: policy.check() ? 'passed' : 'failed',
      details: policy.check() ? 'File found' : 'File missing — run ai-devkit init',
    });
  }

  return results;
}

function generateInlineSuggestions(
  findings: ReviewFinding[],
  changedFiles: DiffFile[]
): InlineSuggestion[] {
  const changedSet = new Set(changedFiles.map((f) => f.file));

  return findings
    .filter((f) => changedSet.has(f.file) && f.line !== undefined)
    .map((f) => ({
      file: f.file,
      line: f.line || 1,
      severity: f.severity,
      message: f.message,
      suggestion: f.suggestion || 'Review this change',
      body: `**${f.type}**: ${f.message}\n\n**Suggestion**: ${f.suggestion || 'Review manually'}\n\n*Severity: ${f.severity}*`,
    }));
}

function calculateScore(findings: ReviewFinding[]): number {
  const weights = { critical: 25, high: 10, medium: 3, low: 1 };
  const penalty = findings.reduce((sum, f) => sum + (weights[f.severity] || 1), 0);
  return Math.max(0, Math.round(100 - penalty));
}

/**
 * Executa p r review.
 * @param root - Valor root.
 * @param options - Valor options.
 * @returns O resultado da operação.
 */
export function runPRReview(
  root: string,
  options?: { base?: string; output?: string }
): PRReviewReport {
  const base = options?.base || 'main';
  const changedFiles = getChangedFiles(base);

  if (changedFiles.length === 0) {
    console.log('[pr-review] No changes detected against', base);
    return {
      summary: { filesChanged: 0, findings: 0, critical: 0, high: 0, medium: 0, low: 0, score: 100 },
      findings: [],
      inlineSuggestions: [],
      compliance: runComplianceChecks(root),
    };
  }

  const sourceFiles = changedFiles.filter((f) => checkFileExtension(f.file));
  logger.info('[pr-review] ${changedFiles.length} files changed, ${sourceFiles.length} reviewable');

  const findings: ReviewFinding[] = [];

  for (const sf of sourceFiles) {
    const filePath = path.join(root, sf.file);
    if (!getIO().fs.exists(filePath)) continue;

    const cwd = root;
    const allFindings = [
      ...antiSlop(cwd).filter((f) => f.file === sf.file),
      ...securityScan(cwd).filter((f) => f.file === sf.file),
      ...performanceCheck(cwd).filter((f) => f.file === sf.file),
      ...regressionCheck(cwd).filter((f) => f.file === sf.file),
    ];

    findings.push(...allFindings);
  }

  const inlineSuggestions = generateInlineSuggestions(findings, changedFiles);
  const compliance = runComplianceChecks(root);
  const score = calculateScore(findings);

  const summary = {
    filesChanged: changedFiles.length,
    findings: findings.length,
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
    score,
  };

  const report: PRReviewReport = { summary, findings, inlineSuggestions, compliance };

  const outputPath = options?.output || path.join(root, '.ai', 'reports', `pr-review-${Date.now()}.json`);
  getIO().fs.mkDir(path.dirname(outputPath), true);
  getIO().fs.write(outputPath, JSON.stringify(report, null, 2));

  logger.info('\n📋 PR Review Report');
  logger.info('   Files changed: ${summary.filesChanged}');
  logger.info('   Findings: ${summary.findings}');
  logger.info('   Score: ${score}/100');
  logger.info('   Saved: ${path.relative(root, outputPath)}');

  return report;
}

/**
 * Formata p r review.
 * @param report - Valor report.
 * @returns O resultado da operação.
 */
export function formatPRReview(report: PRReviewReport): string {
  const lines: string[] = [];

  lines.push(`# 🤖 AI-Devkit PR Review\n`);
  lines.push(`## Summary\n`);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Files Changed | ${report.summary.filesChanged} |`);
  lines.push(`| Findings | ${report.summary.findings} |`);
  lines.push(`| Score | ${report.summary.score}/100 |`);
  lines.push(`| Critical | ${report.summary.critical} |`);
  lines.push(`| High | ${report.summary.high} |`);
  lines.push(`| Medium | ${report.summary.medium} |`);
  lines.push(`| Low | ${report.summary.low} |`);
  lines.push(``);

  if (report.findings.length > 0) {
    lines.push(`## Findings\n`);
    for (const f of report.findings) {
      const icon = f.severity === 'critical' ? '🔴' : f.severity === 'high' ? '🟠' : f.severity === 'medium' ? '🟡' : '⚪';
      lines.push(`${icon} **${f.file}**:${f.line || 1} — ${f.message}`);
      if (f.suggestion) lines.push(`   > ${f.suggestion}`);
      lines.push(``);
    }
  }

  if (report.inlineSuggestions.length > 0) {
    lines.push(`## 💡 Inline Suggestions\n`);
    for (const sug of report.inlineSuggestions) {
      lines.push(`- **${sug.file}** (line ${sug.line}): ${sug.message}`);
      lines.push(`  ${sug.suggestion}\n`);
    }
  }

  if (report.compliance.length > 0) {
    lines.push(`## 📋 Compliance\n`);
    for (const c of report.compliance) {
      const icon = c.status === 'passed' ? '✅' : '❌';
      lines.push(`${icon} ${c.rule} — ${c.details}`);
    }
  }

  lines.push(`\n---\n*Generated by ai-devkit pr-review*`);
  return lines.join('\n');
}

/**
 * Processa review command.
 * @returns O resultado da operação.
 */
export function prReviewCommand(): Command {
  const cmd = new Command('pr-review')
    .description('Automatic PR review with inline suggestions, security scan, and compliance check');

  cmd
    .command('run')
    .description('Review changes against a base branch')
    .option('--base <branch>', 'Base branch for diff', 'main')
    .option('--output <path>', 'Output report path')
    .option('--markdown', 'Output as Markdown instead of JSON')
    .action((options) => {
      const root = process.cwd();
      const report = runPRReview(root, {
        base: options.base,
        output: options.output,
      });

      if (options.markdown) {
        logger.info(formatPRReview(report));
      }

      if (report.summary.score < 50) {
        process.exit(1);
      }
    });

  cmd
    .command('diff')
    .description('Show the git diff that will be reviewed')
    .option('--base <branch>', 'Base branch', 'main')
    .action((options) => {
      const diff = getGitDiff(options.base);
      if (diff) {
        logger.info(diff);
      } else {
        console.log('No diff found against', options.base);
      }
    });

  cmd
    .command('suggestions')
    .description('Show inline suggestions as GitHub PR review comments')
    .argument('<report-file>', 'Path to PR review JSON report')
    .option('--format <format>', 'Output format: github, markdown', 'markdown')
    .action((reportFile, options) => {
      const absPath = path.resolve(reportFile);
      if (!getIO().fs.exists(absPath)) {
        console.error('Report not found:', reportFile);
        process.exit(1);
      }

      const report: PRReviewReport = JSON.parse(getIO().fs.read(absPath, 'utf8'));

      if (options.format === 'github') {
        for (const sug of report.inlineSuggestions) {
          logger.info(`::set-output name=review::${JSON.stringify({
            path: sug.file,
            line: sug.line,
            body: sug.body,
          })}`);
        }
      } else {
        logger.info(formatPRReview(report));
      }
    });

  return cmd;
}
