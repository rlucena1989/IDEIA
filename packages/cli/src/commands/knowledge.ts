import { Command } from 'commander';
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
    console.log(`Nenhum resultado para "${topic}".`);
    return;
  }
  console.log(`\n=== Knowledge Base: "${topic}" (${results.length} resultados) ===\n`);
  for (const entry of results) {
    console.log(`  [${entry.category}] ${entry.id}`);
    console.log(`  Title: ${entry.title}`);
    console.log(`  Tags: ${entry.tags.join(', ')}`);
    console.log(`  ${entry.summary.slice(0, 200)}`);
    console.log('');
  }
}

export function knowledgeShowAction(id: string): void {
  const entry = getEntry(id);
  if (!entry) {
    console.log(`Entrada "${id}" nao encontrada.`);
    return;
  }
  console.log(`\n=== ${entry.title} ===`);
  console.log(`Category: ${entry.category}`);
  console.log(`Tags: ${entry.tags.join(', ')}`);
  console.log(`\nSummary: ${entry.summary}`);
  console.log(`\nContent:\n${entry.content}`);
  if (entry.principles && entry.principles.length > 0) {
    console.log(`\nPrinciples:`);
    entry.principles.forEach(p => console.log(`  - ${p}`));
  }
  if (entry.when_to_use && entry.when_to_use.length > 0) {
    console.log(`\nWhen to use:`);
    entry.when_to_use.forEach(w => console.log(`  - ${w}`));
  }
  if (entry.when_not_to_use && entry.when_not_to_use.length > 0) {
    console.log(`\nWhen NOT to use:`);
    entry.when_not_to_use.forEach(w => console.log(`  - ${w}`));
  }
  if (entry.references && entry.references.length > 0) {
    console.log(`\nReferences:`);
    entry.references.forEach(r => console.log(`  - ${r}`));
  }
}

export function knowledgeListAction(opts: Record<string, unknown>): void {
  let entries = getCuratedEntries();
  const category = opts.category as string | undefined;
  if (category) entries = entries.filter(e => e.category === category);
  const categories = [...new Set(entries.map(e => e.category))];
  console.log(`\n=== Knowledge Base (${entries.length} entradas, ${categories.length} categorias) ===\n`);
  for (const cat of categories) {
    const catEntries = entries.filter(e => e.category === cat);
    console.log(`\n  [${cat.toUpperCase()}] (${catEntries.length})`);
    for (const e of catEntries) {
      console.log(`    ${e.id} — ${e.title.slice(0, 60)}`);
    }
  }
}

export function knowledgeAddAction(id: string): void {
  const cwd = process.cwd();
  exportEntries(cwd, id);
  console.log(`Entradas exportadas para .ai/knowledge/entries/`);
}

export function knowledgeStatsAction(): void {
  const entries = getCuratedEntries();
  const categories = [...new Set(entries.map(e => e.category))];
  const totalTags = [...new Set(entries.flatMap(e => e.tags))];
  console.log(`\n=== Knowledge Base Stats ===`);
  console.log(`Total entries: ${entries.length}`);
  console.log(`Categories: ${categories.length}`);
  console.log(`Unique tags: ${totalTags.length}`);
  console.log(`\nBy category:`);
  for (const cat of categories) {
    console.log(`  ${cat}: ${entries.filter(e => e.category === cat).length}`);
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
