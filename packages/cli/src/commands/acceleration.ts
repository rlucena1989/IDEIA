import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { printLine, printResult, finish } from '../utils/output';
import { getIO } from '../io';

/**
 * Processa command.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function accelerationCommand(): Command {
  const cmd = new Command('acceleration')
    .description('Acceleration Engines â€” executa motores de aceleracao diretamente via CLI');

  cmd
    .command('run <mode>')
    .description('Executa pipeline de aceleracao (fast|balanced|deep)')
    .option('--target <dir>', 'Diretorio alvo', '.')
    .option('--json', 'Saida em JSON')
    .action((mode: string, opts: { target?: string; json?: boolean }) => {
      const cwd = process.cwd();
      const _target = opts.target || '.';
      const scripts: Record<string, string[]> = {
        fast: ['fingerprint', 'cache'],
        balanced: ['fingerprint', 'cache', 'config', 'types', 'predictor'],
        deep: ['fingerprint', 'cache', 'config', 'types', 'predictor', 'planner', 'executor', 'quality-reporter'],
      };

      const pipeline = scripts[mode];
      if (!pipeline) {
        printLine(`Modo invalido: "${mode}". Use: fast, balanced, deep`);
        finish({ checkpoint: 'acceleration_run', ok: false, status: 'failed', context_summary: 'Modo invalido' });
        return;
      }

      printLine(`Acceleration pipeline: ${mode} (${pipeline.length} stages)`);
      printLine('');

      const startTime = Date.now();
      let passed = 0;
      let failed = 0;

      for (const stage of pipeline) {
        const scriptPath = require('path').join(cwd, 'scripts', 'acceleration', `${stage}.js`);
        if (!getIO().fs.exists(scriptPath)) {
          printLine(`  [SKIP] ${stage} â€” script nao encontrado`);
          continue;
        }

        try {
          const { execFileSync } = require('node:child_process');
          const _result = execFileSync(`node "${scriptPath}"`, { cwd, encoding: 'utf8', timeout: 60000 });
          printLine(`  [OK]   ${stage}`);
          passed++;
        } catch (err: unknown) {
          const e = err as { stderr?: string; message?: string };
          printLine(`  [FAIL] ${stage} â€” ${e.stderr?.slice(0, 100) || e.message || 'unknown error'}`);
          failed++;
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      printLine(`\nPipeline ${mode} concluida em ${elapsed}s (${passed} ok, ${failed} falhas)`);

      finish({
        checkpoint: 'acceleration_run',
        ok: failed === 0,
        status: failed === 0 ? 'passed' : 'failed',
        context_summary: `${pipeline.length} stages: ${passed} ok, ${failed} falhas`,
      });
    });

  cmd
    .command('list')
    .description('Lista motores de aceleracao disponiveis')
    .option('--json', 'Saida em JSON')
    .action((opts: { json?: boolean }) => {
      const cwd = process.cwd();
      const scriptsDir = require('path').join(cwd, 'scripts', 'acceleration');
      const engines: string[] = [];

      if (getIO().fs.exists(scriptsDir)) {
        const files = getIO().fs.readDir(scriptsDir).filter((f: string) => f.endsWith('.js') || f.endsWith('.ts'));
        engines.push(...files.map((f: string) => f.replace(/\.(js|ts)$/, '')));
      }

      if (opts.json) {
        printLine(JSON.stringify({ engines, total: engines.length }, null, 2));
        return;
      }

      printLine(`Motores de aceleracao disponiveis (${engines.length}):\n`);
      for (const e of engines.sort()) {
        printLine(`  - ${e}`);
      }
    });

  cmd
    .command('info <engine>')
    .description('Informacoes sobre um motor de aceleracao')
    .action((engine: string) => {
      const cwd = process.cwd();
      const scriptPath = require('path').join(cwd, 'scripts', 'acceleration', `${engine}.js`);

      if (!getIO().fs.exists(scriptPath)) {
        printLine(`Motor "${engine}" nao encontrado.`);
        return;
      }

      const stats = getIO().fs.stat(scriptPath);
      printLine(`Motor: ${engine}`);
      printLine(`  Caminho: ${require('path').relative(cwd, scriptPath)}`);
      printLine(`  Tamanho: ${stats.size} bytes`);
      printLine(`  Ultima modificacao: ${new Date(stats.mtimeMs).toISOString()}`);
    });

  return cmd;
}
