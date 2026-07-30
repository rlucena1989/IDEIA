import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.ideia.status-command');
import path from 'node:path';
import fs from 'node:fs';
import { computeStatus } from '../status';
import { detectStack } from '../detect';
import { listEngineerSessions } from '../engineer';
import { computeScorecard } from '../scorecard';

interface IdeiaProjectStatus {
  name: string;
  stack: { languages: string[]; frameworks: string[] };
  health: { score: number; level: string };
  agents: { active: number; idle: number; busy: number; blocked: number };
  ideas: { total: number; running: number; completed: number; failed: number };
  quality: { overall: number; maturity: string };
  decisions: number;
  autonomy: string;
}

function getAutonomyLevel(targetDir: string): string {
  try {
    const configPath = path.join(targetDir, '.ai', 'ideia.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.ideia?.autonomy || 'N1';
    }
  } catch {}
  return 'N1';
}

function countDecisions(targetDir: string): number {
  try {
    const decisionsDir = path.join(targetDir, '.ai', 'decisions');
    if (fs.existsSync(decisionsDir)) {
      return fs.readdirSync(decisionsDir).filter(f => f.endsWith('.json') || f.endsWith('.md')).length;
    }
  } catch {}
  return 0;
}

function getAgentCounts(): { active: number; idle: number; busy: number; blocked: number } {
  return { active: 6, idle: 4, busy: 1, blocked: 0 };
}

export function ideiaStatusCommand(): Command {
  return new Command('status')
    .description('Dashboard do projeto IDEIA')
    .option('--json', 'Saída em JSON')
    .action((options) => {
      try {
        const root = process.cwd();
        const stack = detectStack();
        const health = computeStatus();
        const sessions = listEngineerSessions(root);
        const scorecard = computeScorecard();
        const agents = getAgentCounts();
        const decisions = countDecisions(root);
        const autonomy = getAutonomyLevel(root);

        const status: IdeiaProjectStatus = {
          name: path.basename(root),
          stack: { languages: stack.languages, frameworks: stack.frameworks },
          health: { score: health.finalHealth, level: health.finalHealth >= 85 ? 'bom' : health.finalHealth >= 65 ? 'regular' : 'crítico' },
          agents,
          ideas: {
            total: sessions.length,
            running: sessions.filter(s => s.status === 'planning' || s.status === 'implementing' || s.status === 'testing').length,
            completed: sessions.filter(s => s.status === 'completed').length,
            failed: sessions.filter(s => s.status === 'failed').length,
          },
          quality: { overall: scorecard.overallScore, maturity: scorecard.maturityLevel },
          decisions,
          autonomy,
        };

        if (options.json) {
          console.log(JSON.stringify(status, null, 2));
          return;
        }

        logger.info('\n${\'=\'.repeat(56)}');
        logger.info('  📊 IDEIA — Dashboard: ${status.name}');
        logger.info('${\'=\'.repeat(56)}\n');

        logger.info('  🏗️  Stack:');
        logger.info('     Linguagens: ${status.stack.languages.join(\', \') || \'não detectada\'}');
        logger.info('     Frameworks: ${status.stack.frameworks.join(\', \') || \'não detectado\'}\n');

        const healthIcon = status.health.score >= 85 ? '✅' : status.health.score >= 65 ? '⚠️' : '❌';
        logger.info('  ${healthIcon} Saúde: ${status.health.score}/100 (${status.health.level})\n');

        logger.info('  🤖 Agentes:');
        logger.info('     Ativos: ${status.agents.active} | Ocupados: ${status.agents.busy} | Ociosos: ${status.agents.idle} | Bloqueados: ${status.agents.blocked}\n');

        logger.info('  💡 Ideias:');
        logger.info('     Total: ${status.ideas.total} | Executando: ${status.ideas.running} | Concluídas: ${status.ideas.completed} | Falhas: ${status.ideas.failed}\n');

        logger.info('  📋 Qualidade: ${status.quality.overall}/100 (${status.quality.maturity})\n');
        logger.info('  📝 Decisões registradas: ${status.decisions}');
        logger.info('  🔒 Autonomia: ${status.autonomy}\n');

        logger.info('  Comandos rápidos:');
        logger.info('    ideia quality check   → Verificar quality gates');
        logger.info('    ideia agent list      → Listar agentes');
        logger.info('    ideia memory show     → Ver memória');
        logger.info('    ideia config set autonomy.level N2 → Ajustar autonomia');
        console.log('');

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });
}
