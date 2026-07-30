import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockIngestDirectory = jest.fn<any>();
const mockSearch = jest.fn<any>();
const mockBuildRagPrompt = jest.fn<any>();
const mockGetRagStats = jest.fn<any>();
const mockClearVectors = jest.fn<any>();
const mockRebuildVectorIndex = jest.fn<any>();
const mockLoadVectors = jest.fn<any>();

jest.mock('../../local-ai/rag', () => ({
  ingestDirectory: (...args: unknown[]) => mockIngestDirectory(...args),
  search: (...args: unknown[]) => mockSearch(...args),
  buildRagPrompt: (...args: unknown[]) => mockBuildRagPrompt(...args),
  getRagStats: (...args: unknown[]) => mockGetRagStats(...args),
}));
jest.mock('../../local-ai/vector-store', () => ({
  clearVectors: (...args: unknown[]) => mockClearVectors(...args),
  rebuildVectorIndex: (...args: unknown[]) => mockRebuildVectorIndex(...args),
  loadVectors: (...args: unknown[]) => mockLoadVectors(...args),
}));

function getCmd() {
  const { ragCommand } = require('../rag');
  return ragCommand();
}

describe('ragCommand', () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockGetRagStats.mockReturnValue({
      dense: { total: 100, dimensions: 768, model: 'nomic-embed-text' },
      index: { built: true, numClusters: 10, totalDocs: 100, avgDocsPerCluster: 10, builtAt: '2024-01-01' },
      tfidf: { total: 200, fileCount: 15 },
    });
    mockSearch.mockResolvedValue([]);
    mockIngestDirectory.mockResolvedValue({ filesProcessed: 5, chunksIndexed: 50, errors: 0 });
    mockLoadVectors.mockReturnValue([{ id: 'v1' }, { id: 'v2' }]);
  });

  afterEach(() => { logSpy.mockRestore(); });

  it('returns command named rag', () => { expect(getCmd().name()).toBe('rag'); });

  it('has all subcommands', () => {
    const names = getCmd().commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('ingest');
    expect(names).toContain('search');
    expect(names).toContain('query');
    expect(names).toContain('status');
    expect(names).toContain('index');
    expect(names).toContain('clear');
  });

  it('ingest subcommand calls ingestDirectory with options', async () => {
    const cmd = getCmd();
    const ingest = cmd.commands.find((c: { name: () => string }) => c.name() === 'ingest')!;
    ingest.setOptionValue('dir', ['.ai']);
    ingest.setOptionValue('chunkSize', '1000');
    ingest.setOptionValue('chunkOverlap', '200');
    ingest.setOptionValue('model', 'test-model');
    await ingest._actionHandler([]);
    expect(mockIngestDirectory).toHaveBeenCalledWith(expect.any(String), ['.ai'], { chunkSize: 1000, chunkOverlap: 200, embeddingModel: 'test-model' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Ingest complete'));
  });

  it('search subcommand returns no results message when empty', async () => {
    const cmd = getCmd();
    mockSearch.mockResolvedValue([]);
    const search = cmd.commands.find((c: { name: () => string }) => c.name() === 'search')!;
    search.setOptionValue('max', '10');
    search.setOptionValue('minScore', '0.0');
    search.setOptionValue('model', 'nomic-embed-text');
    await search._actionHandler(['query text']);
    expect(logSpy).toHaveBeenCalledWith('No results found.');
  });

  it('search subcommand prints results when found', async () => {
    const cmd = getCmd();
    mockSearch.mockResolvedValue([{ score: 0.95, doc: { path: '/doc1.md', chunkIndex: 0, totalChunks: 3 } }, { score: 0.80, doc: { path: '/doc2.md' } }]);
    const search = cmd.commands.find((c: { name: () => string }) => c.name() === 'search')!;
    search.setOptionValue('max', '10');
    search.setOptionValue('minScore', '0.0');
    search.setOptionValue('model', 'nomic-embed-text');
    await search._actionHandler(['query']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('95.0%'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('80.0%'));
  });

  it('query subcommand prints no context message when empty', async () => {
    const cmd = getCmd();
    mockBuildRagPrompt.mockReturnValue('prompt');
    const query = cmd.commands.find((c: { name: () => string }) => c.name() === 'query')!;
    query.setOptionValue('max', '5');
    query.setOptionValue('model', 'nomic-embed-text');
    query.setOptionValue('llm', 'qwen2:0.5b');
    await query._actionHandler(['my question']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No relevant context found'));
  });

  it('query subcommand prints chunks when found', async () => {
    const cmd = getCmd();
    mockSearch.mockResolvedValue([{ score: 0.92, doc: { path: '/doc.md', chunkIndex: 0, totalChunks: 2 } }]);
    mockBuildRagPrompt.mockReturnValue('rag prompt text');
    const query = cmd.commands.find((c: { name: () => string }) => c.name() === 'query')!;
    query.setOptionValue('max', '5');
    query.setOptionValue('model', 'nomic-embed-text');
    query.setOptionValue('llm', 'qwen2:0.5b');
    await query._actionHandler(['question']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('92.0%'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('=== GENERATED PROMPT ==='));
  });

  it('status subcommand shows stats when index is built', () => {
    const cmd = getCmd();
    const status = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    status._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Documents: 100'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Built: yes'));
  });

  it('status subcommand shows fallback when index not built', () => {
    const cmd = getCmd();
    mockGetRagStats.mockReturnValue({ dense: { total: 0, dimensions: 768, model: 'nomic-embed-text' }, index: { built: false, numClusters: 0, totalDocs: 0, avgDocsPerCluster: 0, builtAt: '' }, tfidf: { total: 0, fileCount: 0 } });
    const status = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    status._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('linear scan fallback'));
  });

  it('index rebuild subcommand shows message when no vectors', () => {
    const cmd = getCmd();
    mockLoadVectors.mockReturnValue([]);
    const index = cmd.commands.find((c: { name: () => string }) => c.name() === 'index')!;
    const rebuild = index.commands.find((c: { name: () => string }) => c.name() === 'rebuild')!;
    rebuild._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No vectors found'));
  });

  it('index rebuild subcommand calls rebuildVectorIndex when vectors exist', () => {
    const cmd = getCmd();
    const index = cmd.commands.find((c: { name: () => string }) => c.name() === 'index')!;
    const rebuild = index.commands.find((c: { name: () => string }) => c.name() === 'rebuild')!;
    rebuild._actionHandler([]);
    expect(mockRebuildVectorIndex).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('IVF index rebuilt'));
  });

  it('index status subcommand shows built stats', () => {
    const cmd = getCmd();
    const index = cmd.commands.find((c: { name: () => string }) => c.name() === 'index')!;
    const istatus = index.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    istatus._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Built:        yes'));
  });

  it('index status subcommand shows not built message', () => {
    const cmd = getCmd();
    mockGetRagStats.mockReturnValue({ dense: { total: 0, dimensions: 768, model: 'nomic-embed-text' }, index: { built: false, numClusters: 0, totalDocs: 0, avgDocsPerCluster: 0, builtAt: '' }, tfidf: { total: 0, fileCount: 0 } });
    const index = cmd.commands.find((c: { name: () => string }) => c.name() === 'index')!;
    const istatus = index.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    istatus._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Built: no'));
  });

  it('clear subcommand calls clearVectors', () => {
    const cmd = getCmd();
    const clear = cmd.commands.find((c: { name: () => string }) => c.name() === 'clear')!;
    clear._actionHandler([]);
    expect(mockClearVectors).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Vector store cleared.'));
  });

  it('ingest subcommand uses default options when none provided', async () => {
    const cmd = getCmd();
    const ingest = cmd.commands.find((c: { name: () => string }) => c.name() === 'ingest')!;
    await ingest._actionHandler([]);
    expect(mockIngestDirectory).toHaveBeenCalledWith(expect.any(String), ['.ai', 'packages/cli/src'], { chunkSize: 1000, chunkOverlap: 200, embeddingModel: 'nomic-embed-text' });
  });

  it('search subcommand with results prints chunk info', async () => {
    const cmd = getCmd();
    mockSearch.mockResolvedValue([{ score: 0.85, doc: { path: '/test.md', chunkIndex: 2, totalChunks: 5 } }]);
    const search = cmd.commands.find((c: { name: () => string }) => c.name() === 'search')!;
    search.setOptionValue('max', '5');
    search.setOptionValue('minScore', '0.3');
    search.setOptionValue('model', 'test');
    await search._actionHandler(['test']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Chunk 3/5'));
  });
});
