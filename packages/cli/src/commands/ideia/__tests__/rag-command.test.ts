const mockCwd = jest.fn().mockReturnValue('/test/project');
const mockExists = jest.fn();

jest.mock('../../../io', () => ({
  getIO: jest.fn(() => ({ fs: { cwd: mockCwd, exists: mockExists } })),
}));

const mockQuery = jest.fn();
const mockIndexDocs = jest.fn();
const mockStats = { totalDocuments: 0, totalChunks: 0, indexBuiltAt: null, indexedPaths: [] };
jest.mock('@ideia/rag-engine', () => ({
  RagEngine: jest.fn(() => ({
    query: mockQuery, indexDocs: mockIndexDocs, stats: mockStats,
  })),
}));

jest.mock('../../../types/cli-result', () => ({
  success: jest.fn((msg: string, data?: unknown) => ({ ok: true, message: msg, data })),
  failure: jest.fn((msg: string) => ({ ok: false, message: msg })),
  CliCommandResult: {},
}));

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
}));

import { ideiaRagCommand } from '../rag-command';

beforeAll(() => {
  (globalThis as any).root = '/test/project';
});

afterAll(() => {
  delete (globalThis as any).root;
});

function makeAction(cmdName: string, opts: Record<string, unknown> = {}) {
  const cmd = ideiaRagCommand();
  const sub = cmd.commands.find(c => c.name() === cmdName)!;
  (sub as any)._optionValues = opts;
  return (sub as any)._actionHandler;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('rag query action', () => {
  it('queries with options', async () => {
    mockExists.mockReturnValue(false);
    mockQuery.mockResolvedValue([]);
    await makeAction('query', { max: '5', minScore: '0.1' })(['test query']);
    expect(mockQuery).toHaveBeenCalledWith('test query', expect.objectContaining({ maxResults: 5, minScore: 0.1 }));
  });
});

describe('rag index action', () => {
  it('indexes documents', async () => {
    mockExists.mockReturnValue(true);
    mockIndexDocs.mockResolvedValue({ documents: 10, chunks: 100 });
    await makeAction('index')([]);
    expect(mockIndexDocs).toHaveBeenCalled();
  });
});

describe('rag status action', () => {
  it('shows stats', () => {
    makeAction('status')([]);
  });
});
