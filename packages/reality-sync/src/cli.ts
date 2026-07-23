import { Command } from 'commander';
import { RealitySyncDaemon, createDefaultConfig, ProactiveInitiativeEngine } from './index';

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
            for (const a of r.actions) console.log(`  ✓ ${a}`);
            for (const e of r.errors) console.log(`  ✗ ${e}`);
          }
        }
      });

      daemon.start();
      console.log(`RealitySync daemon started`);
      console.log(`Watching: ${config.watchPaths.join(', ')}`);

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
      console.log('Send SIGINT or SIGTERM to the daemon process to stop it.');
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
        if (r.actions.length) console.log(`Actions: ${r.actions.join(', ')}`);
        if (r.errors.length) { console.error(`Errors: ${r.errors.join(', ')}`); allOk = false; }
      }
      console.log(allOk ? '✓ Sync complete' : '✗ Sync completed with errors');
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
      console.log(`\nTotal: ${result.total} | Auto-fixable: ${result.fixable} | Requires human: ${result.unfixable}`);
      for (const i of result.autoFixable) console.log(`  [${i.severity}] ${i.description}`);
      for (const i of result.requiresHuman) console.log(`  [HUMAN] ${i.description}`);
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
      console.log(`\nFixed: ${report.fixed} | Failed: ${report.failed} | Skipped: ${report.skipped}`);
      for (const d of report.details) {
        console.log(`  ${d.status === 'fixed' ? '✅' : d.status === 'failed' ? '❌' : d.status === 'pending' ? '⏳' : '⏭️'} ${d.message}`);
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
      console.log(`\nScore Médio: ${(results.reduce((a, r) => a + r.score, 0) / results.length).toFixed(1)}`);
      console.log(`Total: ${results.length} estudos`);
      for (const r of results) {
        console.log(`  ${r.score}/5 ${r.name} (${r.lines}L)`);
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
        console.log(`\nCurrent initiative config:`);
        console.log(`  Level:      ${engine.getLevel()}`);
        console.log(`  Risk max:   ${engine.config.riskThreshold}`);
        console.log(`  Categories: ${engine.config.autoFixCategories.join(', ')}`);
        return;
      }

      if (opts.level) {
        const valid = ['passive', 'assisted', 'autonomous'];
        if (!valid.includes(opts.level)) {
          console.error(`Invalid level: ${opts.level}. Use: ${valid.join(', ')}`);
          process.exit(1);
        }
        engine.setLevel(opts.level);
        console.log(`✓ Level set to: ${opts.level}`);
      }

      if (opts.risk) {
        const valid = ['low', 'medium', 'high'];
        if (!valid.includes(opts.risk)) {
          console.error(`Invalid risk: ${opts.risk}. Use: ${valid.join(', ')}`);
          process.exit(1);
        }
        engine.setRiskThreshold(opts.risk);
        console.log(`✓ Risk threshold set to: ${opts.risk}`);
      }

      if (opts.categories) {
        const cats = opts.categories.split(',').map((s: string) => s.trim()).filter(Boolean);
        engine.setAutoFixCategories(cats);
        console.log(`✓ Categories set to: ${cats.join(', ')}`);
      }
    });

program.parse(process.argv);
