import { Command } from 'commander';
import _path from 'node:path';
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
      console.log('[rag] Ingesting directories:', options.dir.join(', '));
      console.log('[rag] Chunk size:', options.chunkSize, 'overlap:', options.chunkOverlap);
      console.log('[rag] Embedding model:', options.model);

      const result = await ingestDirectory(root, options.dir, {
        chunkSize: parseInt(options.chunkSize, 10),
        chunkOverlap: parseInt(options.chunkOverlap, 10),
        embeddingModel: options.model,
      });

      console.log(`\n[rag] Ingest complete:`);
      console.log(`  Files processed: ${result.filesProcessed}`);
      console.log(`  Chunks indexed:  ${result.chunksIndexed}`);
      console.log(`  Errors:          ${result.errors}`);
      console.log(`  IVF index:       auto-rebuilt`);
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
      console.log(`[rag] Searching: "${query}"\n`);

      const results = await search(root, query, {
        maxResults: parseInt(options.max, 10),
        minScore: parseFloat(options.minScore),
        embeddingModel: options.model,
      });

      if (results.length === 0) {
        console.log('No results found.');
        return;
      }

      for (const r of results) {
        console.log(`[${(r.score * 100).toFixed(1)}%] ${r.doc.path}`);
        if (r.doc.chunkIndex !== undefined) {
          console.log(`      Chunk ${r.doc.chunkIndex + 1}/${r.doc.totalChunks}`);
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
      console.log(`[rag] Question: "${question}"`);
      console.log('[rag] Retrieving context...\n');

      const results = await search(root, question, {
        maxResults: parseInt(options.max, 10),
        embeddingModel: options.model,
      });

      if (results.length === 0) {
        console.log('No relevant context found. Answering without RAG.\n');
      } else {
        console.log(`Found ${results.length} context chunks:\n`);
        for (const r of results) {
          console.log(`  [${(r.score * 100).toFixed(1)}%] ${r.doc.path} (chunk ${(r.doc.chunkIndex || 0) + 1}/${r.doc.totalChunks || 1})`);
        }
        console.log('');
      }

      const prompt = buildRagPrompt(question, results);

      console.log('=== GENERATED PROMPT ===');
      console.log(prompt);
      console.log('========================\n');

      console.log('To answer with Ollama, run:');
      console.log(`  curl http://localhost:11434/api/generate -d '{"model":"${options.llm}","prompt":${JSON.stringify(JSON.stringify(prompt))},"stream":false}'`);
    });

  cmd
    .command('status')
    .description('Show RAG vector store statistics')
    .action(() => {
      const root = process.cwd();
      const stats = getRagStats(root);
      console.log('RAG Vector Store Status:\n');
      console.log('Dense embeddings (neural):');
      console.log(`  Documents: ${stats.dense.total}`);
      console.log(`  Dimensions: ${stats.dense.dimensions}`);
      console.log(`  Model: ${stats.dense.model}`);
      console.log('\nIVF Index (ANN):');
      if (stats.index.built) {
        console.log(`  Built: yes`);
        console.log(`  Clusters: ${stats.index.numClusters}`);
        console.log(`  Total docs indexed: ${stats.index.totalDocs}`);
        console.log(`  Avg docs/cluster: ${stats.index.avgDocsPerCluster}`);
        console.log(`  Built at: ${stats.index.builtAt}`);
      } else {
        console.log(`  Built: no (linear scan fallback)`);
      }
      console.log('\nTF-IDF index (fallback):');
      console.log(`  Documents: ${stats.tfidf.total}`);
      console.log(`  Files: ${stats.tfidf.fileCount}`);
    });

  const indexCmd = cmd.command('index').description('Manage the IVF vector index');
  indexCmd
    .command('rebuild')
    .description('Rebuild the IVF index from stored vectors')
    .action(() => {
      const root = process.cwd();
      const docs = loadVectors(root);
      if (docs.length === 0) {
        console.log('[rag] No vectors found to index. Run `rag ingest` first.');
        return;
      }
      rebuildVectorIndex(root);
      console.log(`[rag] IVF index rebuilt: ${docs.length} vectors across clusters.`);
    });

  indexCmd
    .command('status')
    .description('Show IVF index statistics')
    .action(() => {
      const root = process.cwd();
      const stats = getRagStats(root).index;
      console.log('IVF Index Status:\n');
      if (stats.built) {
        console.log(`  Built:        yes`);
        console.log(`  Clusters:     ${stats.numClusters}`);
        console.log(`  Total docs:   ${stats.totalDocs}`);
        console.log(`  Avg/cluster:  ${stats.avgDocsPerCluster}`);
        console.log(`  Built at:     ${stats.builtAt}`);
      } else {
        console.log(`  Built: no`);
        console.log(`  Run \`rag ingest\` or \`rag index rebuild\` to build.`);
      }
    });

  cmd
    .command('clear')
    .description('Clear the RAG vector store')
    .action(() => {
      const root = process.cwd();
      clearVectors(root);
      console.log('[rag] Vector store cleared.');
    });

  return cmd;
}
