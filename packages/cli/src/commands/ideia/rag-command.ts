import { Command } from 'commander';
import path from 'node:path';
import { getIO } from '../../io';
import { RagEngine } from '@ideia/rag-engine';
import { success, failure, CliCommandResult } from '../../types/cli-result';

import { createLogger } from '@ideia/logger';

const log = createLogger('cli:commands:ideia:rag-command');

function findDocsDir(root: string): string {
  const candidates = [
    path.join(root, 'IDEIA', 'docs', 'ESTUDOS'),
    path.join(root, 'docs', 'ESTUDOS'),
    path.join(root, 'docs'),
    path.join(root, '.ai'),
  ];
  for (const dir of candidates) {
    if (getIO().fs.exists(dir)) return dir;
  }
  return path.join(root, 'docs');
}

function findSourceDir(root: string): string {
  const candidates = [path.join(root, 'IDEIA', 'packages'), path.join(root, 'packages'), path.join(root, 'src')];
  for (const dir of candidates) {
    if (getIO().fs.exists(dir)) return dir;
  }
  return path.join(root, 'packages');
}

export function ideiaRagCommand(): Command {
  const cmd = new Command('rag').description('RAG Engine — index and query project documents');

  cmd
    .command('query')
    .description('Query indexed documents with hybrid search')
    .argument('<text>', 'Search query text')
    .option('--max <n>', 'Max results', '5')
    .option('--min-score <n>', 'Minimum relevance score', '0.1')
    .option('--source <source>', 'Filter by source (study|source|test|config|other)')
    .option('--category <category>', 'Filter by category (architecture|implementation|ux|security|performance)')
    .option('--json', 'Output as JSON')
    .action(async (text, options): Promise<CliCommandResult> => {
      try {
        const engine = new RagEngine();
        const root = process.cwd();
        const docsDir = findDocsDir(root);
        const srcDir = findSourceDir(root);

        if (getIO().fs.exists(docsDir)) {
          await engine.indexDocs(docsDir, srcDir);
        }

        const results = await engine.query(text, {
          maxResults: parseInt(options.max, 10),
          minScore: parseFloat(options.minScore),
          ...(options.source ? { source: [options.source] as Array<'study' | 'source' | 'test' | 'config' | 'other'> } : {}),
          ...(options.category
            ? {
                category: [options.category] as Array<
                  | 'architecture'
                  | 'implementation'
                  | 'ux'
                  | 'security'
                  | 'performance'
                  | 'integration'
                  | 'testing'
                  | 'deployment'
                  | 'governance'
                  | 'general'
                >,
              }
            : {}),
        });

        if (options.json) {
          log.info(JSON.stringify({ query: text, results }, null, 2));
          return success('Query results', { query: text, results });
        }

        if (results.length === 0) {
          log.info('No results found.');
          return success('No results found', { query: text, results });
        }

        log.info(`\nResults for: "${text}"\n`);
        for (const r of results) {
          const pct = (r.score * 100).toFixed(1);
          log.info(`  [${pct}%] ${r.citation.fileName}`);
          log.info(`        ${r.citation.filePath}`);
          log.info(`        Chunk ${r.chunk.index + 1}/${r.chunk.totalChunks}`);
          log.info(`        Source: ${r.citation.source} | Category: ${r.citation.category}`);
          log.info(`        ${r.citation.snippet.slice(0, 120)}...`);
          log.info('');
        }
        return success('Query results', { query: text, results });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return failure(`Error: ${message}`);
      }
    });

  cmd
    .command('index')
    .description('Re-index all project documents')
    .option('--docs-dir <dir>', 'Documents directory')
    .option('--src-dir <dir>', 'Source code directory')
    .option('--chunk-size <n>', 'Chunk size in chars', '1000')
    .option('--chunk-overlap <n>', 'Chunk overlap in chars', '200')
    .option('--json', 'Output as JSON')
    .action(async (options): Promise<CliCommandResult> => {
      try {
        const root = process.cwd();
        const docsDir = options.docsDir || findDocsDir(root);
        const srcDir = options.srcDir || findSourceDir(root);

        const engine = new RagEngine(undefined, {
          chunkSize: parseInt(options.chunkSize, 10),
          chunkOverlap: parseInt(options.chunkOverlap, 10),
        });

        const result = await engine.indexDocs(docsDir, srcDir);

        const data = { documents: result.documents, chunks: result.chunks, docsDir, srcDir };

        if (options.json) {
          log.info(JSON.stringify({ status: 'ok', ...data }, null, 2));
          return success('Indexing complete', data);
        }

        log.info(`\nIndexing complete:`);
        log.info(`  Documents: ${result.documents}`);
        log.info(`  Chunks:    ${result.chunks}`);
        log.info(`  Docs dir:  ${docsDir}`);
        log.info(`  Src dir:   ${srcDir}`);
        log.info(`  Status:    ${engine.stats.indexBuiltAt ? 'built' : 'empty'}`);
        return success('Indexing complete', data);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return failure(`Error: ${message}`);
      }
    });

  cmd
    .command('status')
    .description('Show RAG engine statistics')
    .option('--json', 'Output as JSON')
    .action((options): CliCommandResult => {
      try {
        const engine = new RagEngine();
        const stats = engine.stats;

        if (options.json) {
          log.info(JSON.stringify(stats, null, 2));
          return success('RAG engine status', stats);
        }

        log.info('\nRAG Engine Status:\n');
        log.info(`  Documents:      ${stats.totalDocuments}`);
        log.info(`  Chunks indexed: ${stats.totalChunks}`);
        log.info(`  Index built:    ${stats.indexBuiltAt || 'not built'}`);
        if (stats.indexedPaths.length > 0) {
          log.info(`  Indexed paths:  ${stats.indexedPaths.join(', ')}`);
        }
        return success('RAG engine status', stats);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return failure(`Error: ${message}`);
      }
    });

  return cmd;
}
