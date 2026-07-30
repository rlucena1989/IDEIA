import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { RealitySyncDaemon, createDefaultConfig, ProactiveInitiativeEngine } from './index';
const logger = createLogger('reality-sync');

const program = new Command();

program
  .name('reality-sync')
  .description('Reality Sync Engine — watcher contínuo de alinhamento código ↔ documentação');

program
  .command('start')
  .description('Inicia o daemon de sync em background')
  .option('--verbose', 'Log detalhado', false)
  .option('--debounce <ms>', 'Tempo de espera antes de sync', '2000')
  .option('--root <path>', 'Raiz do workspace', process.cwd())
  .action((opts) => {
      const config = createDefaultConfig(opts.root);
      const daemon = new RealitySyncDaemon({
        config,
        verbose: opts.verbose,
        debounceMs: parseInt(opts.debounce, 10),
      });

      daemon.on('sync:complete', ({ _ok, results }) => {
        if (opts.verbose) {
          for (const r of results) {
            for (const a of r.actions) logger.info('  ✓ ${a}');
            for (const e of r.errors) logger.info('  ✗ ${e}');
          }
        }
      });

      daemon.start();
      logger.info('RealitySync daemon started');
      logger.info('Watching: ${config.watchPaths.join(\', \')}');

      process.on('SIGINT', () => {
        daemon.stop();
        process.exit(0);
      });
      process.on('SIGTERM', () => {
        daemon.stop();
        process.exit(0);
      });
    });

program
    .command('stop')
    .description('Para o daemon (use SIGINT/SIGTERM no processo)')
    .action(() => {
      logger.info('Send SIGINT or SIGTERM to the daemon process to stop it.');
    });

program
    .command('sync')
    .description('Executa sync único (sem watcher)')
    .option('--root <path>', 'Raiz do workspace', process.cwd())
    .option('--verbose', 'Log detalhado', false)
    .action((opts) => {
      const config = createDefaultConfig(opts.root);
      const daemon = new RealitySyncDaemon({ config, verbose: opts.verbose });
      const results = daemon.syncNow();
      let allOk = true;
      for (const r of results) {
        if (r.actions.length) logger.info('Actions: ${r.actions.join(\', \')}');
        if (r.errors.length) { console.error(`Errors: ${r.errors.join(', ')}`); allOk = false; }
      }
      logger.info(allOk ? '✓ Sync complete' : '✗ Sync completed with errors');
      process.exit(allOk ? 0 : 1);
    });

program
    .command('scan')
    .description('Escaneia o projeto por issues auto-fixáveis')
    .option('--root <path>', 'Raiz do workspace', process.cwd())
    .option('--verbose', 'Log detalhado', false)
    .action((opts) => {
      const engine = new ProactiveInitiativeEngine(opts.root, opts.verbose);
      const result = engine.scanAll();
      logger.info('\nTotal: ${result.total} | Auto-fixable: ${result.fixable} | Requires human: ${result.unfixable}');
      for (const i of result.autoFixable) logger.info('  [${i.severity}] ${i.description}');
      for (const i of result.requiresHuman) logger.info('  [HUMAN] ${i.description}');
    });

program
    .command('heal')
    .description('Executa ciclo completo: scan → fix → verify')
    .option('--root <path>', 'Raiz do workspace', process.cwd())
    .option('--verbose', 'Log detalhado', false)
    .option('--approve', 'Força modo autonomous (ignora config)', false)
    .action((opts) => {
      const engine = new ProactiveInitiativeEngine(opts.root, opts.verbose);
      if (opts.approve) engine.setLevel('autonomous');
      const report = engine.runCycle();
      logger.info('\nFixed: ${report.fixed} | Failed: ${report.failed} | Skipped: ${report.skipped}');
      for (const d of report.details) {
        logger.info('  ${d.status === \'fixed\' ? \'✅\' : d.status === \'failed\' ? \'❌\' : d.status === \'pending\' ? \'⏳\' : \'⏭️\'} ${d.message}');
      }
      process.exit(report.failed > 0 ? 1 : 0);
    });

program
    .command('scan-studies')
    .description('Escaneia todos os estudos e calcula score de intensidade')
    .option('--root <path>', 'Raiz do workspace', process.cwd())
    .option('--verbose', 'Detalhado', false)
    .action((opts) => {
      const engine = new ProactiveInitiativeEngine(opts.root, opts.verbose);
      const results = engine.scanStudies();
      logger.info('\nScore Médio: ${(results.reduce((a, r) => a + r.score, 0) / results.length).toFixed(1)}');
      logger.info('Total: ${results.length} estudos');
      for (const r of results) {
        logger.info('  ${r.score}/5 ${r.name} (${r.lines}L)');
      }
    });

program
    .command('config')
    .description('Configura o nível de iniciativa')
    .option('--root <path>', 'Raiz do workspace', process.cwd())
    .option('--level <level>', 'Nível: passive | assisted | autonomous')
    .option('--risk <risk>', 'Risco máximo: low | medium | high')
    .option('--categories <cats>', 'Categorias auto-fixáveis (separadas por vírgula)')
    .option('--show', 'Mostra config atual', false)
    .action((opts) => {
      const engine = new ProactiveInitiativeEngine(opts.root, true);

      if (opts.show) {
        logger.info('\nCurrent initiative config:');
        logger.info('  Level:      ${engine.getLevel()}');
        logger.info('  Risk max:   ${engine.config.riskThreshold}');
        logger.info('  Categories: ${engine.config.autoFixCategories.join(\', \')}');
        return;
      }

      if (opts.level) {
        const valid = ['passive', 'assisted', 'autonomous'];
        if (!valid.includes(opts.level)) {
          console.error(`Invalid level: ${opts.level}. Use: ${valid.join(', ')}`);
          process.exit(1);
        }
        engine.setLevel(opts.level);
        logger.info('✓ Level set to: ${opts.level}');
      }

      if (opts.risk) {
        const valid = ['low', 'medium', 'high'];
        if (!valid.includes(opts.risk)) {
          console.error(`Invalid risk: ${opts.risk}. Use: ${valid.join(', ')}`);
          process.exit(1);
        }
        engine.setRiskThreshold(opts.risk);
        logger.info('✓ Risk threshold set to: ${opts.risk}');
      }

      if (opts.categories) {
        const cats = opts.categories.split(',').map((s: string) => s.trim()).filter(Boolean);
        engine.setAutoFixCategories(cats);
        logger.info('✓ Categories set to: ${cats.join(\', \')}');
      }
    });

program.parse(process.argv);
