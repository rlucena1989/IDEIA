import { Command } from 'commander';
import * as crypto from 'node:crypto';
import { buildScenario } from '../simulation/scenario-builder';
import { SimulationScenario } from '../simulation/simulation-types';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const scenarios: SimulationScenario[] = [];

export function scenarioCommand(): Command {
  const cmd = new Command('scenario')
    .description('Gerenciamento de cenários de simulação — Fase 19');

  cmd
    .command('build')
    .description('Constrói um cenário de simulação')
    .argument('<name>', 'Nome do cenário')
    .argument('<description>', 'Descrição')
    .option('--inputs <json>', 'Inputs em JSON', '{}')
    .option('--constraints <json>', 'Constraints em JSON array', '[]')
    .option('--outcome <outcome>', 'Resultado esperado', 'Operação segura')
    .option('--json', 'Saída em JSON')
    .action((name: string, description: string, opts) => {
      try {
        const scenario = buildScenario(crypto.randomUUID(), name, description, JSON.parse(opts.inputs), JSON.parse(opts.constraints), opts.outcome);
        scenarios.push(scenario);
        const envelope = createEnvelope({
          ok: true, command: 'scenario build', version: getCliVersion(), data: scenario,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Cenário');
        printLine(`  Nome: ${scenario.name}`);
        printLine(`  ID: ${scenario.scenarioId.substring(0, 12)}...`);
        printLine(`  Constraints: ${scenario.constraints.length}`);
        printLine(`  Inputs: ${Object.keys(scenario.inputs).length}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao construir: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('list')
    .description('Lista cenários construídos')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const envelope = createEnvelope({
          ok: true, command: 'scenario list', version: getCliVersion(),
          data: { count: scenarios.length, scenarios },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Cenários');
        printLine(`  Total: ${scenarios.length}`);
        for (const s of scenarios) {
          printLine(`  📋 ${s.name} — ${s.expectedOutcome}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao listar: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
