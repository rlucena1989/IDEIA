import { Command } from 'commander';
import { predictRisk } from '../prediction/predictor-engine';
import { forecastHorizon } from '../prediction/scenario-forecaster';
import { recommendPrevention } from '../prediction/preventive-recommender';
import { createPredictionInput } from '../prediction/prediction-types';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function forecastCommand(): Command {
  const cmd = new Command('forecast')
    .description('Simulação preditiva e projeção — Fase 28');

  cmd
    .command('run')
    .description('Executa previsão de risco para um alvo')
    .argument('<target>', 'Alvo da previsão')
    .option('--history <n>', 'Tamanho do histórico', '5')
    .option('--json', 'Saída em JSON')
    .action((target: string, opts) => {
      try {
        const historySize = parseInt(opts.history, 10);
        const input = createPredictionInput({
          target,
          historyScore: Array(historySize).fill(0).map(() => Math.floor(Math.random() * 10)),
          driftScore: [Math.floor(Math.random() * 8)],
          alertCount: [Math.floor(Math.random() * 5)],
          failureCount: [Math.floor(Math.random() * 3)],
        });
        const prediction = predictRisk(input);
        const prevention = recommendPrevention(prediction);

        const envelope = createEnvelope({
          ok: true, command: 'forecast run', version: getCliVersion(),
          data: { input, prediction, prevention },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Previsão');
        printLine(`  Alvo: ${target}`);
        printLine(`  Risco: ${prediction.riskLevel} (${(prediction.confidence * 100).toFixed(0)}% confiança)`);
        printLine(`  Ações preventivas:`);
        for (const action of prevention) {
          printLine(`    → ${action}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na previsão: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('trend')
    .description('Analisa tendência com base em histórico simulado')
    .argument('<target>', 'Alvo da tendência')
    .option('--samples <n>', 'Pontos históricos', '10')
    .option('--json', 'Saída em JSON')
    .action((target: string, opts) => {
      try {
        const samples = parseInt(opts.samples, 10);
        const points = Array(samples).fill(0).map(() => Math.floor(Math.random() * 10));
        const trend = points.reduce((a, b) => a + b, 0) / points.length;
        const direction = trend > 5 ? 'upward' : trend > 3 ? 'stable' : 'downward';

        const envelope = createEnvelope({
          ok: true, command: 'forecast trend', version: getCliVersion(),
          data: { target, samples, average: trend, direction, points },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Tendência');
        printLine(`  Alvo: ${target}`);
        printLine(`  Média: ${trend.toFixed(1)} (${samples} amostras)`);
        printLine(`  Direção: ${direction}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na tendência: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('horizon')
    .description('Estima horizonte de confiança da previsão')
    .option('--history <n>', 'Tamanho do histórico', '5')
    .option('--strength <n>', 'Força da tendência', '3')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const historySize = parseInt(opts.history, 10);
        const trendStrength = parseInt(opts.strength, 10);
        const horizons = forecastHorizon(historySize, trendStrength);

        const envelope = createEnvelope({
          ok: true, command: 'forecast horizon', version: getCliVersion(), data: { horizons },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Horizontes de Previsão');
        for (const h of horizons) {
          printLine(`  ${h.label.toUpperCase()}: ${(h.confidence * 100).toFixed(0)}% confiança, ${(h.uncertaintyRate * 100).toFixed(0)}% incerteza`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no horizonte: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
