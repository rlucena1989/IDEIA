import fs from 'node:fs';
import path from 'node:path';
import { DowngradeFinding } from './baseline';

const DOWNGRADE_LOG = '.ai/reports/security/downgrades.jsonl';

/**
 * Registra downgrade attempt.
 * @param root - Valor root.
 * @param finding - Valor finding.
 * @param reason - Valor reason.
 */
export function logDowngradeAttempt(root: string, finding: DowngradeFinding, reason?: string): void {
  const logPath = path.join(root, DOWNGRADE_LOG);
  const dir = path.dirname(logPath);
  fs.mkdirSync(dir, { recursive: true });

  const entry = {
    timestamp: new Date().toISOString(),
    file: finding.file,
    rule: finding.rule,
    severity: finding.severity,
    action: finding.action,
    reason: reason || 'sem motivo'
  };

  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
}

/** Interface que define a estrutura de security check result. */
export interface SecurityCheckResult {
  blocked: boolean;
  criticalCount: number;
  findings: DowngradeFinding[];
  message: string;
}

/**
 * Processa findings.
 * @param findings - Valor findings.
 * @param force - Valor force.
 * @param reason - Valor reason.
 * @returns O resultado da operação.
 */
export function evaluateFindings(
  findings: DowngradeFinding[],
  force: boolean,
  reason?: string
): SecurityCheckResult {
  const critical = findings.filter(f => f.severity === 'critical');
  const blocked = !force && critical.length > 0;

  let message: string;
  if (findings.length === 0) {
    message = 'Nenhum downgrade detectado. Baseline intacta.';
  } else if (blocked) {
    message = `BLOQUEADO: ${critical.length} regra(s) critica(s) removida(s). Use --force --reason para bypassar.`;
  } else if (force && critical.length > 0) {
    message = `BYPASS com --force: ${critical.length} regra(s) critica(s) removida(s). Motivo: ${reason || 'nao informado'}`;
  } else {
    message = `ATENCAO: ${findings.length} regra(s) nao-critica(s) removida(s). Nao bloqueante.`;
  }

  return { blocked, criticalCount: critical.length, findings, message };
}

/**
 * Carrega downgrade logs.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function loadDowngradeLogs(root: string): Record<string, unknown>[] {
  const logPath = path.join(root, DOWNGRADE_LOG);
  if (!fs.existsSync(logPath)) return [];

  return fs.readFileSync(logPath, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
}
