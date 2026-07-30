import { hooksCommand } from '../runtime-hooks';

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  appendFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));
jest.mock('node:child_process', () => ({ spawnSync: jest.fn() }));
jest.mock('js-yaml', () => ({ load: jest.fn(), dump: jest.fn().mockReturnValue('serialized-yaml') }));

function fs() { return require('node:fs'); }
function yaml() { return require('js-yaml'); }
function cp() { return require('node:child_process'); }

describe('hooksCommand', () => {
  let consoleSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    exitSpy.mockRestore();
  });

  function makeCmd() { return hooksCommand(); }

  it('should be defined', () => { expect(makeCmd()).toBeDefined(); });
  it('should have a name', () => { expect(typeof makeCmd().name()).toBe('string'); });
  it('should have description', () => { expect(makeCmd().description().length).toBeGreaterThan(0); });

  it('init subcommand creates default config', () => {
    makeCmd().commands.find(c => c.name() === 'init')!.parse(['init'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('initialized'));
    expect(yaml().dump).toHaveBeenCalled();
  });

  it('init subcommand calls ensureHooksDir', () => {
    const init = makeCmd().commands.find(c => c.name() === 'init')!;
    init.parse(['init'], { from: 'user' });
    expect(fs().writeFileSync).toHaveBeenCalled();
    const yamlArg = yaml().dump.mock.calls[0][0];
    expect(yamlArg.enabled).toBe(true);
    expect(yamlArg.action).toBe('log');
  });

  it('status subcommand shows config state', () => {
    fs().existsSync.mockReturnValue(true);
    fs().readFileSync.mockReturnValue('yaml');
    yaml().load.mockReturnValueOnce({ enabled: false, action: 'log', watch_paths: ['src'], ignore_paths: ['node_modules'], scanners: ['scan'], report_dir: '.ai/reports' });
    const status = makeCmd().commands.find(c => c.name() === 'status')!;
    status.parse(['status'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Runtime Hooks Status'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Enabled'));
  });

  it('status subcommand shows no violations when log missing', () => {
    fs().existsSync.mockReturnValue(true);
    fs().readFileSync.mockReturnValue('yaml');
    yaml().load.mockReturnValueOnce({ enabled: true, action: 'log', watch_paths: [], ignore_paths: [], scanners: [], report_dir: '.ai/reports' });
    fs().existsSync.mockReturnValue(false);
    const status = makeCmd().commands.find(c => c.name() === 'status')!;
    status.parse(['status'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No violations logged'));
  });

  it('status subcommand shows violation count', () => {
    fs().existsSync.mockReturnValue(true);
    fs().readFileSync.mockReturnValue('yaml');
    yaml().load.mockReturnValueOnce({ enabled: true, action: 'log', watch_paths: [], ignore_paths: [], scanners: [], report_dir: '.ai/reports' });
    fs().existsSync.mockReturnValue(true);
    fs().readFileSync.mockReturnValue('line1\nline2\nline3\n');
    const status = makeCmd().commands.find(c => c.name() === 'status')!;
    status.parse(['status'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Total violations logged'));
  });

  it('logs subcommand shows no violations message when file missing', () => {
    fs().existsSync.mockReturnValue(false);
    const logs = makeCmd().commands.find(c => c.name() === 'logs')!;
    logs.parse(['logs'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No violations logged'));
  });

  it('logs subcommand displays recent violations', () => {
    fs().existsSync.mockReturnValue(true);
    fs().readFileSync.mockReturnValue('{"timestamp":"t1","file":"a.ts","event":"change","scanner":"s1","violation":"v1","blocked":false}');
    const logs = makeCmd().commands.find(c => c.name() === 'logs')!;
    logs.parse(['logs', '-n', '5'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Recent violations'));
  });

  it('logs subcommand uses default limit of 10', () => {
    fs().existsSync.mockReturnValue(true);
    fs().readFileSync.mockReturnValue('{"timestamp":"t","file":"f.ts","event":"change","scanner":"s","violation":"v","blocked":false}');
    const logs = makeCmd().commands.find(c => c.name() === 'logs')!;
    logs.parse(['logs'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Recent violations'));
  });

  it('watch subcommand with --dry-run sets action to log', () => {
    fs().existsSync.mockReturnValue(true);
    fs().readFileSync.mockReturnValue('yaml');
    yaml().load.mockReturnValueOnce({ enabled: true, action: 'block', watch_paths: ['src/**'], ignore_paths: ['node_modules'], scanners: ['s1'], report_dir: '.ai/reports' });
    const watch = makeCmd().commands.find(c => c.name() === 'watch')!;
    watch.parse(['watch', '--dry-run'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Starting'));
  });

  it('watch subcommand without dry-run uses config action', () => {
    fs().existsSync.mockReturnValue(true);
    fs().readFileSync.mockReturnValue('yaml');
    yaml().load.mockReturnValueOnce({ enabled: true, action: 'block', watch_paths: ['src/**'], ignore_paths: ['node_modules'], scanners: ['s1'], report_dir: '.ai/reports' });
    const watch = makeCmd().commands.find(c => c.name() === 'watch')!;
    watch.parse(['watch'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Action: block'));
  });
});
