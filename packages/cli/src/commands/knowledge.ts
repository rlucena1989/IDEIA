import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.knowledge');
import { getCuratedEntries, searchEntries, getEntry, exportEntries } from '../local-ai/knowledge-base';
import { generateMarkdownDocs } from '../knowledge/doc-generator';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine } from '../utils/output';
import { getCliVersion } from '../utils/version';

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function knowledgeQueryAction(topic: string): void {
  const results = searchEntries(topic);
  if (results.length === 0) {
    logger.info('Nenhum resultado para "${topic}".');
    return;
  }
  logger.info('\n=== Knowledge Base: "${topic}" (${results.length} resultados) ===\n');
  for (const entry of results) {
    logger.info('  [${entry.category}] ${entry.id}');
    logger.info('  Title: ${entry.title}');
    logger.info('  Tags: ${entry.tags.join(\', \')}');
    logger.info('  ${entry.summary.slice(0, 200)}');
    console.log('');
  }
}

export function knowledgeShowAction(id: string): void {
  const entry = getEntry(id);
  if (!entry) {
    logger.info('Entrada "${id}" nao encontrada.');
    return;
  }
  logger.info('\n=== ${entry.title} ===');
  logger.info('Category: ${entry.category}');
  logger.info('Tags: ${entry.tags.join(\', \')}');
  logger.info('\nSummary: ${entry.summary}');
  logger.info('\nContent:\n${entry.content}');
  if (entry.principles && entry.principles.length > 0) {
    logger.info('\nPrinciples:');
    entry.principles.forEach(p => logger.info('  - ${p}'));
  }
  if (entry.when_to_use && entry.when_to_use.length > 0) {
    logger.info('\nWhen to use:');
    entry.when_to_use.forEach(w => logger.info('  - ${w}'));
  }
  if (entry.when_not_to_use && entry.when_not_to_use.length > 0) {
    logger.info('\nWhen NOT to use:');
    entry.when_not_to_use.forEach(w => logger.info('  - ${w}'));
  }
  if (entry.references && entry.references.length > 0) {
    logger.info('\nReferences:');
    entry.references.forEach(r => logger.info('  - ${r}'));
  }
}

export function knowledgeListAction(opts: Record<string, unknown>): void {
  let entries = getCuratedEntries();
  const category = opts.category as string | undefined;
  if (category) entries = entries.filter(e => e.category === category);
  const categories = [...new Set(entries.map(e => e.category))];
  logger.info('\n=== Knowledge Base (${entries.length} entradas, ${categories.length} categorias) ===\n');
  for (const cat of categories) {
    const catEntries = entries.filter(e => e.category === cat);
    logger.info('\n  [${cat.toUpperCase()}] (${catEntries.length})');
    for (const e of catEntries) {
      logger.info('    ${e.id} — ${e.title.slice(0, 60)}');
    }
  }
}

export function knowledgeAddAction(id: string): void {
  const cwd = process.cwd();
  exportEntries(cwd, id);
  logger.info('Entradas exportadas para .ai/knowledge/entries/');
}

export function knowledgeStatsAction(): void {
  const entries = getCuratedEntries();
  const categories = [...new Set(entries.map(e => e.category))];
  const totalTags = [...new Set(entries.flatMap(e => e.tags))];
  logger.info('\n=== Knowledge Base Stats ===');
  logger.info('Total entries: ${entries.length}');
  logger.info('Categories: ${categories.length}');
  logger.info('Unique tags: ${totalTags.length}');
  logger.info('\nBy category:');
  for (const cat of categories) {
    logger.info('  ${cat}: ${entries.filter(e => e.category === cat).length}');
  }
}

export function knowledgeExportAction(opts: { json?: boolean }): void {
  try {
    const localEntries = getCuratedEntries();
    const entries = localEntries.map(e => ({
      knowledgeId: `kb-${e.id}`,
      category: 'guide' as const,
      title: e.title,
      content: `${e.summary}\n\n${e.content}`,
      tags: e.tags,
      createdAt: new Date().toISOString(),
      status: 'active' as const,
    }));
    const docs = generateMarkdownDocs(entries);
    const envelope = createEnvelope({
      ok: true, command: 'knowledge export', version: getCliVersion(),
      data: { entryCount: entries.length, markdown: docs.substring(0, 500) },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader('Exportação de Conhecimento');
    printLine(`  ${entries.length} entrada(s) exportadas`);
    printLine(`  Documentação gerada (${docs.length} caracteres)`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro na exportação: ${message}`);
    process.exit(1);
  }
}

export function knowledgeCommand(): Command {
  const cmd = new Command('knowledge')
    .description('Knowledge base of reference architectures, patterns, and best practices');

  cmd.command('query <topic>')
    .description('Search knowledge base by topic')
    .action((topic: string) => knowledgeQueryAction(topic));

  cmd.command('show <id>')
    .description('Show full knowledge entry')
    .action((id: string) => knowledgeShowAction(id));

  cmd.command('list')
    .description('List all available knowledge entries')
    .option('--category <category>', 'Filter by category')
    .action((opts: Record<string, unknown>) => knowledgeListAction(opts));

  cmd.command('add <id>')
    .description('Export curated entries to project (auto-creates YAML files)')
    .action((id: string) => knowledgeAddAction(id));

  cmd.command('stats')
    .description('Show knowledge base statistics')
    .action(() => knowledgeStatsAction());

  cmd
    .command('export')
    .description('Exporta conhecimento como documentação markdown')
    .option('--json', 'Saída em JSON')
    .action((opts: { json?: boolean }) => knowledgeExportAction(opts));

  return cmd;
}
