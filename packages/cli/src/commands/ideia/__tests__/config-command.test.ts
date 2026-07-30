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

import { ideiaConfigCommand } from '../config-command';

function makeAction(cmdName: string, opts: Record<string, unknown> = {}) {
  const cmd = ideiaConfigCommand();
  const sub = cmd.commands.find(c => c.name() === cmdName)!;
  (sub as any)._optionValues = opts;
  return (sub as any)._actionHandler;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockExistsSync.mockReset();
  mockReadFileSync.mockReset();
  mockWriteFileSync.mockReset();
});

const defaultConfig = {
  ideia: { autonomy: { level: 'N1' }, provider: { ollama: { model: 'qwen' }, priority: [] } },
  project: { name: 'test', stack: {} },
  agents: { enabled: [], custom: [] },
  quality: { minCoverage: 80, gates: [] },
};

describe('config set action', () => {
  it('sets a config key', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(defaultConfig));
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('set')(['ideia.autonomy.level', 'N3']);
    expect(mockWriteFileSync).toHaveBeenCalled();
    spyLog.mockRestore();
  });

  it('parses numeric values', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(defaultConfig));
    makeAction('set')(['quality.minCoverage', '90']);
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
    expect(written.quality.minCoverage).toBe(90);
  });

  it('parses boolean values', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(defaultConfig));
    makeAction('set')(['some.flag', 'true']);
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
    expect(written.some.flag).toBe(true);
  });
});

describe('config get action', () => {
  it('shows a config value', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ ...defaultConfig, ideia: { ...defaultConfig.ideia, autonomy: { level: 'N2' } } }));
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('get')(['ideia.autonomy.level']);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('"N2"'));
    spyLog.mockRestore();
  });

  it('shows not found for missing key', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(defaultConfig));
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('get')(['nonexistent.key']);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('não encontrada'));
    spyLog.mockRestore();
  });
});

describe('config list action', () => {
  it('shows all config values', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(defaultConfig));
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('list')([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('IDEIA'));
    spyLog.mockRestore();
  });
});

describe('config reset action', () => {
  it('requires --force flag', () => {
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('reset')([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Use --force'));
    spyLog.mockRestore();
  });

  it('resets config with --force', () => {
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('reset', { force: true })([]);
    expect(mockWriteFileSync).toHaveBeenCalled();
    spyLog.mockRestore();
  });
});
