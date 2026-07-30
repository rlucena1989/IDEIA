import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.ideia.deploy-command');
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { printHeader, printLine } from '../../utils/output';

interface DeployManifest {
  version: string;
  environment: 'staging' | 'production';
  timestamp: string;
  approved: boolean;
  artifacts: string[];
  checks: { name: string; passed: boolean }[];
}

function runPreDeployChecks(): { name: string; passed: boolean }[] {
  const checks: { name: string; passed: boolean }[] = [];
  const root = process.cwd();

  checks.push({ name: 'TypeScript compila', passed: false });
  try {
    execFileSync('npx tsc --noEmit', { cwd: root, stdio: 'pipe', timeout: 30000 });
    checks[checks.length - 1].passed = true;
  } catch {}

  checks.push({ name: 'Testes passam', passed: false });
  try {
    execFileSync('npm test --if-present', { cwd: root, stdio: 'pipe', timeout: 60000 });
    checks[checks.length - 1].passed = true;
  } catch {}

  checks.push({ name: 'Git working tree limpa', passed: false });
  try {
    const status = execFileSync('git status --porcelain', { cwd: root, encoding: 'utf8' });
    checks[checks.length - 1].passed = status.trim().length === 0;
  } catch {}

  checks.push({ name: 'Package.json versionado', passed: false });
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    checks[checks.length - 1].passed = !!pkg.version;
  } catch {}

  return checks;
}

export function ideiaDeployCommand(): Command {
  const cmd = new Command('deploy')
    .description('Deploy simplificado com wizard de aprovaÃ§Ã£o');

  cmd
    .command('prepare')
    .description('Prepara deploy para um ambiente')
    .requiredOption('--env <environment>', 'Ambiente (staging, production)')
    .option('--approve', 'Pula confirmaÃ§Ã£o')
    .option('--dry-run', 'Simula sem executar')
    .option('--json', 'SaÃ­da em JSON')
    .action((options) => {
      const env = options.env as string;
      if (env !== 'staging' && env !== 'production') {
        console.error(`\nâŒ Ambiente invÃ¡lido: "${env}". Use "staging" ou "production".\n`);
        process.exit(1);
      }

      try {
        const checks = runPreDeployChecks();

        if (options.dryRun) {
          logger.info('\n[DRY-RUN] Deploy para ${env}:\n');
          logger.info('  VerificaÃ§Ãµes:');
          for (const c of checks) logger.info('   ${c.passed ? \'âœ…\' : \'âŒ\'} ${c.name}');
          logger.info('\n  AÃ§Ãµes planejadas:');
          logger.info('   â€¢ Bump version');
          logger.info('   â€¢ Gerar release notes');
          logger.info('   â€¢ Publicar artefatos');
          console.log('   â€¢ Deploy para', env, '\n');
          return;
        }

        printHeader(`Deploy: ${env}`);

        const failedChecks = checks.filter(c => !c.passed);
        if (failedChecks.length > 0 && !options.approve) {
          logger.info('  âš  VerificaÃ§Ãµes de prÃ©-deploy:\n');
          for (const c of checks) {
            logger.info('   ${c.passed ? \'âœ…\' : \'âŒ\'} ${c.name}');
          }
          logger.info('\n  ${failedChecks.length} verificaÃ§Ã£o(Ãµes) falhou(ram). Use --approve para ignorar.\n');
          return;
        }

        for (const c of checks) {
          logger.info('   ${c.passed ? \'âœ…\' : \'âš \'} ${c.name} ${c.passed ? \'\' : \'(ignorado)\'}');
        }

        const manifest: DeployManifest = {
          version: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
          environment: env as 'staging' | 'production',
          timestamp: new Date().toISOString(),
          approved: !!options.approve,
          artifacts: ['build', 'docker-image', 'release-notes'],
          checks,
        };

        logger.info('\n  âœ… Deploy preparado para ${env}.\n');

        if (options.json) {
          console.log(JSON.stringify(manifest, null, 2));
        }

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\nâŒ Erro: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('status')
    .description('Mostra status do Ãºltimo deploy')
    .option('--json', 'SaÃ­da em JSON')
    .action((options) => {
      try {
        const root = process.cwd();
        const deployDir = path.join(root, '.ai', 'deploy');
        const historyPath = path.join(deployDir, 'history.json');

        let history: DeployManifest[] = [];
        try {
          if (fs.existsSync(historyPath)) {
            history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
          }
        } catch {}

        if (options.json) {
          console.log(JSON.stringify({ deploys: history.length, lastDeploy: history[history.length - 1] || null }, null, 2));
          return;
        }

        if (history.length === 0) {
          logger.info('\n  Nenhum deploy realizado.\n');
          return;
        }

        const last = history[history.length - 1];
        logger.info('\n${\'=\'.repeat(56)}');
        logger.info('  ðŸš€ IDEIA â€” Ãšltimo Deploy');
        logger.info('${\'=\'.repeat(56)}\n');
        logger.info('  Ambiente: ${last.environment}');
        logger.info('  VersÃ£o: ${last.version}');
        logger.info('  Data: ${new Date(last.timestamp).toLocaleString()}');
        logger.info('  Status: ${last.approved ? \'âœ… Aprovado\' : \'â³ Pendente\'}');
        logger.info('  Artefatos: ${last.artifacts.join(\', \')}');
        logger.info('  Total de deploys: ${history.length}\n');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\nâŒ Erro: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
