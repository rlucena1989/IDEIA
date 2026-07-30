const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockMkdirSync = jest.fn();

jest.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
}));

const mockStoreList = jest.fn();
const mockStoreSearch = jest.fn();
jest.mock('@ideia/memory-store', () => ({
  MemoryStore: jest.fn(() => ({
    list: mockStoreList, search: mockStoreSearch,
  })),
}));

jest.mock('../../../hardening/output-contract', () => ({
  createEnvelope: jest.fn((d: unknown) => d),
}));

jest.mock('../../../utils/version', () => ({
  getCliVersion: jest.fn(() => '1.0.0'),
}));

import { ideiaMemoryCommand } from '../memory-command';

function makeAction(cmdName: string, opts: Record<string, unknown> = {}) {
  const cmd = ideiaMemoryCommand();
  const sub = cmd.commands.find(c => c.name() === cmdName)!;
  (sub as any)._optionValues = opts;
  return (sub as any)._actionHandler;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('memory show action', () => {
  it('shows empty when no records', () => {
    mockExistsSync.mockReturnValue(false);
    mockStoreList.mockReturnValue([]);
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('show')([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Nenhum registro'));
    spyLog.mockRestore();
  });

  it('filters by type', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify([
      { id: '1', type: 'decision', title: 'Decision 1', description: 'desc', timestamp: '2026-07-01', tags: [] },
    ]));
    mockStoreList.mockReturnValue([]);
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('show', { type: 'decision' })([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Decision 1'));
    spyLog.mockRestore();
  });
});

describe('memory search action', () => {
  it('searches by title', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify([
      { id: '1', type: 'decision', title: 'Auth Design', description: 'JWT', timestamp: '', tags: ['auth'] },
    ]));
    mockStoreSearch.mockReturnValue([]);
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('search')(['auth']);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Auth Design'));
    spyLog.mockRestore();
  });

  it('shows empty for no matches', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify([]));
    mockStoreSearch.mockReturnValue([]);
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('search')(['nonexistent']);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Nenhum resultado'));
    spyLog.mockRestore();
  });
});

describe('memory add action', () => {
  it('adds a record', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify([]));
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('add', { tags: 'important,urgent' })(['decision', 'My Decision', 'Description']);
    expect(mockWriteFileSync).toHaveBeenCalled();
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
    expect(written).toHaveLength(1);
    expect(written[0].title).toBe('My Decision');
    spyLog.mockRestore();
  });

  it('rejects invalid type', () => {
    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const spyExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    makeAction('add')(['invalid', 'Title', 'Desc']);
    expect(spyError).toHaveBeenCalledWith(expect.stringContaining('Tipo inválido'));
    spyExit.mockRestore();
    spyError.mockRestore();
  });
});

describe('memory clear action', () => {
  it('requires --force', () => {
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('clear')([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Use --force'));
    spyLog.mockRestore();
  });

  it('clears with --force', () => {
    mockExistsSync.mockReturnValue(true);
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('clear', { force: true })([]);
    expect(mockWriteFileSync).toHaveBeenCalledWith(expect.stringContaining('ideia-memory.json'), JSON.stringify([], null, 2));
    spyLog.mockRestore();
  });
});
