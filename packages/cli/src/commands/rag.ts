import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.rag');
import { Command } from 'commander';
import _path from 'node:path';

const log = createLogger('cli:commands:rag');
import { ingestDirectory, search, buildRagPrompt, getRagStats } from '../local-ai/rag';
import { clearVectors, rebuildVectorIndex, loadVectors } from '../local-ai/vector-store';

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function ragCommand(): Command {
  const cmd = new Command('rag')
    .description('RAG Pipeline — ingest, search, and query project documents');

  cmd
    .command('ingest')
    .description('Ingest project documents into the RAG vector store')
    .option('--dir <dirs...>', 'Directories to ingest (relative to project root)', ['.ai', 'packages/cli/src'])
    .option('--chunk-size <size>', 'Chunk size in chars', '1000')
    .option('--chunk-overlap <overlap>', 'Chunk overlap in chars', '200')
    .option('--model <model>', 'Embedding model', 'nomic-embed-text')
    .action(async (options) => {
      const root = process.cwd();
      log.info('[rag] Ingesting directories: ' + options.dir.join(', '));
      log.info('[rag] Chunk size: ' + options.chunkSize + ', overlap: ' + options.chunkOverlap);
      log.info('[rag] Embedding model: ' + options.model);

      const result = await ingestDirectory(root, options.dir, {
        chunkSize: parseInt(options.chunkSize, 10),
        chunkOverlap: parseInt(options.chunkOverlap, 10),
        embeddingModel: options.model,
      });

      log.info(`[rag] Ingest complete:`);
      logger.info('  Files processed: ${result.filesProcessed}');
      logger.info('  Chunks indexed:  ${result.chunksIndexed}');
      logger.info('  Errors:          ${result.errors}');
      logger.info('  IVF index:       auto-rebuilt');
    });

  cmd
    .command('search')
    .description('Search the RAG vector store')
    .argument('<query>', 'Search query')
    .option('--max <n>', 'Max results', '10')
    .option('--min-score <n>', 'Minimum similarity score', '0.0')
    .option('--model <model>', 'Embedding model', 'nomic-embed-text')
    .action(async (query, options) => {
      const root = process.cwd();
      log.info(`[rag] Searching: "${query}"\n`);

      const results = await search(root, query, {
        maxResults: parseInt(options.max, 10),
        minScore: parseFloat(options.minScore),
        embeddingModel: options.model,
      });

      if (results.length === 0) {
        log.info('No results found.');
        return;
      }

      for (const r of results) {
        logger.info('[${(r.score * 100).toFixed(1)}%] ${r.doc.path}');
        if (r.doc.chunkIndex !== undefined) {
          logger.info('      Chunk ${r.doc.chunkIndex + 1}/${r.doc.totalChunks}');
        }
        console.log('');
      }
    });

  cmd
    .command('query')
    .description('Ask a question with RAG context')
    .argument('<question>', 'Question to answer')
    .option('--max <n>', 'Max context chunks', '5')
    .option('--model <model>', 'Embedding model', 'nomic-embed-text')
    .option('--llm <model>', 'LLM model for answering', 'qwen2:0.5b')
    .action(async (question, options) => {
      const root = process.cwd();
      logger.info('[rag] Question: "${question}"');
      log.info('[rag] Retrieving context...');

      const results = await search(root, question, {
        maxResults: parseInt(options.max, 10),
        embeddingModel: options.model,
      });

      if (results.length === 0) {
        logger.info('No relevant context found. Answering without RAG.\n');
      } else {
        logger.info('Found ${results.length} context chunks:\n');
        for (const r of results) {
          logger.info('  [${(r.score * 100).toFixed(1)}%] ${r.doc.path} (chunk ${(r.doc.chunkIndex || 0) + 1}/${r.doc.totalChunks || 1})');
        }
        console.log('');
      }

      const prompt = buildRagPrompt(question, results);

      logger.info('=== GENERATED PROMPT ===');
      logger.info(prompt);
      logger.info('========================\n');

      logger.info('To answer with Ollama, run:');
      logger.info('  curl http://localhost:11434/api/generate -d \'{"model":"${options.llm}","prompt":${JSON.stringify(JSON.stringify(prompt))},"stream":false}\'');
    });

  cmd
    .command('status')
    .description('Show RAG vector store statistics')
    .action(() => {
      const root = process.cwd();
      const stats = getRagStats(root);
      logger.info('RAG Vector Store Status:\n');
      logger.info('Dense embeddings (neural):');
      logger.info('  Documents: ${stats.dense.total}');
      logger.info('  Dimensions: ${stats.dense.dimensions}');
      logger.info('  Model: ${stats.dense.model}');
      logger.info('\nIVF Index (ANN):');
      if (stats.index.built) {
        logger.info('  Built: yes');
        logger.info('  Clusters: ${stats.index.numClusters}');
        logger.info('  Total docs indexed: ${stats.index.totalDocs}');
        logger.info('  Avg docs/cluster: ${stats.index.avgDocsPerCluster}');
        logger.info('  Built at: ${stats.index.builtAt}');
      } else {
        logger.info('  Built: no (linear scan fallback)');
      }
      logger.info('\nTF-IDF index (fallback):');
      logger.info('  Documents: ${stats.tfidf.total}');
      logger.info('  Files: ${stats.tfidf.fileCount}');
    });

  const indexCmd = cmd.command('index').description('Manage the IVF vector index');
  indexCmd
    .command('rebuild')
    .description('Rebuild the IVF index from stored vectors')
    .action(() => {
      const root = process.cwd();
      const docs = loadVectors(root);
      if (docs.length === 0) {
        log.info('[rag] No vectors found to index. Run `rag ingest` first.');
        return;
      }
      rebuildVectorIndex(root);
      log.info(`[rag] IVF index rebuilt: ${docs.length} vectors across clusters.`);
    });

  indexCmd
    .command('status')
    .description('Show IVF index statistics')
    .action(() => {
      const root = process.cwd();
      const stats = getRagStats(root).index;
      logger.info('IVF Index Status:\n');
      if (stats.built) {
        logger.info('  Built:        yes');
        logger.info('  Clusters:     ${stats.numClusters}');
        logger.info('  Total docs:   ${stats.totalDocs}');
        logger.info('  Avg/cluster:  ${stats.avgDocsPerCluster}');
        logger.info('  Built at:     ${stats.builtAt}');
      } else {
        logger.info('  Built: no');
        console.log(`  Run \`rag ingest\` or \`rag index rebuild\` to build.`);
      }
    });

  cmd
    .command('clear')
    .description('Clear the RAG vector store')
    .action(() => {
      const root = process.cwd();
      clearVectors(root);
      log.info('[rag] Vector store cleared.');
    });

  return cmd;
}
