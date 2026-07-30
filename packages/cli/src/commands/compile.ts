import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { printHeader, printLine, printResult, finish } from "../utils/output";
import { getIO } from '../io';
import { getBaseRules, getProjectName, getFramework, getCoverageMin, compileClaude, compileCursor, compileCopilot, compileWindsurf, compileCline, compileGemini, compileContinue, compileZed, compileAmazonQ, compileCodex, compileAider, compileCursorMdc, compileGithubActions, readLaws, readManifest, readGlobalRules, readPolicies, getPathScopedOutputs, startWatch, COMPILERS, TARGET_PATHS, TARGETS, LawsConfig, ProjectManifest, Target } from './compile-utils';

// ============================================================
// Comando CLI
// ============================================================

/**
 * Builds the `compile` CLI command (governance compiler for 13+ AI tool formats).
 * @returns The configured Commander command.
 */
export function compileAllAction(options: { dryRun?: boolean }): void {
  const root = process.cwd();
  const manifest = readManifest(root);
  const laws = readLaws(root);
  const globalRules = readGlobalRules(root);
  const policies = readPolicies(root);

  printHeader('Governance Compiler — 13+ Targets');
  printLine(`Rules found: ${(laws.rules?.length || 0) + globalRules.length + policies.length}`);
  printLine(`Targets: ${TARGETS.join(', ')}`);

  const generated: string[] = [];
  const errors: string[] = [];

  for (const target of TARGETS) {
    const content = COMPILERS[target](manifest, laws, globalRules, policies);
    const relativePath = TARGET_PATHS[target];
    const fullPath = path.join(root, relativePath);

    if (!options.dryRun) {
      try {
        getIO().fs.mkDir(path.dirname(fullPath), true);
        getIO().fs.write(fullPath, content);
        printResult(target, true, relativePath);
        generated.push(relativePath);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        printResult(target, false, msg);
        errors.push(msg);
      }
    } else {
      printLine(`[DRY-RUN] ${relativePath} (${content.length} bytes)`);
      generated.push(`${relativePath} (dry-run)`);
    }
  }

  const scopedOutputs = getPathScopedOutputs(root, manifest, laws, globalRules, policies);
  for (const output of scopedOutputs) {
    if (!options.dryRun) {
      try {
        const fullPath = path.join(root, output.path);
        getIO().fs.mkDir(path.dirname(fullPath), true);
        getIO().fs.write(fullPath, output.content);
        printLine(`  [SCOPED] ${output.path}`);
        generated.push(output.path);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(msg);
      }
    } else {
      printLine(`[DRY-RUN] [SCOPED] ${output.path} (${output.content.length} bytes)`);
      generated.push(`${output.path} (dry-run)`);
    }
  }

  const ok = errors.length === 0;
  finish({
    checkpoint: 'compile', ok, status: ok ? 'passed' : 'failed',
    context_summary: ok ? `Compilado ${generated.length} arquivos: ${generated.join(', ')}` : `Erros: ${errors.join('; ')}`,
    data: { generated, errors, targetsCount: TARGETS.length },
  });
}

export function compileListAction(): void {
  printHeader('Formatos Disponiveis (13 targets)');
  for (const target of TARGETS) {
    printLine(`  ${target.padEnd(15)} → ${TARGET_PATHS[target]}`);
  }
  printLine('');
  printLine('Path-Scoped Rules:');
  printLine('  Gera .clinerules e .cursorrules por subdiretorio');
  printLine('  Configure em .ai/laws.yaml > path_scoped_rules');
}

export function compileSingleAction(target: Target, options: { dryRun?: boolean }): void {
  const root = process.cwd();
  const manifest = readManifest(root);
  const laws = readLaws(root);
  const globalRules = readGlobalRules(root);
  const policies = readPolicies(root);

  const rulesCount = (laws.rules?.length || 0) + globalRules.length + policies.length;
  printHeader(`Compile: ${target}`);
  printLine(`Rules: ${rulesCount}`);

  const content = COMPILERS[target](manifest, laws, globalRules, policies);
  const relativePath = TARGET_PATHS[target];
  const fullPath = path.join(root, relativePath);

  if (!options.dryRun) {
    try {
      getIO().fs.mkDir(path.dirname(fullPath), true);
      getIO().fs.write(fullPath, content);
      printResult(target, true, relativePath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      printResult(target, false, msg);
    }
  } else {
    printLine(`[DRY-RUN] ${relativePath} (${content.length} bytes)`);
  }

  finish({
    checkpoint: `compile_${target}`, ok: true, status: 'passed',
    context_summary: `Compilado ${target} → ${relativePath}`,
    data: { target, path: relativePath, rules: rulesCount },
  });
}

export function compileCommand(): Command {
  const cmd = new Command('compile')
    .description('Compila regras de governanca para formatos nativos de ferramentas de IA (13+ formatos)');

  cmd
    .command('all')
    .description('Compila para todos os 13 formatos disponiveis')
    .option('--dry-run', 'Mostra o que seria gerado sem escrever')
    .action((options: { dryRun?: boolean }) => compileAllAction(options));

  cmd
    .command('list')
    .description('Lista os 13 formatos disponiveis')
    .action(compileListAction);

  // TASK-GAP-03: Auto-Recompile Watch
  cmd
    .command('watch')
    .description('Monitora .ai/laws.yaml e recompila automaticamente ao detectar mudancas')
    .option('--interval <ms>', 'Intervalo de verificacao em milissegundos', '5000')
    .action((options: { interval?: string }) => {
      const root = process.cwd();
      const intervalMs = parseInt(options.interval || '5000', 10);
      printHeader('Auto-Recompile Watch (TASK-GAP-03)');
      printLine(`Root: ${root}`);
      printLine(`Interval: ${intervalMs}ms`);
      printLine('Press Ctrl+C to stop');
      printLine('');

      // Compile once at start
      const manifest = readManifest(root);
      const laws = readLaws(root);
      const globalRules = readGlobalRules(root);
      const policies = readPolicies(root);

      for (const target of TARGETS) {
        const content = COMPILERS[target](manifest, laws, globalRules, policies);
        const relativePath = TARGET_PATHS[target];
        const fullPath = path.join(root, relativePath);
        getIO().fs.mkDir(path.dirname(fullPath), true);
        getIO().fs.write(fullPath, content);
      }
      printLine(`[WATCH] Initial compile complete (${TARGETS.length} targets)`);

      const timer = startWatch(root, intervalMs);

      // Keep process alive
      process.on('SIGINT', () => {
        clearInterval(timer);
        printLine('[WATCH] Stopped');
        process.exit(0);
      });
    });

  // Comandos individuais por target
  TARGETS.forEach(target => {
    cmd
      .command(target)
      .description(`Compila apenas para ${target} (${TARGET_PATHS[target]})`)
      .option('--dry-run', 'Mostra o que seria gerado sem escrever')
      .action((options: { dryRun?: boolean }) => compileSingleAction(target, options));
  });

  return cmd;
}

// Re-exports for backward compatibility with tests
export { getBaseRules, getProjectName, getFramework, getCoverageMin, LawsConfig, ProjectManifest, Target, TARGETS, COMPILERS, TARGET_PATHS, compileClaude, compileCursor, compileCopilot, compileWindsurf, compileCline, compileGemini, compileContinue, compileZed, compileAmazonQ, compileCodex, compileAider, compileCursorMdc, compileGithubActions, readLaws, readManifest, readGlobalRules, readPolicies, getPathScopedOutputs, startWatch } from './compile-utils';