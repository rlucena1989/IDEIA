import { Command } from 'commander';
import { KnowledgeBase } from '../knowledge/knowledge-base';
import { createKnowledgeEntry } from '../knowledge/knowledge-types';
import { buildRunbook, buildRunbookSections } from '../knowledge/runbook-manager';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine } from '../utils/output';
import { getCliVersion } from '../utils/version';

const knowledgeBase = new KnowledgeBase();

export function runbookCommand(): Command {
  const cmd = new Command('runbook')
    .description('Gestão de runbooks operacionais — Fase 29');

  cmd
    .command('build')
    .description('Constrói runbook a partir do conhecimento ativo')
    .option('--seed', 'Popula entradas de exemplo')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        if (opts.seed) {
          knowledgeBase.upsert(createKnowledgeEntry({ category: 'runbook', title: 'Recuperação de falha', content: 'Passo 1: Diagnosticar. Passo 2: Aplicar correção. Passo 3: Verificar.', tags: ['recovery', 'runbook'], status: 'active' }));
          knowledgeBase.upsert(createKnowledgeEntry({ category: 'guide', title: 'Guia de manutenção', content: 'Realizar manutenção semanal no módulo X.', tags: ['maintenance', 'guide'], status: 'active' }));
          knowledgeBase.upsert(createKnowledgeEntry({ category: 'faq', title: 'Como reiniciar o agente?', content: 'Use ai-devkit agent restart.', tags: ['faq', 'agent'], status: 'active' }));
        }
        const entries = knowledgeBase.list();
        const runbook = buildRunbook(entries);

        const envelope = createEnvelope({
          ok: true, command: 'runbook build', version: getCliVersion(),
          data: { entryCount: entries.length, runbook: runbook.substring(0, 1000) },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Runbook');
        printLine(`  ${entries.length} entrada(s) ativa(s)`);
        printLine(runbook);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao construir runbook: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('show')
    .description('Exibe runbook organizado por seções')
    .option('--seed', 'Popula entradas de exemplo')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        if (opts.seed) {
          knowledgeBase.upsert(createKnowledgeEntry({ category: 'runbook', title: 'Recuperação de falha', content: 'Passo 1: Diagnosticar. Passo 2: Aplicar correção.', tags: ['recovery'], status: 'active' }));
          knowledgeBase.upsert(createKnowledgeEntry({ category: 'guide', title: 'Manutenção semanal', content: 'Executar ai-devkit maintenance run.', tags: ['maintenance'], status: 'active' }));
        }
        const entries = knowledgeBase.list();
        const sections = buildRunbookSections(entries);

        const envelope = createEnvelope({
          ok: true, command: 'runbook show', version: getCliVersion(), data: { sections },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Runbook por Seções');
        for (const [cat, items] of Object.entries(sections)) {
          printLine(`  [${cat.toUpperCase()}]`);
          for (const item of items) {
            printLine(`    → ${item}`);
          }
        }
        if (Object.keys(sections).length === 0) printLine('  Nenhuma entrada ativa.');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao exibir runbook: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('update')
    .description('Atualiza ou adiciona entrada no runbook')
    .argument('<title>', 'Título da entrada')
    .argument('<content>', 'Conteúdo')
    .option('--category <c>', 'Categoria', 'runbook')
    .option('--tags <t>', 'Tags separadas por vírgula', '')
    .option('--json', 'Saída em JSON')
    .action((title: string, content: string, opts) => {
      try {
        const entry = createKnowledgeEntry({
          category: opts.category,
          title,
          content,
          tags: opts.tags ? opts.tags.split(',').map((s: string) => s.trim()) : [],
          status: 'active',
        });
        knowledgeBase.upsert(entry);

        const envelope = createEnvelope({
          ok: true, command: 'runbook update', version: getCliVersion(), data: { entry },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Runbook Atualizado');
        printLine(`  ${entry.title} [${entry.category}]`);
        printLine(`  ${entry.content.substring(0, 80)}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao atualizar runbook: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
