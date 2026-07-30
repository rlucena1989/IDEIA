import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.reality-sync');
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';

const log = createLogger('cli:commands:reality-sync');
import {
  RealitySyncDaemon,
  createDefaultConfig,
  ProactiveInitiativeEngine,
  StudyIntensifier,
  applyProfile,
  getProfile,
  listProfiles,
} from '@ideia/reality-sync';

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerInterval: ReturnType<typeof setInterval> | null = null;

function startSpinner(msg: string): void {
  if (spinnerInterval) return;
  let i = 0;
  process.stdout.write(`  ${spinnerFrames[i]} ${msg}\r`);
  spinnerInterval = setInterval(() => {
    i = (i + 1) % spinnerFrames.length;
    process.stdout.write(`  ${spinnerFrames[i]} ${msg}\r`);
  }, 80);
}

function stopSpinner(msg?: string): void {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }
  if (msg) process.stdout.write(`  ✓ ${msg}\n`);
  else process.stdout.write('\n');
}

async function withProgress<T>(msg: string, fn: () => T | Promise<T>, showProgress: boolean): Promise<T> {
  if (showProgress) startSpinner(msg);
  try {
    const result = await fn();
    if (showProgress) stopSpinner(msg);
    return result;
  } catch (e) {
    if (showProgress) stopSpinner(`✗ ${msg} failed`);
    throw e;
  }
}

function createDaemon(verbose: boolean, debounceMs?: number): RealitySyncDaemon {
  const config = createDefaultConfig(process.cwd());
  return new RealitySyncDaemon({
    config,
    verbose,
    debounceMs: debounceMs || 2000,
    initiativeIntervalMs: 30 * 60 * 1000,
  });
}

export function realitySyncCommand(): Command {
  const cmd = new Command('reality-sync').description('Reality Sync Engine — mantém código, docs e manifests alinhados');

  cmd
    .command('start')
    .description('Inicia daemon de sync contínuo com auto-heal')
    .option('--verbose', 'Log detalhado')
    .option('--debounce <ms>', 'Debounce entre syncs', '2000')
    .action((opts) => {
      const daemon = createDaemon(!!opts.verbose, parseInt(opts.debounce, 10));

      daemon.on('sync:complete', ({ ok, results }: { ok: boolean; results: Array<{ actions: string[]; errors: string[] }> }) => {
        for (const r of results) {
          for (const a of r.actions) logger.info('  ✓ ${a}');
          for (const e of r.errors) log.error(`  ✗ ${e}`);
        }
      });

      daemon.start();
      log.info('RealitySync daemon started with auto-heal.');
      log.info('Auto-heal cycle every 30min. Press Ctrl+C to stop.');

      process.on('SIGINT', () => {
        daemon.stop();
        process.exit(0);
      });
      process.on('SIGTERM', () => {
        daemon.stop();
        process.exit(0);
      });
    });

  cmd
    .command('sync')
    .description('Executa sync único e sai')
    .option('--verbose', 'Log detalhado')
    .action((opts) => {
      const daemon = createDaemon(!!opts.verbose);
      const results = daemon.syncNow();
      for (const r of results) {
        for (const a of r.actions) logger.info('✓ ${a}');
        for (const e of r.errors) log.error(`✗ ${e}`);
      }
      const ok = results.every((r) => r.ok);
      logger.info(ok ? '✓ Reality sync complete' : '✗ Sync completed with errors');
      process.exit(ok ? 0 : 1);
    });

  cmd
    .command('scan')
    .description('Escaneia o projeto por issues auto-fixáveis')
    .option('--verbose', 'Detalhado')
    .action((opts) => {
      const engine = new ProactiveInitiativeEngine(process.cwd(), !!opts.verbose);
      const result = engine.scanAll();
      logger.info('\nScan results:');
      logger.info('  Total: ${result.total} issues');
      logger.info('  Auto-fixable: ${result.fixable}');
      logger.info('  Requires human: ${result.unfixable}');
      if (result.autoFixable.length > 0) {
        logger.info('\nAuto-fixable issues:');
        for (const issue of result.autoFixable) {
          logger.info('  [${issue.severity}] ${issue.description} (${issue.autoFix?.length || 0} fix actions)');
        }
      }
      if (result.requiresHuman.length > 0) {
        logger.info('\nRequires human intervention:');
        for (const issue of result.requiresHuman) {
          logger.info('  [${issue.severity}] ${issue.description}');
        }
      }
    });

  cmd
    .command('heal')
    .description('Executa ciclo completo: scan → fix → verify')
    .option('--verbose', 'Detalhado')
    .option('--approve', 'Força modo autonomous (ignora config)', false)
    .option('--dry-run', 'Apenas mostra issues sem aplicar fixes', false)
    .option('--progress', 'Mostra progresso detalhado', false)
    .action(async (opts) => {
      const engine = new ProactiveInitiativeEngine(process.cwd(), !!opts.verbose);
      if (opts.approve) engine.setLevel('autonomous');

      if (opts.dryRun) {
        if (opts.progress) startSpinner('Scanning for issues...');
        const scan = engine.scanAll();
        if (opts.progress) stopSpinner('Scan complete');
        logger.info('\nHeal dry-run report (${scan.total} total issues):');
        logger.info('  Auto-fixable: ${scan.fixable}');
        logger.info('  Requires human: ${scan.unfixable}');
        for (const issue of scan.autoFixable) {
          logger.info('  [${issue.severity}] ${issue.description} (${issue.autoFix?.length || 0} fix actions)');
        }
        for (const issue of scan.requiresHuman) {
          logger.info('  [${issue.severity}] ${issue.description} (requires human)');
        }
        process.exit(0);
      }

      const report = opts.progress ? await withProgress('Running heal cycle...', () => engine.runCycle(), true) : engine.runCycle();
      logger.info('\nHeal report:');
      logger.info('  Level: ${engine.getLevel()}');
      logger.info('  Scanned: ${report.scanned} issues');
      logger.info('  Fixed: ${report.fixed}');
      logger.info('  Failed: ${report.failed}');
      logger.info('  Skipped: ${report.skipped}');
      for (const d of report.details) {
        const icon = d.status === 'fixed' ? '✅' : d.status === 'failed' ? '❌' : d.status === 'pending' ? '⏳' : '⏭️';
        logger.info('  ${icon} ${d.message}');
      }
      process.exit(report.failed > 0 ? 1 : 0);
    });

  const configCmd = new Command('config').description('Gerencia configuração do reality-sync');

  configCmd
    .command('set')
    .description('Define um valor de configuração')
    .argument('<key>', 'Chave da configuração')
    .argument('<value>', 'Valor da configuração')
    .action((key: string, value: string) => {
      const configPath = path.join(process.cwd(), '.ai', 'reality-sync.json');
      let config: Record<string, unknown> = {};
      if (fs.existsSync(configPath)) {
        try {
          config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch {
          /* ignore */
        }
      }

      const parsedValue: unknown = value === 'true' ? true : value === 'false' ? false : !isNaN(Number(value)) ? Number(value) : value;
      config[key] = parsedValue;

      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      logger.info('✓ ${key} = ${JSON.stringify(parsedValue)}');
    });

  configCmd
    .command('get')
    .description('Obtém um valor de configuração')
    .argument('<key>', 'Chave da configuração')
    .action((key: string) => {
      const configPath = path.join(process.cwd(), '.ai', 'reality-sync.json');
      if (!fs.existsSync(configPath)) {
        log.info('Config file not found');
        return;
      }
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        logger.info(config[key] !== undefined ? JSON.stringify(config[key]) : 'undefined');
      } catch {
        log.warn('Error reading config');
      }
    });

  configCmd
    .command('show')
    .description('Mostra toda a configuração')
    .action(() => {
      const configPath = path.join(process.cwd(), '.ai', 'reality-sync.json');
      if (!fs.existsSync(configPath)) {
        log.info('Config file not found');
        return;
      }
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        console.log(JSON.stringify(config, null, 2));
      } catch {
        log.warn('Error reading config');
      }
    });

  configCmd
    .command('reset')
    .description('Reseta configuração para valores padrão')
    .action(() => {
      const configPath = path.join(process.cwd(), '.ai', 'reality-sync.json');
      const defaults = {
        level: 'assisted',
        riskThreshold: 'medium',
        autoFixCategories: ['package', 'governance', 'quality'],
        confirmBeforeWrite: true,
      };
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2), 'utf-8');
      logger.info('✓ Config reset to defaults');
    });

  const profileCmd = new Command('profile').description('Gerencia perfis de configuração');

  profileCmd
    .command('list')
    .description('Lista perfis disponíveis')
    .action(() => {
      const profiles = listProfiles();
      logger.info('\nPerfis disponíveis:');
      console.log('─'.repeat(60));
      for (const p of profiles) {
        logger.info('  ${p.name.padEnd(15)} ${p.label.padEnd(15)} ${p.level.padEnd(12)} risk=${p.riskThreshold}');
        logger.info("  ${''.padEnd(17)} ${p.description}");
        console.log();
      }
    });

  profileCmd
    .command('apply')
    .description('Aplica um perfil de configuração')
    .argument('<name>', 'Nome do perfil (soloDev, techLead, automator, enterprise, custom)')
    .action((name: string) => {
      const result = applyProfile(name, process.cwd());
      if (!result) {
        log.error(`✗ Perfil não encontrado: ${name}`);
        process.exit(1);
      }
    });

  configCmd.addCommand(profileCmd);
  cmd.addCommand(configCmd);

  cmd
    .command('scan-studies')
    .description('Escaneia todos os estudos e calcula score de intensidade (1-5)')
    .option('--verbose', 'Mostra detalhes de cada estudo', false)
    .action((opts) => {
      const engine = new ProactiveInitiativeEngine(process.cwd(), !!opts.verbose);
      const results = engine.scanStudies();
      logger.info('\n📊 Score de Intensidade dos Estudos\n');
      logger.info("  ${'Score'.padEnd(6)} ${'Nome'.padEnd(50)} ${'Linhas'.padEnd(8)} T ADR R M TM T");
      logger.info("  ${''.padEnd(6, '─')} ${''.padEnd(50, '─')} ${''.padEnd(8, '─')} ─ ─── ─ ─ ── ─");
      for (const r of results) {
        const scoreBar = '█'.repeat(r.score) + '░'.repeat(5 - r.score);
        logger.info(
          "  ${(r.score + ' ' + scoreBar).padEnd(6)} ${r.name.padEnd(50)} ${String(r.lines).padEnd(8)} ${r.hasTasks ? '✅' : '❌'} ${r.hasAdr ? '✅' : '❌'} ${r.hasRisks ? '✅' : '❌'} ${r.hasMetrics ? '✅' : '❌'} ${r.hasTimeline ? '✅' : '❌'} ${r.hasTests ? '✅' : '❌'}",
        );
      }
      const avg = results.reduce((a: number, r: { score: number }) => a + r.score, 0) / results.length;
      const max = Math.max(...results.map((r: { score: number }) => r.score));
      const min = Math.min(...results.map((r: { score: number }) => r.score));
      logger.info('\n  Média: ${avg.toFixed(1)} | Máx: ${max} | Mín: ${min} | Total: ${results.length} estudos');
      logger.info('\n  Legenda: T=Tasks ADR=ADR R=Riscos M=Métricas TM=Timeline T=Testes');
    });

  cmd
    .command('intensify')
    .description('Auto-intensifica estudos com gaps automaticamente')
    .option('--verbose', 'Detalhado', false)
    .option('--dry-run', 'Apenas mostra gaps sem aplicar fixes', false)
    .option('--progress', 'Mostra progresso detalhado', false)
    .action(async (opts) => {
      const engine = new StudyIntensifier(process.cwd(), !!opts.verbose);

      if (opts.progress) startSpinner('Scanning studies for gaps...');
      const gaps = engine.scanGaps();
      if (opts.progress) stopSpinner('Scan complete');

      logger.info('\n📊 Gaps encontrados: ${gaps.length} estudos\n');
      for (const g of gaps) {
        logger.info('  [${g.currentScore}/5 → ${g.targetScore}/5] ${g.study.substring(0, 50)}');
        logger.info("      Faltando: ${g.missing.join(', ')}");
      }

      if (opts.dryRun) {
        logger.info('\nDry-run: ${gaps.length} estudos precisam de intensificação');
        process.exit(0);
      }

      if (gaps.length === 0) {
        logger.info('\n✅ Todos os estudos estão completos!');
        process.exit(0);
      }

      if (opts.progress) startSpinner('Applying automatic intensification...');
      const report = opts.progress ? await withProgress('Intensifying studies...', () => engine.runCycle(), true) : engine.runCycle();
      if (opts.progress) stopSpinner('Intensification complete');
      logger.info('\nRelatório:');
      logger.info('  Scan: ${report.scanned} estudos');
      logger.info('  Fixes aplicados: ${report.fixesApplied}');
      logger.info('  Fixes falhos: ${report.fixesFailed}');
      for (const d of report.details) {
        const icon = d.status === 'fixed' ? '✅' : d.status === 'failed' ? '❌' : '⏭️';
        logger.info('  ${icon} ${d.study.substring(0, 45)}: ${d.action.substring(0, 60)}');
      }
      process.exit(report.fixesFailed > 0 ? 1 : 0);
    });

  return cmd;
}
