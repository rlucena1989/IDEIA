import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.ideia.quality-command');
import { computeScorecard } from '../scorecard';
import { runPipeline, listAllCheckpoints, printStatus } from '../../utils/gate/runner';
import { printHeader, printLine } from '../../utils/output';

const _QUALITY_DIMENSIONS = [
  { id: 'code', label: 'Código', weight: 20 },
  { id: 'security', label: 'Segurança', weight: 15 },
  { id: 'performance', label: 'Performance', weight: 15 },
  { id: 'ux', label: 'UX', weight: 10 },
  { id: 'integration', label: 'Integração', weight: 15 },
  { id: 'resilience', label: 'Resiliência', weight: 15 },
  { id: 'data', label: 'Dados', weight: 10 },
];

export function ideiaQualityCommand(): Command {
  const cmd = new Command('quality')
    .description('Quality gates e scorecard do IDEIA');

  cmd
    .command('check')
    .description('Executa quality gates completos')
    .option('--stage <stage>', 'Começa de um estágio específico')
    .option('--resume', 'Continua do último estágio falho')
    .option('--json', 'Saída em JSON')
    .action((options) => {
      try {
        const cwd = process.cwd();
        logger.info('\n${\'=\'.repeat(56)}');
        logger.info('  ✅ IDEIA — Quality Gates');
        logger.info('${\'=\'.repeat(56)}\n');

        runPipeline(cwd, options.stage as string, !!options.resume, !!options.json);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('scorecard')
    .description('Gera scorecard completo do projeto')
    .option('--json', 'Saída em JSON')
    .option('--trends', 'Mostra tendência')
    .option('--forecast', 'Previsão 30 dias')
    .option('--html', 'Gera relatório HTML')
    .action((options) => {
      try {
        const result = computeScorecard();

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        logger.info('\n${\'=\'.repeat(56)}');
        logger.info('  📊 IDEIA — Scorecard');
        logger.info('${\'=\'.repeat(56)}\n');

        logger.info('  Overall: ${result.overallScore}/100');
        logger.info('  Maturidade: ${result.maturityLevel}');
        logger.info('  Categorias: ${result.evolution.categories} | Itens: ${result.evolution.items}');
        console.log('');

        for (const cat of result.categories.slice(0, 10)) {
          const icon = cat.score >= 85 ? '✅' : cat.score >= 65 ? '⚠️' : '❌';
          const bar = '█'.repeat(Math.round(cat.score / 5));
          logger.info('  ${icon} ${cat.name.padEnd(20)} ${Math.round(cat.score)}/100 ${bar}');
        }

        if (result.recommendations.length > 0) {
          logger.info('\n  💡 Recomendações:\n');
          for (const rec of result.recommendations.slice(0, 5)) {
            logger.info('  • ${rec.text}');
          }
        }

        console.log('');

        if (options.trends && result.trends.length > 0) {
          logger.info('  📈 Tendência:\n');
          for (const t of result.trends.slice(-10)) {
            logger.info('  ${t.timestamp.slice(0, 10)}: ${t.overallScore}/100');
          }
          console.log('');
        }

        if (options.forecast && result.forecast) {
          logger.info('  🔮 Previsão 30 dias:\n');
          logger.info('  Score previsto: ${result.forecast.forecast}/100');
          logger.info('  Confiança: ${result.forecast.confidence}');
          logger.info('  Tendência: ${result.forecast.trend}');
          console.log('');
        }

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('gates')
    .description('Lista quality gates disponíveis')
    .option('--json', 'Saída em JSON')
    .action((options) => {
      try {
        const cwd = process.cwd();
        const checkpoints = listAllCheckpoints(cwd);

        if (options.json) {
          console.log(JSON.stringify({ gates: checkpoints }, null, 2));
          return;
        }

        logger.info('\n${\'=\'.repeat(56)}');
        logger.info('  ⚙️  IDEIA — Quality Gates Disponíveis');
        logger.info('${\'=\'.repeat(56)}\n');

        if (checkpoints.length === 0) {
          logger.info('  Nenhum quality gate definido.\n');
          return;
        }

        for (const cp of checkpoints) {
          logger.info('  • ${cp}');
        }
        console.log('');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
