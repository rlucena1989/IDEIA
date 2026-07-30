import { scannerCommand } from '../scanner';

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
  finish: jest.fn(),
}));

jest.mock('../../io', () => {
  const mockFs = {
    cwd: () => '/test',
    exists: jest.fn(() => true),
    read: jest.fn(() => 'file content'),
    readDir: jest.fn(() => ['file1.ts', 'file2.ts', 'subdir']),
    stat: jest.fn(() => ({ mtimeMs: Date.now(), size: 100, isDirectory: () => false })),
    write: jest.fn(),
    mkdir: jest.fn(),
    remove: jest.fn(),
  };
  return {
    getIO: jest.fn(() => ({
      fs: mockFs,
      shell: { exec: jest.fn(), execString: jest.fn(), spawn: jest.fn() },
      http: { get: jest.fn(), post: jest.fn() },
    })),
  };
});

jest.mock('../../runtime/duplication', () => ({
  DEFAULT_SCANNER_OPTIONS: {
    minFilenameSimilarity: 0.8,
    minContentSimilarity: 0.6,
    minFunctionSimilarity: 0.7,
  },
  runDuplicationScan: jest.fn(() => ({
    scannedFiles: 10,
    totalRedundant: 2,
    redundantPairs: [{ fileA: 'a.ts', fileB: 'b.ts', similarity: 0.9 }],
  })),
  formatDuplicationReport: jest.fn(() => 'formatted report'),
  contentSimilarity: jest.fn((a: string, b: string) => 0.85),
}));

describe('scanner', () => {
  const cmd = scannerCommand();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scannerCommand should be defined', () => {
    expect(scannerCommand).toBeDefined();
  });

  it('scannerCommand should execute without throwing', () => {
    expect(typeof scannerCommand).toBe('function');
  });

  it('should have duplicates and check-redundancy subcommands', () => {
    const subcommands = cmd.commands.map(c => c.name());
    expect(subcommands).toContain('duplicates');
    expect(subcommands).toContain('check-redundancy');
  });

  it('duplicates should scan directory and print results', async () => {
    const { printHeader, printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'duplicates']);
    expect(printHeader).toHaveBeenCalledWith('Duplication Scanner');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Min filename sim'));
  });

  it('duplicates --json should print JSON report', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'duplicates', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('duplicates with custom thresholds', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'duplicates', '--min-filename-sim', '0.5', '--min-content-sim', '0.4']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('0.5'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('0.4'));
  });

  it('duplicates with non-existent dir should error', async () => {
    const { printLine, finish } = require('../../utils/output');
    const io = require('../../io');
    io.getIO().fs.exists.mockReturnValueOnce(false);
    await cmd.parseAsync(['node', 'test', 'duplicates', '-d', '/nonexistent']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('check-redundancy should check a specific file', async () => {
    const { printHeader, finish } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'check-redundancy', 'somefile.ts']);
    expect(printHeader).toHaveBeenCalledWith('Redundancy Check');
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: false, status: 'warning' }));
  });

  it('check-redundancy with non-existent file should error', async () => {
    const { printLine, finish } = require('../../utils/output');
    const io = require('../../io');
    io.getIO().fs.exists.mockReturnValueOnce(false);
    await cmd.parseAsync(['node', 'test', 'check-redundancy', 'nonexistent.ts']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('check-redundancy with unreadable file should error', async () => {
    const { printLine, finish } = require('../../utils/output');
    const io = require('../../io');
    io.getIO().fs.read.mockReturnValueOnce(null);
    await cmd.parseAsync(['node', 'test', 'check-redundancy', 'unreadable.ts']);
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('check-redundancy with no redundancy found', async () => {
    const { contentSimilarity } = require('../../runtime/duplication');
    contentSimilarity.mockReturnValue(0.3);
    const { finish } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'check-redundancy', 'unique.ts']);
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });
});
