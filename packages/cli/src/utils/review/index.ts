import fs from 'node:fs';
import path from 'node:path';

/** Interface que define a estrutura de review finding. */
export interface ReviewFinding {
  type: 'anti-slop' | 'regression' | 'security' | 'performance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
}

/** Interface que define a estrutura de review result. */
export interface ReviewResult {
  findings: ReviewFinding[];
  summary: { total: number; critical: number; high: number; medium: number; low: number };
}

function summarize(findings: ReviewFinding[]): ReviewResult['summary'] {
  const s = { total: findings.length, critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) { s[f.severity]++; }
  return s;
}

function readFiles(root: string, pattern?: RegExp): Map<string, string> {
  const files = new Map<string, string>();
  function walk(dir: string) {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') walk(full);
        else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
          if (!pattern || pattern.test(full)) files.set(full, fs.readFileSync(full, 'utf-8'));
        }
      }
    } catch { }
  }
  walk(root || process.cwd());
  return files;
}

/** Processa slop. */
export const antiSlop = (cwd: string): ReviewFinding[] => {
  const findings: ReviewFinding[] = [];
  const files = readFiles(cwd);
  for (const [file, content] of files) {
    const lines = content.split('\n');
    // Detect TODO/FIXME/HACK without ticket reference
    const todoLines = lines.map((l, i) => ({ line: i + 1, text: l })).filter(l => /\/\/\s*(TODO|FIXME|HACK|XXX)\b(?!\s*\([A-Z]+-\d+\))/.test(l.text));
    for (const l of todoLines) findings.push({ type: 'anti-slop', severity: 'medium', file: path.relative(cwd, file), line: l.line, message: 'TODO/FIXME sem referencia de ticket', suggestion: 'Adicione referencia (ex: TODO(PRJ-123))' });
    // Detect console.log in non-test files
    if (!file.includes('.test.') && !file.includes('__tests__')) {
      const consoleLines = lines.map((l, i) => ({ line: i + 1, text: l })).filter(l => /console\.(log|debug)\(/.test(l.text));
      for (const l of consoleLines) findings.push({ type: 'anti-slop', severity: 'low', file: path.relative(cwd, file), line: l.line, message: 'console.log em codigo de producao', suggestion: 'Substitua por logger estruturado' });
    }
    // Detect empty catch blocks
    const emptyCatch = lines.map((l, i) => ({ line: i + 1, text: l })).filter(l => /catch\s*\(.*\)\s*\{\s*\}/.test(l.text));
    for (const l of emptyCatch) findings.push({ type: 'anti-slop', severity: 'high', file: path.relative(cwd, file), line: l.line, message: 'Catch block vazio — engole erros', suggestion: 'Adicione tratamento ou re-lance o erro' });
    // Detect duplicate lines (>80% similar within 50 lines)
    for (let i = 0; i < lines.length - 1; i++) {
      for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
        if (lines[i]!.trim() && lines[i] === lines[j] && lines[i]!.length > 20) {
          findings.push({ type: 'anti-slop', severity: 'medium', file: path.relative(cwd, file), line: j + 1, message: 'Linha duplicada', suggestion: 'Extraia para funcao ou variavel' });
          break;
        }
      }
    }
  }
  return findings;
};

/** Processa check. */
export const regressionCheck = (cwd: string): ReviewFinding[] => {
  const findings: ReviewFinding[] = [];
  const files = readFiles(cwd, /\.(ts|tsx)$/);
  const exports = new Map<string, { file: string; line: number }[]>();
  for (const [file, content] of files) {
    const rel = path.relative(cwd, file);
    const exportRegex = /^export\s+(interface|type|class|function|const|enum|abstract\s+class)\s+(\w+)/gm;
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      const name = match[2]!;
      if (!exports.has(name)) exports.set(name, []);
      exports.get(name) ?? {}.push({ file: rel, line: content.slice(0, match.index).split('\n').length });
    }
  }
  for (const [name, locations] of exports) {
    if (locations.length > 1) {
      findings.push({ type: 'regression', severity: 'medium', file: locations[0]!.file, line: locations[0]!.line, message: `Export "${name}" definido em ${locations.length} lugares — possivel conflito`, suggestion: 'Renomeie exports duplicados' });
    }
  }
  return findings;
};

/** Processa scan. */
export const securityScan = (cwd: string): ReviewFinding[] => {
  const findings: ReviewFinding[] = [];
  const files = readFiles(cwd);

  const secretPatterns = [
    { pattern: /(?:api[_-]?key|apikey|secret|password|token|credential)\s*[:=]\s*['"][^'"]+['"]/i, severity: 'critical' as const, msg: 'Possivel segredo hardcoded', suggestion: 'Use .env + variavel de ambiente' },
    { pattern: /(?:-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----)/, severity: 'critical' as const, msg: 'Chave privada detectada no codigo', suggestion: 'Remova e use gerenciamento de secrets' },
    { pattern: /process\.env\.(?:NODE_ENV|PORT|HOST)\s*=\s*['"][^'"]+['"]/, severity: 'high' as const, msg: 'Variavel de ambiente sendo sobrescrita', suggestion: 'Defina em .env, nao no codigo' },
  ];

  for (const [file, content] of files) {
    for (const sp of secretPatterns) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] && sp.pattern.test(lines[i]!)) {
          findings.push({ type: 'security', severity: sp.severity, file: path.relative(cwd, file), line: i + 1, message: sp.msg, suggestion: sp.suggestion });
        }
      }
    }
  }
  return findings;
};

/** Processa check. */
export const performanceCheck = (cwd: string): ReviewFinding[] => {
  const findings: ReviewFinding[] = [];
  const files = readFiles(cwd, /\.(ts|tsx)$/);

  for (const [file, content] of files) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      // N+1 query detection: for loop with await inside
      if (/(for|while)\s*\(/.test(line) && /await/.test(line)) {
        findings.push({ type: 'performance', severity: 'high', file: path.relative(cwd, file), line: i + 1, message: 'Possivel N+1: await dentro de loop', suggestion: 'Use Promise.all() ou batch query' });
      }
      // Large array literal
      if (/\[[\s\S]{0,100}\]/.test(line) && (line.match(/,/g)?.length ?? 0) > 20) {
        findings.push({ type: 'performance', severity: 'low', file: path.relative(cwd, file), line: i + 1, message: 'Array literal grande inline', suggestion: 'Extraia para constante ou arquivo separado' });
      }
      // Sync fs operations
      if (/\bfs\.(readFileSync|writeFileSync|existsSync)\b/.test(line)) {
        findings.push({ type: 'performance', severity: 'medium', file: path.relative(cwd, file), line: i + 1, message: 'Operacao de I/O sincrona', suggestion: 'Use fs.promises com async/await' });
      }
    }
  }
  return findings;
};

/**
 * Executa review.
 * @param checks - Valor checks.
 * @param cwd - Valor cwd.
 * @param json - Valor json.
 * @returns O resultado da operação.
 */
export function runReview(checks: string[], cwd: string, json?: boolean): { findings: ReviewFinding[]; summary: ReviewResult['summary'] } {
  let allFindings: ReviewFinding[] = [];
  const checkMap: Record<string, (cwd: string) => ReviewFinding[]> = {
    'anti-slop': antiSlop, regression: regressionCheck, security: securityScan, performance: performanceCheck,
  };

  for (const check of checks) {
    if (checkMap[check]) allFindings = allFindings.concat(checkMap[check](cwd));
  }

  const summary = summarize(allFindings);

  if (json) {
    console.log(JSON.stringify({ findings: allFindings, summary }, null, 2));
  } else {
    const report = [`# Adversarial Review Report\n`, `Date: ${new Date().toISOString()}\n`, `Checks: ${checks.join(', ')}\n`];
    report.push(`\n## Summary\n| Severity | Count |\n|----------|-------|\n`);
    for (const sev of ['critical', 'high', 'medium', 'low']) report.push(`| ${sev} | ${(summary as Record<string, number>)[sev]} |\n`);
    report.push(`\n## Findings (${summary.total})\n`);
    for (const f of allFindings) {
      report.push(`- [${f.severity.toUpperCase()}] [${f.type}] ${f.file}:${f.line || 1} — ${f.message}\n`);
      if (f.suggestion) report.push(`  Suggestion: ${f.suggestion}\n`);
    }
    const reportStr = report.join('');
    const reportDir = path.join(cwd, '.ai', 'reports');
    fs.mkdirSync(reportDir, { recursive: true });
    const reportFile = path.join(reportDir, `review-${Date.now()}.md`);
    fs.writeFileSync(reportFile, reportStr, 'utf-8');
    console.log(reportStr);
    console.log(`\nRelatorio salvo: ${path.relative(cwd, reportFile)}`);
  }

  return { findings: allFindings, summary };
}
