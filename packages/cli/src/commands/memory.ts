import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { MemoryStore, createMemoryRecord } from '@ideia/memory-store';
import { buildMemoryIndex } from '../memory/memory-index';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const store = new MemoryStore();

export function memoryCommand(): Command {
  const cmd = new Command('memory')
    .description('Memória histórica operacional — Fase 26');

  cmd
    .command('list')
    .description('Lista registros de memória')
    .option('--category <cat>', 'Filtrar por categoria')
    .option('--severity <sev>', 'Filtrar por severidade')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        let records = store.list();
        if (opts.category) records = store.findByCategory(opts.category);
        if (opts.severity) records = store.findBySeverity(opts.severity);
        const envelope = createEnvelope({
          ok: true, command: 'memory list', version: getCliVersion(),
          data: { count: records.length, records },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Memória Histórica');
        printLine(`  Total: ${records.length}`);
        for (const r of records.slice(-10)) {
          const icon = r.severity === 'critical' ? '❌' : r.severity === 'high' ? '⚠️' : '📝';
          printLine(`  ${icon} [${r.category}] ${r.summary.substring(0, 60)}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao listar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('query')
    .description('Consulta memória por texto')
    .argument('<query>', 'Texto para buscar')
    .option('--json', 'Saída em JSON')
    .action((query: string, opts) => {
      try {
        const results = store.search(query);
        const envelope = createEnvelope({
          ok: true, command: 'memory query', version: getCliVersion(),
          data: { query, count: results.length, results },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Consulta: ' + query);
        printLine(`  Resultados: ${results.length}`);
        for (const r of results.slice(-5)) {
          printLine(`  📌 ${r.summary.substring(0, 60)}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na consulta: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('export')
    .description('Exporta índice de memória')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const index = buildMemoryIndex(store.list());
        const envelope = createEnvelope({
          ok: true, command: 'memory export', version: getCliVersion(), data: { index },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Índice de Memória');
        for (const [tag, count] of Object.entries(index).sort((a, b) => b[1] - a[1]).slice(10)) {
          printLine(`  ${tag}: ${count}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na exportação: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
