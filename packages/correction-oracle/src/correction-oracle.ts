import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import * as fs from 'fs';
import * as path from 'path';
import { CheckResult, OracleReport, OracleRule } from './types';
const logger = createLogger('correction-oracle');

const DEFAULT_RULES: OracleRule[] = [
  {
    id: 'missing-semilicon', name: 'Missing semicolon', category: 'style',
    check: (content: string, filePath: string) => {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.js')) return [];
      return findIssues(content, /(?<=\w)\s*\n(?!\s*(?:\}|return|if|for|while|catch|finally|import|export))/g,
        'Missing semicolon', 'warning', 'style', 0.6, true, ';');
    },
  },
  {
    id: 'console-log', name: 'Console.log left in code', category: 'security',
    check: (content: string, filePath: string) => {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.js')) return [];
      return findIssues(content, /console\.(?:log|debug|info)\(/g,
        'Console.log left in production code', 'warning', 'security', 0.8, false);
    },
  },
  {
    id: 'hardcoded-secret', name: 'Hardcoded secret', category: 'security',
    check: (content: string, _filePath: string) => {
      const results: CheckResult[] = [];
      const secretPatterns = [
        { pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi, severity: 'error' as const },
        { pattern: /api_key\s*[:=]\s*['"][^'"]+['"]/gi, severity: 'error' as const },
        { pattern: /secret\s*[:=]\s*['"][^'"]{8,}['"]/gi, severity: 'error' as const },
      ];
      for (const { pattern, severity } of secretPatterns) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(content)) !== null) {
          const line = content.slice(0, match.index).split('\n').length;
          results.push({
            id: randomUUID(), severity, category: 'security',
            message: `Hardcoded ${match[0].split(/[:=]/)[0].trim()} detected`,
            filePath: '', line, suggestion: 'Use environment variables instead', confidence: 0.9, autoFixable: false,
          });
        }
      }
      return results;
    },
  },
  {
    id: 'todo-left', name: 'TODO left in code', category: 'style',
    check: (content: string, _filePath: string) => {
      return findIssues(content, /\/\/\s*TODO/gi,
        'TODO left in code', 'info', 'style', 0.5, false);
    },
  },
  {
    id: 'any-type', name: 'Usage of `any` type', category: 'type',
    check: (content: string, filePath: string) => {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return [];
      return findIssues(content, /:\s*any\b(?!\s*\/\*\s*justified)/g,
        'Usage of `any` type — use `unknown` or proper type', 'warning', 'type', 0.7, false);
    },
  },
];

export class CorrectionOracle {
  private rules: OracleRule[];

  constructor(customRules?: OracleRule[]) {
    this.rules = [...DEFAULT_RULES, ...(customRules || [])];
  }

  scanFile(filePath: string): CheckResult[] {
    if (!fs.existsSync(filePath)) return [];
    const ext = path.extname(filePath);
    if (!['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java'].includes(ext)) return [];

    const content = fs.readFileSync(filePath, 'utf-8');
    const results: CheckResult[] = [];

    for (const rule of this.rules) {
      try {
        results.push(...rule.check(content, filePath).map(r => ({ ...r, filePath })));
      } catch {
        /* rule error swallowed */
      }
    }

    return results;
  }

  scanContent(content: string, filePath: string): CheckResult[] {
    const results: CheckResult[] = [];
    for (const rule of this.rules) {
      try {
        results.push(...rule.check(content, filePath).map(r => ({ ...r, filePath })));
      } catch { /* rule error swallowed */ }
    }
    return results;
  }

  scanDirectory(rootDir: string, exclude: string[] = ['node_modules', 'dist', '.git', 'build', '.ai']): OracleReport {
    const allResults: CheckResult[] = [];
    this.walkDir(rootDir, exclude, allResults, 0);
    return this.buildReport(allResults);
  }

  getRules(): OracleRule[] {
    return [...this.rules];
  }

  private walkDir(dir: string, exclude: string[], results: CheckResult[], depth: number): void {
    if (depth > 10) return;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!exclude.includes(entry.name)) this.walkDir(path.join(dir, entry.name), exclude, results, depth + 1);
      } else if (entry.isFile()) {
        results.push(...this.scanFile(path.join(dir, entry.name)));
      }
    }
  }

  private buildReport(results: CheckResult[]): OracleReport {
    const errors = results.filter(r => r.severity === 'error').length;
    const warnings = results.filter(r => r.severity === 'warning').length;
    const autoFixable = results.filter(r => r.autoFixable).length;
    const maxScore = 100;
    const penalty = errors * 10 + warnings * 3;
    const score = Math.max(0, Math.min(maxScore, maxScore - penalty));

    return { totalChecks: results.length, errors, warnings, autoFixable, results, score };
  }
}

function findIssues(
  content: string, pattern: RegExp, message: string, severity: CheckResult['severity'],
  category: CheckResult['category'], confidence: number, autoFixable: boolean, fixSuffix?: string,
): CheckResult[] {
  const results: CheckResult[] = [];
  const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const line = content.slice(0, match.index).split('\n').length;
    results.push({
      id: randomUUID(), severity, category, message,
      filePath: '', line, suggestion: `Fix: ${message}`,
      confidence, autoFixable,
      fix: autoFixable && fixSuffix ? `${match[0]}${fixSuffix}` : undefined,
    });
  }

  return results;
}

export function createCorrectionOracle(customRules?: OracleRule[]): CorrectionOracle {
  return new CorrectionOracle(customRules);
}
