import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.ideia.init-command');
import path from 'node:path';
import fs from 'node:fs';
import { detectStack } from '../detect';
import { ALLOWED_FLAVORS, TEMPLATES } from '../init';

interface IdeiaInitConfig {
  ideia: {
    version: string;
    autonomy: string;
    provider: { ollama: { model: string }; priority: string[] };
  };
  project: { name: string; stack: Record<string, string> };
  agents: { enabled: string[] };
}

function generateIdeiaConfig(targetDir: string, projectName: string, stack: string, database: string): void {
  const config: IdeiaInitConfig = {
    ideia: {
      version: '1.0.0',
      autonomy: 'N1',
      provider: {
        ollama: { model: 'qwen2.5-coder' },
        priority: ['ollama', 'openai'],
      },
    },
    project: {
      name: projectName,
      stack: { framework: stack, database },
    },
    agents: {
      enabled: ['architect', 'db-modeler', 'api-builder', 'frontend-dev', 'test-engineer', 'devops'],
    },
  };

  const configDir = path.join(targetDir, '.ai');
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.ai', 'ideia.json'), JSON.stringify(config, null, 2));

  const readme = [
    `# ${projectName}`,
    '',
    `> Projeto gerado com **IDEIA** — Dê a ideia, nós entregamos a solução.`,
    '',
    '## Stack',
    `- Framework: ${stack}`,
    `- Database: ${database}`,
    '',
    '## Comandos',
    '```bash',
    'ideia status          # Dashboard do projeto',
    'ideia idea analyze    # Analisar nova ideia',
    'ideia quality check   # Verificar qualidade',
    '```',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(targetDir, 'README.md'), readme);
}

export function ideiaInitCommand(): Command {
  return new Command('init')
    .description('Inicializa um novo projeto IDEIA')
    .argument('<project-name>', 'Nome do projeto')
    .option('--stack <stack>', 'Stack principal (nextjs, nestjs, fastapi, react, vue)', 'nextjs')
    .option('--database <database>', 'Banco de dados (postgres, mysql, sqlite, mongodb)', 'postgres')
    .option('--template <name>', `Template de projeto (${TEMPLATES.join(', ')})`)
    .option('--autonomy <level>', 'Nível de autonomia inicial (N0-N4)', 'N1')
    .option('--force', 'Sobrescreve arquivos existentes')
    .option('--dry-run', 'Mostra o que seria feito sem executar')
    .action((projectName: string, options) => {
      try {
        const targetDir = path.resolve(process.cwd(), projectName);

        if (options.dryRun) {
          logger.info('\n[DRY-RUN] IDEIA init: ${projectName}');
          logger.info('  Destino: ${targetDir}');
          logger.info('  Stack: ${options.stack}');
          logger.info('  Database: ${options.database}');
          logger.info('  Autonomia: ${options.autonomy}');
          logger.info('  Template: ${options.template || \'nenhum\'}\n');
          return;
        }

        if (fs.existsSync(targetDir) && !options.force) {
          console.error(`\n❌ Diretório "${projectName}" já existe. Use --force para sobrescrever.\n`);
          process.exit(1);
        }

        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const existingStack = detectStack(targetDir);
        const effectiveStack = existingStack.frameworks.length > 0
          ? existingStack.frameworks[0]
          : options.stack;

        generateIdeiaConfig(targetDir, projectName, effectiveStack, options.database);

        logger.info('\n${\'=\'.repeat(56)}');
        logger.info('  ✅ IDEIA — Projeto inicializado');
        logger.info('${\'=\'.repeat(56)}\n');
        logger.info('  📁 ${targetDir}');
        logger.info('  🏗️  ${effectiveStack} + ${options.database}');
        logger.info('  🤖 Autonomia: ${options.autonomy}');
        logger.info('  📋 Config: .ai/ideia.json\n');
        logger.info('  Próximos passos:');
        logger.info('    cd ${projectName}');
        logger.info('    ideia status');
        logger.info('    ideia idea analyze "Minha ideia"\n');

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });
}
