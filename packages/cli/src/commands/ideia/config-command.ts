import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.ideia.config-command');
import path from 'node:path';
import fs from 'node:fs';

interface IdeiaConfig {
  ideia: {
    version: string;
    autonomy: { level: string };
    provider: {
      ollama: { model: string };
      priority: string[];
    };
  };
  project: {
    name: string;
    stack: Record<string, string>;
  };
  agents: {
    enabled: string[];
    custom: string[];
  };
  quality: {
    minCoverage: number;
    gates: string[];
  };
}

const DEFAULT_CONFIG: IdeiaConfig = {
  ideia: {
    version: '1.0.0',
    autonomy: { level: 'N2' },
    provider: {
      ollama: { model: 'qwen2.5-coder' },
      priority: ['ollama', 'openai'],
    },
  },
  project: {
    name: '',
    stack: {},
  },
  agents: {
    enabled: ['architect', 'db-modeler', 'api-builder', 'frontend-dev', 'test-engineer', 'devops'],
    custom: [],
  },
  quality: {
    minCoverage: 80,
    gates: ['lint', 'typecheck', 'test', 'security', 'build'],
  },
};

function loadConfig(root: string): IdeiaConfig {
  try {
    const configPath = path.join(root, '.ai', 'ideia.json');
    if (fs.existsSync(configPath)) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}

function saveConfig(root: string, config: IdeiaConfig): void {
  const configDir = path.join(root, '.ai');
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, 'ideia.json'), JSON.stringify(config, null, 2));
}

function setNestedValue(obj: Record<string, unknown>, pathParts: string[], value: string): void {
  let current = obj;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const key = pathParts[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  const lastKey = pathParts[pathParts.length - 1];
  const parsed: unknown = !isNaN(Number(value)) ? Number(value) : value === 'true' ? true : value === 'false' ? false : value;
  current[lastKey] = parsed;
}

function getNestedValue(obj: Record<string, unknown>, pathParts: string[]): unknown {
  let current: unknown = obj;
  for (const key of pathParts) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

export function ideiaConfigCommand(): Command {
  const cmd = new Command('config')
    .description('Configuração do IDEIA');

  cmd
    .command('set')
    .description('Define uma configuração')
    .argument('<key>', 'Chave no formato "section.key" (ex: autonomy.level, provider.ollama.model)')
    .argument('<value>', 'Valor da configuração')
    .action((key: string, value: string) => {
      try {
        const root = process.cwd();
        const config = loadConfig(root);
        const pathParts = key.split('.');

        setNestedValue(config as unknown as Record<string, unknown>, pathParts, value);
        saveConfig(root, config);

        logger.info('\n✅ Configuração atualizada: ${key} = ${value}\n');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('get')
    .description('Mostra uma configuração')
    .argument('<key>', 'Chave no formato "section.key" (ex: autonomy.level)')
    .option('--json', 'Saída em JSON')
    .action((key: string, options) => {
      try {
        const root = process.cwd();
        const config = loadConfig(root);
        const pathParts = key.split('.');
        const value = getNestedValue(config as unknown as Record<string, unknown>, pathParts);

        if (options.json) {
          console.log(JSON.stringify({ key, value }, null, 2));
          return;
        }

        if (value === undefined) {
          logger.info('\n  Configuração "${key}" não encontrada.\n');
        } else {
          logger.info('\n  ${key} = ${JSON.stringify(value)}\n');
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('list')
    .description('Lista todas as configurações')
    .option('--json', 'Saída em JSON')
    .action((options) => {
      try {
        const root = process.cwd();
        const config = loadConfig(root);

        if (options.json) {
          console.log(JSON.stringify(config, null, 2));
          return;
        }

        logger.info('\n${\'=\'.repeat(56)}');
        logger.info('  ⚙️  IDEIA — Configuração');
        logger.info('${\'=\'.repeat(56)}\n');

        logger.info('  🔒 Autonomia:');
        logger.info('     Nível: ${config.ideia.autonomy.level}');
        console.log('');

        logger.info('  🤖 Provedor:');
        logger.info('     Modelo Ollama: ${config.ideia.provider.ollama.model}');
        logger.info('     Prioridade: ${config.ideia.provider.priority.join(\', \')}');
        console.log('');

        logger.info('  🧩 Agentes:');
        logger.info('     Habilitados: ${config.agents.enabled.join(\', \')}');
        if (config.agents.custom.length > 0) logger.info('     Customizados: ${config.agents.custom.join(\', \')}');
        console.log('');

        logger.info('  ✅ Qualidade:');
        logger.info('     Cobertura mínima: ${config.quality.minCoverage}%');
        logger.info('     Gates: ${config.quality.gates.join(\', \')}');
        console.log('');

        logger.info('  Para alterar: ideia config set <key> <value>');
        logger.info('  Exemplo: ideia config set autonomy.level N3');
        console.log('');

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('reset')
    .description('Reseta configurações para o padrão')
    .option('--force', 'Confirma sem prompt')
    .action((options) => {
      try {
        if (!options.force) {
          logger.info('\n  ⚠ Use --force para resetar as configurações.\n');
          return;
        }

        const root = process.cwd();
        saveConfig(root, { ...DEFAULT_CONFIG, project: { name: path.basename(root), stack: {} } });

        logger.info('\n✅ Configurações resetadas para o padrão.\n');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}


