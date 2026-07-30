import { mirrorCommand } from '../mirror';

jest.mock('../../utils/output', () => ({ printLine: jest.fn(), printResult: jest.fn(), finish: jest.fn() }));

const mockEntries = [
  { seq: 1, modelId: 'gpt-4', provider: 'openai', command: 'generate', status: 'success', latencyMs: 500, promptHash: 'abc123', response: 'Generated code', prompt: 'write code' },
  { seq: 2, modelId: 'claude-3', provider: 'anthropic', command: 'analyze', status: 'success', latencyMs: 300, promptHash: 'def456', response: 'Analysis result', prompt: 'analyze this' },
];

const mockReplayResult = { replay: { status: 'success', latencyMs: 400 }, diff: { similarityScore: 0.95, identical: false } };

const mockFsWrite = jest.fn();
jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({ fs: { write: mockFsWrite, exists: jest.fn(() => true) }, shell: {}, http: {} })),
}));

jest.mock('../../local-ai/mirror/ledger', () => ({
  loadMirrorConfig: jest.fn(() => ({ enabled: true, privacy_mode: false })),
  saveMirrorConfig: jest.fn(),
  queryEntries: jest.fn((_root, opts) => {
    const limit = (opts.limit || 20) as number;
    return mockEntries.slice(0, limit);
  }),
  getEntryBySeq: jest.fn((_root, seq) => {
    return mockEntries.find(e => e.seq === seq) || null;
  }),
  verifyChain: jest.fn(() => ({ valid: true, totalEntries: 10 })),
  getEntryCount: jest.fn(() => 10),
}));

jest.mock('../../local-ai/mirror/replayer', () => ({
  replayEntry: jest.fn(() => Promise.resolve(mockReplayResult)),
  formatReplayResult: jest.fn(() => 'Formatted replay result'),
}));

jest.mock('../../local-ai/mirror/recorder', () => ({ setMirrorRoot: jest.fn() }));

describe('mirror', () => {
  const cmd = mirrorCommand();
  const { printLine, printResult } = require('../../utils/output');
  const ledger = require('../../local-ai/mirror/ledger');
  const replayer = require('../../local-ai/mirror/replayer');

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => { jest.restoreAllMocks(); });

  it('should have record, query, replay, verify, export subcommands', () => {
    expect(cmd.commands.map(c => c.name())).toEqual(expect.arrayContaining(['record', 'query', 'replay', 'verify', 'export']));
  });

  it('record on should enable mirror', async () => {
    await cmd.parseAsync(['node', 'test', 'record', 'on']);
    expect(ledger.saveMirrorConfig).toHaveBeenCalled();
    expect(printResult).toHaveBeenCalledWith('Mirror ativado', true);
  });

  it('record off should disable mirror', async () => {
    await cmd.parseAsync(['node', 'test', 'record', 'off']);
    expect(ledger.saveMirrorConfig).toHaveBeenCalled();
    expect(printResult).toHaveBeenCalledWith('Mirror desativado', true);
  });

  it('record status should show config', async () => {
    await cmd.parseAsync(['node', 'test', 'record', 'status']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('ON'));
  });

  it('query should return entries', async () => {
    await cmd.parseAsync(['node', 'test', 'query']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('gpt-4'));
  });

  it('query with no results should print empty', async () => {
    ledger.queryEntries.mockReturnValueOnce([]);
    await cmd.parseAsync(['node', 'test', 'query', '--limit', '0']);
    expect(printLine).toHaveBeenCalledWith('Nenhum entry encontrado.');
  });

  it('query with filters should pass options', async () => {
    await cmd.parseAsync(['node', 'test', 'query', '--model', 'gpt-4', '--limit', '5', '--offset', '1']);
    expect(ledger.queryEntries).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ modelId: 'gpt-4', limit: 5, offset: 1 }));
  });

  it('replay should re-execute an entry', async () => {
    await cmd.parseAsync(['node', 'test', 'replay', '1']);
    expect(replayer.replayEntry).toHaveBeenCalled();
  });

  it('replay with non-existent seq should error', async () => {
    ledger.getEntryBySeq.mockReturnValueOnce(null);
    await cmd.parseAsync(['node', 'test', 'replay', '999']);
    expect(printResult).toHaveBeenCalledWith('Erro', false, expect.stringContaining('Entry #999 nao encontrado'));
  });

  it('replay with entry without prompt should error', async () => {
    ledger.getEntryBySeq.mockReturnValueOnce({ seq: 3, modelId: 'gpt-4', prompt: null });
    await cmd.parseAsync(['node', 'test', 'replay', '3']);
    expect(printResult).toHaveBeenCalledWith('Erro', false, expect.stringContaining('sem prompt'));
  });

  it('replay with custom model should override', async () => {
    await cmd.parseAsync(['node', 'test', 'replay', '1', '--model', 'claude-3', '--provider', 'anthropic']);
    expect(replayer.replayEntry).toHaveBeenCalledWith(expect.any(Object), expect.any(String), expect.objectContaining({ modelId: 'claude-3', provider: 'anthropic', timeoutMs: 30000 }));
  });

  it('verify should check chain integrity', async () => {
    await cmd.parseAsync(['node', 'test', 'verify']);
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('Ledger valido'), true);
  });

  it('verify with broken chain should report', async () => {
    ledger.verifyChain.mockReturnValueOnce({ valid: false, totalEntries: 10, brokenAt: 5 });
    await cmd.parseAsync(['node', 'test', 'verify']);
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('quebrado'), false);
  });

  it('export should output entries as JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'export']);
    expect(console.log).toHaveBeenCalledWith(expect.any(String));
  });

  it('export with output path should write file', async () => {
    await cmd.parseAsync(['node', 'test', 'export', '--output', '/tmp/export.json']);
    expect(mockFsWrite).toHaveBeenCalled();
  });
});
