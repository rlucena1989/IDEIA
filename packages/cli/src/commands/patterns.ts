import { Command } from 'commander';
import { MemoryStore, createMemoryRecord } from '@ideia/memory-store';
import { detectPatterns } from '../memory/pattern-detector';
import { generateRecommendations } from '../memory/learning-engine';
import { summarizeHistory } from '../memory/history-summarizer';
import { buildMemoryReport } from '../memory/memory-report';
import { adaptPolicy } from '../memory/policy-adapter';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const store = new MemoryStore();
store.append(createMemoryRecord({ category: 'failure', source: 'test', summary: 'Falha recorrente em consistência', tags: ['consistency', 'failure'], severity: 'high' }));
store.append(createMemoryRecord({ category: 'failure', source: 'test', summary: 'Outra falha de consistência', tags: ['consistency', 'failure'], severity: 'high' }));
store.append(createMemoryRecord({ category: 'recovery', source: 'test', summary: 'Recuperação automática executada', tags: ['repair', 'success'], severity: 'low' }));

export function patternsCommand(): Command {
  const cmd = new Command('patterns')
    .description('Detecção e relatório de padrões — Fase 26');

  cmd
    .command('detect')
    .description('Detecta padrões recorrentes na memória')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const patterns = detectPatterns(store.list());
        const envelope = createEnvelope({
          ok: true, command: 'patterns detect', version: getCliVersion(),
          data: { count: patterns.length, patterns },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Padrões Detectados');
        for (const p of patterns) {
          printLine(`  🔄 ${p.name} (${p.frequency}x) — confiança: ${(p.confidence * 100).toFixed(0)}%`);
        }
        if (patterns.length === 0) printLine('  Nenhum padrão recorrente.');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na detecção: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Relatório completo de padrões e aprendizado')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const records = store.list();
        const patterns = detectPatterns(records);
        const recommendations = generateRecommendations(patterns);
        const adjustments = patterns.map(p => adaptPolicy(p.name, `Auto-adjust for ${p.name}`, p.confidence));
        const summary = summarizeHistory(records, patterns, recommendations);
        const report = buildMemoryReport({ summary, recentRecords: records.slice(-5), patterns, recommendations, adjustments });
        const envelope = createEnvelope({
          ok: true, command: 'patterns report', version: getCliVersion(), data: report,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório de Padrões');
        for (const note of report.notes) printLine(`  ℹ ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no relatório: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('explain')
    .description('Explica um padrão específico')
    .argument('<pattern-name>', 'Nome do padrão')
    .option('--json', 'Saída em JSON')
    .action((patternName: string, opts) => {
      try {
        const patterns = detectPatterns(store.list()).filter(p => p.name === patternName);
        if (patterns.length === 0) { console.error(`Padrão não encontrado: ${patternName}`); process.exit(1); }
        const p = patterns[0];
        const recs = generateRecommendations([p]);
        const envelope = createEnvelope({
          ok: true, command: 'patterns explain', version: getCliVersion(), data: { pattern: p, recommendations: recs },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader(`Padrão: ${p.name}`);
        printLine(`  Frequência: ${p.frequency} ocorrência(s)`);
        printLine(`  Confiança: ${(p.confidence * 100).toFixed(0)}%`);
        printLine(`  Descrição: ${p.description}`);
        if (recs.length > 0) printLine(`  Recomendação: ${recs[0]!.action}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na explicação: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
