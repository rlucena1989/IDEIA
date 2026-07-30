import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';

/** Interface que define a estrutura de barrier rule. */
export interface BarrierRule {
  pattern: string;
  severity: 'block' | 'warn';
  description: string;
}

const DEFAULT_RULES: BarrierRule[] = [
  { pattern: 'auth*.ts', severity: 'block', description: 'Arquivos de autenticacao' },
  { pattern: '*.auth.ts', severity: 'block', description: 'Arquivos de autenticacao' },
  { pattern: 'passport*', severity: 'block', description: 'Configuracao Passport' },
  { pattern: '.env*', severity: 'block', description: 'Arquivos de ambiente' },
  { pattern: 'credentials*', severity: 'block', description: 'Arquivos de credenciais' },
  { pattern: 'secrets*', severity: 'block', description: 'Arquivos de secrets' },
  { pattern: 'prisma/schema.prisma', severity: 'block', description: 'Schema do banco' },
  { pattern: '*schema*.ts', severity: 'warn', description: 'Arquivos de schema' },
];

function getRulesPath(cwd: string): string {
  return path.join(cwd, '.ai', 'policies', 'barriers.json');
}

/**
 * Carrega rules.
 * @param cwd - Valor cwd.
 * @returns O resultado da operação.
 */
export function loadRules(cwd: string): BarrierRule[] {
  const rulesPath = getRulesPath(cwd);
  if (fs.existsSync(rulesPath)) {
    try {
      return JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
    } catch { }
  }
  return DEFAULT_RULES;
}

/**
 * Persiste rules.
 * @param cwd - Valor cwd.
 * @param rules - Valor rules.
 */
export function saveRules(cwd: string, rules: BarrierRule[]): void {
  const rulesPath = getRulesPath(cwd);
  fs.mkdirSync(path.dirname(rulesPath), { recursive: true });
  fs.writeFileSync(rulesPath, JSON.stringify(rules, null, 2), 'utf-8');
}

function matchPattern(filePath: string, pattern: string): boolean {
  const regexSafe = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
  try {
    return new RegExp(regexSafe).test(filePath);
  } catch {
    return filePath.includes(pattern);
  }
}

/** Interface que define a estrutura de barrier check result. */
export interface BarrierCheckResult {
  blocked: string[];
  warnings: string[];
  bypass: string | null;
}

/**
 * Verifica barriers.
 * @param cwd - Valor cwd.
 * @param changedFiles - Valor files.
 * @param bypassReason - Valor reason.
 * @returns O resultado da operação.
 */
export function checkBarriers(cwd: string, changedFiles: string[], bypassReason?: string): BarrierCheckResult {
  const rules = loadRules(cwd);
  const result: BarrierCheckResult = { blocked: [], warnings: [], bypass: bypassReason || null };

  for (const file of changedFiles) {
    for (const rule of rules) {
      if (matchPattern(file, rule.pattern)) {
        if (rule.severity === 'block') {
          result.blocked.push(file);
        } else {
          result.warnings.push(file);
        }
      }
    }
  }

  // Apply bypass
  if (bypassReason && result.blocked.length > 0) {
    const auditPath = path.join(cwd, '.ai', 'audit-trail', 'barrier-bypass.log');
    fs.mkdirSync(path.dirname(auditPath), { recursive: true });
    const entry = `[${new Date().toISOString()}] BYPASS: ${result.blocked.join(', ')} — Reason: ${bypassReason}\n`;
    fs.appendFileSync(auditPath, entry, 'utf-8');
    result.blocked = [];
  }

  return result;
}

/**
 * Processa rule.
 * @param cwd - Valor cwd.
 * @param pattern - Valor pattern.
 * @param severity - Valor severity.
 * @param description - Valor description.
 */
export function addRule(cwd: string, pattern: string, severity: 'block' | 'warn', description: string): void {
  const rules = loadRules(cwd);
  rules.push({ pattern, severity, description });
  saveRules(cwd, rules);
}
