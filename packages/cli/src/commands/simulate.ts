import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import * as crypto from 'node:crypto';
import { buildScenario } from '../simulation/scenario-builder';
import { runSimulation } from '../simulation/simulation-engine';
import { compareSimulations } from '../simulation/simulation-comparator';
import { validatePrediction } from '../simulation/simulation-validator';
import { buildSimulationReport } from '../simulation/simulation-report';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function simulateCommand(): Command {
  const cmd = new Command('simulate')
    .description('Simulação e ensaios operacionais — Fase 19');

  cmd
    .command('run')
    .description('Executa simulação de um cenário')
    .argument('<name>', 'Nome do cenário')
    .argument('<description>', 'Descrição')
    .option('--inputs <json>', 'Inputs em JSON', '{}')
    .option('--constraints <json>', 'Constraints em JSON array', '[]')
    .option('--outcome <outcome>', 'Resultado esperado', 'Operação segura')
    .option('--json', 'Saída em JSON')
    .action((name: string, description: string, opts) => {
      try {
        const sid = crypto.randomUUID();
        const inputs = JSON.parse(opts.inputs);
        const constraints = JSON.parse(opts.constraints);
        const scenario = buildScenario(sid, name, description, inputs, constraints, opts.outcome);
        const result = runSimulation(scenario);
        const envelope = createEnvelope({
          ok: result.ok, command: 'simulate run', version: getCliVersion(),
          data: { scenario, result },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Simulação');
        printLine(`  Cenário: ${scenario.name}`);
        printResult('Resultado', result.ok, result.ok ? 'OK' : 'Falhou');
        printLine(`  Risco: ${result.riskLevel}`);
        for (const note of result.notes) printLine(`  → ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na simulação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('compare')
    .description('Compara múltiplas simulações')
    .argument('<scenarios>', 'Cenários em JSON array string')
    .option('--json', 'Saída em JSON')
    .action((scenariosStr: string, opts) => {
      try {
        const scenarios = JSON.parse(scenariosStr);
        const results = scenarios.map((s: { name: string; description: string }) => {
          const scenario = buildScenario(crypto.randomUUID(), s.name, s.description, {}, [], 'Simulado');
          return runSimulation(scenario);
        });
        const comparison = compareSimulations(results);
        const envelope = createEnvelope({
          ok: true, command: 'simulate compare', version: getCliVersion(), data: comparison,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Comparação de Simulações');
        printLine(`  Vencedore(s): ${comparison.winners.join(', ') || 'Nenhum'}`);
        for (const diff of comparison.differences) printLine(`  → ${diff}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na comparação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('validate')
    .description('Valida resultado de simulação')
    .argument('<name>', 'Nome do cenário')
    .option('--inputs <json>', 'Inputs', '{}')
    .option('--constraints <json>', 'Constraints', '[]')
    .option('--json', 'Saída em JSON')
    .action((name: string, opts) => {
      try {
        const scenario = buildScenario(crypto.randomUUID(), name, 'Validação', JSON.parse(opts.inputs), JSON.parse(opts.constraints), 'Validado');
        const result = runSimulation(scenario);
        const validation = validatePrediction(result);
        const envelope = createEnvelope({
          ok: validation.valid, command: 'simulate validate', version: getCliVersion(), data: validation,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Validação Preditiva');
        printResult('Válido', validation.valid);
        for (const r of validation.reasons) printLine(`  ⚠ ${r}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na validação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Relatório completo de simulação')
    .argument('<name>', 'Nome do cenário')
    .option('--inputs <json>', 'Inputs', '{}')
    .option('--constraints <json>', 'Constraints', '[]')
    .option('--json', 'Saída em JSON')
    .action((name: string, opts) => {
      try {
        const scenario = buildScenario(crypto.randomUUID(), name, 'Relatório', JSON.parse(opts.inputs), JSON.parse(opts.constraints), 'Relatado');
        const result = runSimulation(scenario);
        const validation = validatePrediction(result);
        const report = buildSimulationReport({ scenario, result, validation });
        const envelope = createEnvelope({
          ok: report.validation.valid, command: 'simulate report', version: getCliVersion(), data: report,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório de Simulação');
        for (const s of report.summary) printLine(`  ℹ ${s}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no relatório: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
