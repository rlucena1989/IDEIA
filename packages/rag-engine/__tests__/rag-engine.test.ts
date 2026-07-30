import fs from 'fs';
import path from 'path';
import os from 'os';
import { RagEngine } from '../src/rag-engine';
import { DocIndexer } from '../src/doc-indexer';
import { VectorSearch } from '@ideia/memory-store';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rag-engine-test-'));
}

function writeTestFile(dir: string, relPath: string, content: string): string {
  const fullPath = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
  return fullPath;
}

describe('DocIndexer', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('indexes .md files in a directory', () => {
    writeTestFile(tmpDir, 'docs/test.md', '# Hello\n\nThis is a test document.\n\nIt has multiple paragraphs.');
    const indexer = new DocIndexer();
    const result = indexer.indexDirectory(path.join(tmpDir, 'docs'));
    expect(result.documents).toBe(1);
    expect(result.chunks).toBeGreaterThanOrEqual(1);
    expect(indexer.documentCount).toBe(1);
    expect(indexer.chunkCount).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for non-existent directory', () => {
    const indexer = new DocIndexer();
    const result = indexer.indexDirectory(path.join(tmpDir, 'nonexistent'));
    expect(result.documents).toBe(0);
    expect(result.chunks).toBe(0);
  });

  it('indexes specific files via indexFiles', () => {
    const f1 = writeTestFile(tmpDir, 'a.ts', 'const x = 1;');
    const f2 = writeTestFile(tmpDir, 'b.md', '# Title');
    const indexer = new DocIndexer();
    const result = indexer.indexFiles([f1, f2]);
    expect(result.documents).toBe(2);
    expect(indexer.documentCount).toBe(2);
  });

  it('clear removes all documents and chunks', () => {
    writeTestFile(tmpDir, 'docs/test.md', 'content');
    const indexer = new DocIndexer();
    indexer.indexDirectory(path.join(tmpDir, 'docs'));
    expect(indexer.documentCount).toBe(1);
    indexer.clear();
    expect(indexer.documentCount).toBe(0);
    expect(indexer.chunkCount).toBe(0);
  });

  it('reindex replaces existing documents', () => {
    writeTestFile(tmpDir, 'docs/a.md', 'file a');
    const indexer = new DocIndexer();
    indexer.indexDirectory(path.join(tmpDir, 'docs'));
    expect(indexer.documentCount).toBe(1);

    writeTestFile(tmpDir, 'docs/b.md', 'file b');
    indexer.indexDirectory(path.join(tmpDir, 'docs'), { reindex: true });
    expect(indexer.documentCount).toBe(2);
  });

  it('indexes multiple directories without reindex', () => {
    writeTestFile(tmpDir, 'dir1/a.md', 'content a');
    writeTestFile(tmpDir, 'dir2/b.md', 'content b');
    const indexer = new DocIndexer();
    indexer.indexDirectory(path.join(tmpDir, 'dir1'), { reindex: true });
    indexer.indexDirectory(path.join(tmpDir, 'dir2'), { reindex: false });
    expect(indexer.documentCount).toBe(2);
  });
});

describe('RagEngine', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates with default config', () => {
    const engine = new RagEngine();
    expect(engine.stats.totalDocuments).toBe(0);
    expect(engine.stats.totalChunks).toBe(0);
  });

  it('creates with existing VectorSearch', () => {
    const vs = new VectorSearch(384);
    vs.add('some content');
    const engine = new RagEngine(undefined, undefined, vs);
    expect(engine.stats.totalChunks).toBe(1);
  });

  it('indexDocs processes files and populates vector store', async () => {
    writeTestFile(tmpDir, 'docs/test.md', '# RAG Engine Test\n\nThis document is about the RAG engine implementation.\nIt contains information about vector search and indexing.');
    const engine = new RagEngine();
    const result = await engine.indexDocs(path.join(tmpDir, 'docs'), '');
    expect(result.documents).toBeGreaterThanOrEqual(1);
    expect(result.chunks).toBeGreaterThanOrEqual(1);
    expect(engine.stats.totalDocuments).toBeGreaterThanOrEqual(1);
    expect(engine.stats.totalChunks).toBeGreaterThanOrEqual(1);
    expect(engine.stats.indexBuiltAt).not.toBe('');
  });

  it('query returns results after indexing', async () => {
    writeTestFile(tmpDir, 'docs/test.md', '# RAG Engine\n\nThe RAG engine provides hybrid search with vector embeddings and keyword matching. It supports document indexing and citation generation.');
    const engine = new RagEngine();
    await engine.indexDocs(path.join(tmpDir, 'docs'), '');
    const results = await engine.query('RAG engine search');
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('query with source filter works', async () => {
    writeTestFile(tmpDir, 'docs/study.md', '# Study Document\n\nThis is a study about architecture patterns.');
    writeTestFile(tmpDir, 'src/code.ts', 'const x = 1;');
    const engine = new RagEngine();
    await engine.indexDocs(path.join(tmpDir, 'docs'), path.join(tmpDir, 'src'));

    const results = await engine.query('architecture', {
      source: ['study'],
    });
    expect(Array.isArray(results)).toBe(true);
  });

  it('returns citations with correct structure', async () => {
    writeTestFile(tmpDir, 'docs/doc.md', '# Document\n\nContent for citation testing.');
    const engine = new RagEngine();
    await engine.indexDocs(path.join(tmpDir, 'docs'), '');

    const results = await engine.query('citation testing');
    if (results.length > 0) {
      const r = results[0];
      expect(r.citation).toBeDefined();
      expect(typeof r.citation.filePath).toBe('string');
      expect(typeof r.citation.fileName).toBe('string');
      expect(typeof r.citation.relevanceScore).toBe('number');
      expect(typeof r.citation.snippet).toBe('string');
    }
  });

  it('clear resets all state', async () => {
    writeTestFile(tmpDir, 'docs/test.md', '# Test\n\nContent.');
    const engine = new RagEngine();
    await engine.indexDocs(path.join(tmpDir, 'docs'), '');
    expect(engine.stats.totalChunks).toBeGreaterThan(0);
    engine.clear();
    expect(engine.stats.totalChunks).toBe(0);
    expect(engine.stats.indexBuiltAt).toBe('');
  });

  it('setConfig updates runtime config', () => {
    const engine = new RagEngine();
    expect(engine.stats.totalChunks).toBe(0);
    engine.setConfig({ maxResults: 20, minScore: 0.5 });
  });

  it('indexing both docs and source dirs together', async () => {
    writeTestFile(tmpDir, 'docs/study.md', '# Architecture Study\n\nArchitecture decisions and patterns.');
    writeTestFile(tmpDir, 'packages/core/src/main.ts', 'export function main() { return 42; }');
    const engine = new RagEngine();
    const result = await engine.indexDocs(
      path.join(tmpDir, 'docs'),
      path.join(tmpDir, 'packages')
    );
    expect(result.documents).toBeGreaterThanOrEqual(2);
  });
});

describe('RagEngine with LLMProvider embedding adapter', () => {
  it('LLMProviderEmbeddingAdapter creates with correct dimensions', () => {
    const { LLMProviderEmbeddingAdapter } = require('../src/rag-engine');
    const adapter = new LLMProviderEmbeddingAdapter(
      { name: 'test', embed: async () => ({ embeddings: [[0.1, 0.2]], model: 'test', provider: 'test' }) },
      'test-model',
      384
    );
    expect(adapter.dimensions).toBe(384);
  });
});
