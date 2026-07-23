import { Command } from 'commander';
import { printLine, printResult } from "../utils/output";
import {
  createBaseline, loadBaseline, getCurrentRules, detectDowngrades,
  type BaselineEntry, type DowngradeFinding, type SecurityRule
} from '../security/baseline';
import {
  evaluateFindings, logDowngradeAttempt, loadDowngradeLogs,
  type SecurityCheckResult
} from '../security/detector';
import { checkBarriers, addRule, loadRules } from '../utils/security/barrier';
import fs from 'node:fs';
import path from 'node:path';

/** Interface que define a estrutura de security deps. */
export interface SecurityDeps {
  root: string;
  loadBaseline: (root: string) => ReturnType<typeof loadBaseline>;
  getCurrentRules: (root: string) => ReturnType<typeof getCurrentRules>;
  detectDowngrades: (baseline: BaselineEntry[], current: BaselineEntry[]) => DowngradeFinding[];
  evaluateFindings: (findings: DowngradeFinding[], force: boolean, reason?: string) => SecurityCheckResult;
  logDowngradeAttempt: (root: string, finding: DowngradeFinding, reason?: string) => void;
  createBaseline: (root: string) => BaselineEntry[];
  loadDowngradeLogs: (root: string) => Record<string, unknown>[];
  printLine: (msg: string) => void;
  printResult: (msg: string, ok: boolean) => void;
}

/**
 * Runs the security downgrade check against the baseline.
 * @param deps - Injected security dependencies.
 * @param options - Options, optionally with `force` bypass and `reason`.
 */
export function runSecurityCheck(deps: SecurityDeps, options: { force?: boolean; reason?: string }): void {
  const baseline = deps.loadBaseline(deps.root);
  if (baseline.length === 0) {
    deps.printLine('Nenhum baseline encontrado. Execute "security baseline" primeiro.');
    return;
  }
  const current = deps.getCurrentRules(deps.root);
  const findings = deps.detectDowngrades(baseline, current);
  const result = deps.evaluateFindings(findings, !!options.force, options.reason);
  for (const f of findings) {
    const sev = f.severity === 'critical' ? '[CRITICAL]' : f.severity === 'high' ? '[HIGH]' : '[MEDIUM]';
    deps.printLine(`  ${sev} ${f.file}: "${f.rule.slice(0, 80)}" (${f.action})`);
    deps.logDowngradeAttempt(deps.root, f, options.reason);
  }
  deps.printLine('');
  deps.printLine(result.message);
  if (result.blocked) process.exitCode = 1;
}

/**
 * Compares current rules against the baseline and prints differences.
 * @param deps - Injected security dependencies.
 */
export function runSecurityDiff(deps: SecurityDeps): void {
  const baseline = deps.loadBaseline(deps.root);
  const current = deps.getCurrentRules(deps.root);
  const findings = deps.detectDowngrades(baseline, current);
  if (findings.length === 0) {
    deps.printResult('Nenhuma diferenca detectada entre baseline e estado atual.', true);
    return;
  }
  deps.printLine(`Diferencas de seguranca encontradas (${findings.length}):\n`);
  for (const f of findings) {
    const sev = f.severity === 'critical' ? '[CRITICAL]' : f.severity === 'high' ? '[HIGH]' : '[MEDIUM]';
    deps.printLine(`  ${sev} ${f.file}`);
    deps.printLine(`    Regra: "${f.rule.slice(0, 80)}"`);
    deps.printLine(`    Acao: removida\n`);
  }
}

/**
 * Creates a new security baseline snapshot from current rules.
 * @param deps - Injected security dependencies.
 */
export function runSecurityBaseline(deps: SecurityDeps): void {
  const entries = deps.createBaseline(deps.root);
  const totalRules = entries.reduce((sum: number, e: BaselineEntry) => sum + e.rules.length, 0);
  deps.printResult(`Baseline criada com ${entries.length} arquivo(s) e ${totalRules} regra(s).`, true);
  deps.printLine(`  Arquivo: .ai/security/baseline.json`);
  for (const entry of entries) {
    const critical = entry.rules.filter((r: SecurityRule) => r.severity === 'critical').length;
    const high = entry.rules.filter((r: SecurityRule) => r.severity === 'high').length;
    deps.printLine(`  ${entry.file}: ${entry.rules.length} regras (${critical} critical, ${high} high)`);
  }
}

/**
 * Displays the recorded security downgrade attempt logs.
 * @param deps - Injected security dependencies.
 */
export function runSecurityLogs(deps: SecurityDeps): void {
  const logs = deps.loadDowngradeLogs(deps.root);
  if (logs.length === 0) {
    deps.printLine('Nenhuma tentativa de downgrade registrada.');
    return;
  }
  deps.printLine(`Tentativas de downgrade (${logs.length}):\n`);
  for (const entry of logs) {
    const e = entry as Record<string, unknown>;
    deps.printLine(`  [${e.severity}] ${e.file}`);
    deps.printLine(`    Regra: ${(e.rule as string || '').slice(0, 80)}`);
    deps.printLine(`    Data: ${e.timestamp}`);
    deps.printLine(`    Motivo: ${e.reason}\n`);
  }
}

function makeDeps(): SecurityDeps {
  return {
    root: process.cwd(),
    loadBaseline, getCurrentRules, detectDowngrades, evaluateFindings, logDowngradeAttempt,
    createBaseline, loadDowngradeLogs, printLine, printResult,
  };
}

/**
 * Builds the `security` CLI command (baseline, diff, logs, barrier).
 * @returns The configured Commander command.
 */
export function securityCommand(): Command {
  const cmd = new Command('security')
    .description('Seguranca — baseline, downgrade detection e bloqueio');

  cmd
    .command('check')
    .description('Verifica se regras de seguranca foram removidas')
    .option('--force', 'Bypassa bloqueio de regras criticas')
    .option('--reason <reason>', 'Motivo do bypass (obrigatorio com --force para regras critical)')
    .action((opts: { force?: boolean; reason?: string }) => runSecurityCheck(makeDeps(), opts));

  cmd
    .command('diff')
    .description('Mostra diferencas de regras de seguranca entre baseline e atual')
    .action(() => runSecurityDiff(makeDeps()));

  cmd
    .command('baseline')
    .description('Cria snapshot das regras de seguranca atuais')
    .action(() => runSecurityBaseline(makeDeps()));

  cmd
    .command('logs')
    .description('Exibe historico de tentativas de downgrade')
    .action(() => runSecurityLogs(makeDeps()));

  const barrier = cmd.command('barrier')
    .description('Barreiras de seguranca — protege arquivos de auth, secrets e schema');

  barrier.command('check')
    .description('Verifica se arquivos protegidos foram modificados')
    .option('--bypass <reason>', 'Justificativa para bypass')
    .action((opts: Record<string, unknown>) => {
      const cwd = process.cwd();
      const allFiles: string[] = [];
      function walk(dir: string) {
        try {
          for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, e.name);
            if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') walk(full);
            else if (e.isFile()) allFiles.push(path.relative(cwd, full));
          }
        } catch { }
      }
      walk(cwd);
      const result = checkBarriers(cwd, allFiles, opts.bypass as string);
      const rules = loadRules(cwd);

      console.log(`\n=== Barreiras de Seguranca ===`);
      console.log(`Regras: ${rules.length}`);
      console.log(`Arquivos escaneados: ${allFiles.length}`);
      console.log(`Arquivos bloqueados: ${result.blocked.length}`);
      console.log(`Avisos: ${result.warnings.length}`);
      if (result.bypass) console.log(`Bypass: ${result.bypass}`);

      if (result.blocked.length > 0) {
        console.log(`\nArquivos bloqueados:`);
        result.blocked.forEach(f => console.log(`  🔒 ${f}`));
      }
      if (result.warnings.length > 0) {
        console.log(`\nArquivos com aviso:`);
        result.warnings.forEach(f => console.log(`  ⚠️ ${f}`));
      }

      for (const r of rules) {
        const icon = r.severity === 'block' ? '🔒' : '⚠️';
        console.log(`  ${icon} ${r.pattern} — ${r.description}`);
      }

      if (result.blocked.length > 0 && !result.bypass) process.exit(1);
    });

  barrier.command('list')
    .description('Lista arquivos protegidos e regras')
    .action(() => {
      const cwd = process.cwd();
      const rules = loadRules(cwd);
      printLine(`\n=== Regras de Barreira (${rules.length}) ===\n`);
      for (const r of rules) {
        printLine(`  [${r.severity.toUpperCase()}] ${r.pattern}`);
        printLine(`    ${r.description}`);
      }
    });

  barrier.command('add <pattern>')
    .description('Adiciona novo padrao de protecao')
    .option('--severity <severity>', 'block ou warn', 'block')
    .option('--desc <description>', 'Descricao da regra', 'Protegido por barreira')
    .action((pattern: string, opts: Record<string, unknown>) => {
      addRule(process.cwd(), pattern, opts.severity as 'block' | 'warn', opts.desc as string);
      console.log(`Regra adicionada: [${opts.severity}] ${pattern} — ${opts.desc}`);
    });

  return cmd;
}
