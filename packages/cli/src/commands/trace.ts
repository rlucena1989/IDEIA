import { Command } from 'commander';
import { ExplanationRegistry } from '../explanation/explanation-registry';
import { createDecisionTrace } from '../explanation/decision-trace';
import { explainDecision } from '../explanation/explanation-engine';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine } from '../utils/output';
import { getCliVersion } from '../utils/version';

const registry = new ExplanationRegistry();

export function traceCommand(): Command {
  const cmd = new Command('trace')
    .description('Consulta e gerenciamento de trilhas — Fase 27');

  cmd
    .command('list')
    .description('Lista trilhas registradas')
    .option('--type <t>', 'Filtrar por tipo')
    .option('--outcome <o>', 'Filtrar por resultado')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        let traces = registry.listTraces();
        if (opts.type) traces = registry.findTraceByType(opts.type);
        if (opts.outcome) traces = registry.findTraceByOutcome(opts.outcome);

        const envelope = createEnvelope({
          ok: true, command: 'trace list', version: getCliVersion(),
          data: { count: traces.length, traces },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Trilhas de Decisão');
        printLine(`  Total: ${traces.length}`);
        for (const t of traces.slice(-10)) {
          printLine(`  ${t.traceId} [${t.decisionType}] → ${t.outcome}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao listar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('show')
    .description('Mostra detalhes de uma trilha')
    .argument('<trace-id>', 'ID da trilha')
    .option('--json', 'Saída em JSON')
    .action((traceId: string, opts) => {
      try {
        const traces = registry.listTraces().filter(t => t.traceId === traceId);
        if (traces.length === 0) { console.error(`Trilha não encontrada: ${traceId}`); process.exit(1); }

        const trace = traces[0];
        const explanation = explainDecision(trace);

        const envelope = createEnvelope({
          ok: true, command: 'trace show', version: getCliVersion(),
          data: { trace, explanation },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader(`Trilha: ${trace.traceId}`);
        printLine(`  Tipo: ${trace.decisionType}`);
        printLine(`  Contexto: ${trace.context}`);
        printLine(`  Sinais: ${trace.signals.join(', ') || '(nenhum)'}`);
        printLine(`  Política: ${trace.policyApplied}`);
        printLine(`  Resultado: ${trace.outcome}`);
        printLine(`  Explicação: ${explanation.summary}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao mostrar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('search')
    .description('Busca trilhas por texto')
    .argument('<query>', 'Texto para buscar')
    .option('--json', 'Saída em JSON')
    .action((query: string, opts) => {
      try {
        const results = registry.searchTraces(query);

        const envelope = createEnvelope({
          ok: true, command: 'trace search', version: getCliVersion(),
          data: { query, count: results.length, results },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader(`Busca: ${query}`);
        printLine(`  Resultados: ${results.length}`);
        for (const r of results.slice(-5)) {
          printLine(`  ${r.traceId} [${r.decisionType}] → ${r.outcome}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na busca: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
