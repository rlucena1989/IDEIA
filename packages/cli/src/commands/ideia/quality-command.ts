import { Command } from 'commander';
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
        console.log(`\n${'='.repeat(56)}`);
        console.log('  ✅ IDEIA — Quality Gates');
        console.log(`${'='.repeat(56)}\n`);

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

        console.log(`\n${'='.repeat(56)}`);
        console.log('  📊 IDEIA — Scorecard');
        console.log(`${'='.repeat(56)}\n`);

        console.log(`  Overall: ${result.overallScore}/100`);
        console.log(`  Maturidade: ${result.maturityLevel}`);
        console.log(`  Categorias: ${result.evolution.categories} | Itens: ${result.evolution.items}`);
        console.log('');

        for (const cat of result.categories.slice(0, 10)) {
          const icon = cat.score >= 85 ? '✅' : cat.score >= 65 ? '⚠️' : '❌';
          const bar = '█'.repeat(Math.round(cat.score / 5));
          console.log(`  ${icon} ${cat.name.padEnd(20)} ${Math.round(cat.score)}/100 ${bar}`);
        }

        if (result.recommendations.length > 0) {
          console.log('\n  💡 Recomendações:\n');
          for (const rec of result.recommendations.slice(0, 5)) {
            console.log(`  • ${rec.text}`);
          }
        }

        console.log('');

        if (options.trends && result.trends.length > 0) {
          console.log('  📈 Tendência:\n');
          for (const t of result.trends.slice(-10)) {
            console.log(`  ${t.timestamp.slice(0, 10)}: ${t.overallScore}/100`);
          }
          console.log('');
        }

        if (options.forecast && result.forecast) {
          console.log('  🔮 Previsão 30 dias:\n');
          console.log(`  Score previsto: ${result.forecast.forecast}/100`);
          console.log(`  Confiança: ${result.forecast.confidence}`);
          console.log(`  Tendência: ${result.forecast.trend}`);
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

        console.log(`\n${'='.repeat(56)}`);
        console.log('  ⚙️  IDEIA — Quality Gates Disponíveis');
        console.log(`${'='.repeat(56)}\n`);

        if (checkpoints.length === 0) {
          console.log('  Nenhum quality gate definido.\n');
          return;
        }

        for (const cp of checkpoints) {
          console.log(`  • ${cp}`);
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
