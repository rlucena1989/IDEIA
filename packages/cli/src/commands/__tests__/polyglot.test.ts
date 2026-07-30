import { polyglotCommand } from '../polyglot';

const AdapterCommandId = { Init: 'init', Test: 'test', Build: 'build', Lint: 'lint', Compile: 'compile', QualityGate: 'quality-gate' };
const RunStatus = { Success: 'success', Failure: 'failure', Skipped: 'skipped', Timeout: 'timeout' };
const LanguageId = { Node: 'node', Python: 'python', Go: 'go' };

const mockListRunners = jest.fn(() => [
  { name: 'Node.js', language: 'node', aliases: ['nodejs', 'javascript'], commands: () => [{ id: AdapterCommandId.Init }, { id: AdapterCommandId.Test }] },
  { name: 'Python', language: 'python', aliases: ['py', 'python3'], commands: () => [{ id: AdapterCommandId.Lint }] },
]);
const mockGetSupported = jest.fn(() => ['node', 'python']);
const mockGetAllSupported = jest.fn(() => ['node', 'python', 'go']);
const mockDetect = jest.fn((dir: string) => ({ languages: ['node'], primary: 'node', raw: ['package.json'] }));
const mockExecute = jest.fn(() => ({ status: RunStatus.Success, durationMs: 150, stdout: 'OK', stderr: '' }));
const mockGetGates = jest.fn(() => [{ language: 'node', command: 'test', status: RunStatus.Success, durationMs: 200 }]);
const mockDiscover = jest.fn(() => [{ id: 'adapter-node', language: 'node', path: '/packages/node' }]);
const mockRuntime = { listRunners: mockListRunners, getSupportedLanguages: mockGetSupported, getAllSupportedLanguages: mockGetAllSupported, detect: mockDetect, execute: mockExecute, getQualityGates: mockGetGates, discoverAdapters: mockDiscover };

jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('polyglotCommand', () => {
  const cmd = polyglotCommand(mockRuntime as any);

  it('should have list, languages, languages-all, detect, run, quality-gate, discover', () => {
    expect(cmd.commands.map(c => c.name())).toEqual(expect.arrayContaining(['list', 'languages', 'languages-all', 'detect', 'run', 'quality-gate', 'discover']));
  });

  it('list should print runners', async () => {
    await cmd.parseAsync(['node', 'test', 'list']);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Node.js'));
  });

  it('languages should print supported', async () => {
    await cmd.parseAsync(['node', 'test', 'languages']);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('node, python'));
  });

  it('languages-all should show scaffold-only tag', async () => {
    await cmd.parseAsync(['node', 'test', 'languages-all']);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('scaffold-only'));
  });

  it('detect should detect languages', async () => {
    await cmd.parseAsync(['node', 'test', 'detect', '/some/dir']);
    expect(mockDetect).toHaveBeenCalledWith('/some/dir');
  });

  it('detect with no languages should show empty', async () => {
    mockDetect.mockReturnValueOnce({ languages: [], primary: '', raw: [] });
    await cmd.parseAsync(['node', 'test', 'detect', '/empty']);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('nenhuma'));
  });

  it('run should execute a command', async () => {
    await cmd.parseAsync(['node', 'test', 'run', 'node', 'build', '/project']);
    expect(mockExecute).toHaveBeenCalledWith('node', 'build', '/project', { timeoutMs: 120000 });
  });

  it('run with unknown language should error', async () => {
    await cmd.parseAsync(['node', 'test', 'run', 'unknown-lang', 'build']);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Linguagem desconhecida'));
  });

  it('run with invalid command should error', async () => {
    await cmd.parseAsync(['node', 'test', 'run', 'node', 'invalid-cmd']);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Comando inv'));
  });

  it('run with failure should set exit code', async () => {
    mockExecute.mockResolvedValueOnce({ status: RunStatus.Failure, durationMs: 100, stdout: '', stderr: 'Error' });
    await cmd.parseAsync(['node', 'test', 'run', 'node', 'build', '/project']);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  it('run with timeout should set exit code', async () => {
    mockExecute.mockResolvedValueOnce({ status: RunStatus.Timeout, durationMs: 120000, stdout: '', stderr: '' });
    await cmd.parseAsync(['node', 'test', 'run', 'node', 'build', '/project']);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  it('quality-gate should run gates', async () => {
    await cmd.parseAsync(['node', 'test', 'quality-gate', '/project']);
    expect(mockGetGates).toHaveBeenCalledWith('/project');
  });

  it('quality-gate with failures should set exit code', async () => {
    mockGetGates.mockResolvedValueOnce([{ language: 'node', command: 'test', status: RunStatus.Failure, durationMs: 100 }]);
    await cmd.parseAsync(['node', 'test', 'quality-gate', '/project']);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  it('discover should list adapters', async () => {
    await cmd.parseAsync(['node', 'test', 'discover', '/packages']);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('adapter-node'));
  });
});
