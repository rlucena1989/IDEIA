import { Command } from 'commander';
import * as crypto from 'node:crypto';
import { buildScenario } from '../simulation/scenario-builder';
import { runSimulation } from '../simulation/simulation-engine';
import { validatePrediction } from '../simulation/simulation-validator';
import { compareSimulations } from '../simulation/simulation-comparator';
import { predictRisk } from '../prediction/predictor-engine';
import { assessRisk } from '../prediction/risk-model';
import { estimateImpact } from '../prediction/impact-estimator';
import { buildPredictionReport } from '../prediction/prediction-report';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function predictCommand(): Command {
  const cmd = new Command('predict')
    .description('Validação preditiva e ensaios — Fase 19');

  cmd
    .command('run')
    .description('Executa predição para um cenário')
    .argument('<name>', 'Nome do cenário')
    .option('--inputs <json>', 'Inputs', '{}')
    .option('--constraints <json>', 'Constraints', '[]')
    .option('--json', 'Saída em JSON')
    .action((name: string, opts) => {
      try {
        const scenario = buildScenario(crypto.randomUUID(), name, 'Predição', JSON.parse(opts.inputs), JSON.parse(opts.constraints), 'Predito');
        const result = runSimulation(scenario);
        const envelope = createEnvelope({
          ok: result.ok, command: 'predict run', version: getCliVersion(),
          data: { name, result },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Predição');
        printLine(`  Cenário: ${name}`);
        printLine(`  Risco previsto: ${result.riskLevel}`);
        printLine(`  Viável: ${result.ok ? 'Sim' : 'Não'}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na predição: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('validate')
    .description('Valida uma predição')
    .argument('<name>', 'Nome do cenário')
    .option('--inputs <json>', 'Inputs', '{}')
    .option('--constraints <json>', 'Constraints', '["critical"]')
    .option('--json', 'Saída em JSON')
    .action((name: string, opts) => {
      try {
        const scenario = buildScenario(crypto.randomUUID(), name, 'Validação preditiva', JSON.parse(opts.inputs), JSON.parse(opts.constraints), 'Validado');
        const result = runSimulation(scenario);
        const validation = validatePrediction(result);
        const envelope = createEnvelope({
          ok: validation.valid, command: 'predict validate', version: getCliVersion(), data: validation,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Validação Preditiva');
        printResult('Resultado', validation.valid);
        for (const r of validation.reasons) printLine(`  ⚠ ${r}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na validação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Gera relatório preditivo consolidado')
    .option('--target <t>', 'Alvo da predição', 'system')
    .option('--history <n>', 'Tamanho do histórico', '5')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const historySize = parseInt(opts.history, 10);
        const prediction = predictRisk({
          target: opts.target,
          historyScore: Array(historySize).fill(0).map(() => Math.floor(Math.random() * 10)),
          driftScore: [Math.floor(Math.random() * 8)],
          alertCount: [Math.floor(Math.random() * 5)],
          failureCount: [Math.floor(Math.random() * 4)],
        });
        const risk = assessRisk(opts.target, Math.floor(Math.random() * 9), Math.floor(Math.random() * 9));
        const impact = estimateImpact(opts.target, 'availability', Math.floor(Math.random() * 10));
        const report = buildPredictionReport({ predictions: [prediction], risks: [risk], impacts: [impact] });

        const envelope = createEnvelope({
          ok: true, command: 'predict report', version: getCliVersion(), data: report,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório Preditivo');
        for (const note of report.notes) printLine(`  ${note}`);
        printLine(`  Risco: ${prediction.riskLevel} (${(prediction.confidence * 100).toFixed(0)}%)`);
        printLine(`  Impacto: ${impact.severity} em ${impact.impactArea}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no relatório: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('compare')
    .description('Compara predições de múltiplos cenários')
    .argument('<scenarios>', 'Cenários em JSON array string')
    .option('--json', 'Saída em JSON')
    .action((scenariosStr: string, opts) => {
      try {
        const scenarioList = JSON.parse(scenariosStr);
        const results = scenarioList.map((s: { name: string; constraints?: string[] }) => {
          const scenario = buildScenario(crypto.randomUUID(), s.name, 'Comparação preditiva', {}, s.constraints ?? [], 'Comparado');
          return runSimulation(scenario);
        });
        const comparison = compareSimulations(results);
        const envelope = createEnvelope({
          ok: true, command: 'predict compare', version: getCliVersion(), data: comparison,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Comparação Preditiva');
        printLine(`  Melhor cenário: ${comparison.winners[0] || 'Nenhum'}`);
        for (const diff of comparison.differences) printLine(`  → ${diff}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na comparação: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
