import { realitySyncCommand } from '../reality-sync';

const mockDaemon = { on: jest.fn(), start: jest.fn(), stop: jest.fn(), syncNow: jest.fn() };
const mockEngine = { scanAll: jest.fn(), setLevel: jest.fn(), runCycle: jest.fn(), getLevel: jest.fn().mockReturnValue('assisted'), scanStudies: jest.fn() };
const mockIntensifier = { scanGaps: jest.fn(), runCycle: jest.fn() };

jest.mock('@ideia/reality-sync', () => ({
  RealitySyncDaemon: jest.fn().mockImplementation(() => mockDaemon),
  createDefaultConfig: jest.fn().mockReturnValue({ level: 'assisted', riskThreshold: 'medium' }),
  ProactiveInitiativeEngine: jest.fn().mockImplementation(() => mockEngine),
  StudyIntensifier: jest.fn().mockImplementation(() => mockIntensifier),
  applyProfile: jest.fn(),
  getProfile: jest.fn(),
  listProfiles: jest.fn(),
}));
jest.mock('node:fs', () => ({
  existsSync: jest.fn(), readFileSync: jest.fn(), writeFileSync: jest.fn(), mkdirSync: jest.fn(),
}));

function rs() { return require('@ideia/reality-sync'); }
function fs() { return require('node:fs'); }

describe('realitySyncCommand', () => {
  let consoleSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  function makeCmd() { return realitySyncCommand(); }
  function sub(name: string) { return makeCmd().commands.find(c => c.name() === name)!; }
  function configSub(name: string) { return sub('config').commands.find((c: any) => c.name() === name)!; }
  function profileSub(name: string) { return sub('config').commands.find((c: any) => c.name() === 'profile')!.commands.find((c: any) => c.name() === name)!; }

  it('should be defined', () => { expect(makeCmd()).toBeDefined(); });
  it('should have name reality-sync', () => { expect(makeCmd().name()).toBe('reality-sync'); });
  it('should have description', () => { expect(makeCmd().description().length).toBeGreaterThan(0); });

  it('sync subcommand with ok results', () => {
    mockDaemon.syncNow.mockReturnValueOnce([{ ok: true, actions: ['Fixed'], errors: [] }]);
    sub('sync').parse([], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('complete'));
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('sync subcommand with errors', () => {
    mockDaemon.syncNow.mockReturnValueOnce([{ ok: false, actions: [], errors: ['Failed'] }]);
    sub('sync').parse([], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('errors'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('scan subcommand prints results', () => {
    mockEngine.scanAll.mockReturnValueOnce({ total: 2, fixable: 1, unfixable: 1, autoFixable: [{ severity: 'high', description: 'Issue', autoFix: ['fix'] }], requiresHuman: [] });
    sub('scan').parse([], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Issue'));
  });

  it('scan-studies subcommand prints report', () => {
    mockEngine.scanStudies.mockReturnValueOnce([{ score: 3, name: 'Study-X', lines: 100, hasTasks: true, hasAdr: false, hasRisks: true, hasMetrics: true, hasTimeline: false, hasTests: true }]);
    sub('scan-studies').parse([], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Score de Intensidade'));
  });

  it('config set creates config', () => {
    configSub('set').parse(['level', 'autonomous'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('level'));
    expect(fs().writeFileSync).toHaveBeenCalled();
  });

  it('config get returns value', () => {
    fs().existsSync.mockReturnValueOnce(true);
    fs().readFileSync.mockReturnValueOnce('{"level":"assisted"}');
    configSub('get').parse(['level'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith('"assisted"');
  });

  it('config show prints config', () => {
    fs().existsSync.mockReturnValueOnce(true);
    fs().readFileSync.mockReturnValueOnce('{"level":"assisted"}');
    configSub('show').parse([], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"level"'));
  });

  it('config reset writes defaults', () => {
    configSub('reset').parse([], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Config reset'));
  });

  it('profile list prints profiles', () => {
    rs().listProfiles.mockReturnValueOnce([{ name: 'soloDev', label: 'Solo Dev', level: 'guided', riskThreshold: 'high', description: 'desc' }]);
    profileSub('list').parse([], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('soloDev'));
  });

  it('profile apply with valid name', () => {
    rs().applyProfile.mockReturnValueOnce(true);
    profileSub('apply').parse(['soloDev'], { from: 'user' });
    expect(rs().applyProfile).toHaveBeenCalledWith('soloDev', expect.any(String));
  });

  it('profile apply with invalid name', () => {
    rs().applyProfile.mockReturnValueOnce(false);
    profileSub('apply').parse(['invalid'], { from: 'user' });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/n[aã]o encontrado/));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('heal subcommand executes scan and exits', async () => {
    mockEngine.scanAll.mockReturnValueOnce({ total: 3, fixable: 2, unfixable: 1, autoFixable: [{ severity: 'medium', description: 'Test gap', autoFix: ['add-test'] }], requiresHuman: [] });
    mockEngine.runCycle.mockReturnValueOnce({ scanned: 3, fixed: 2, failed: 0, skipped: 1, details: [] });
    await sub('heal').parseAsync([], { from: 'user' });
    expect(mockEngine.runCycle).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('intensify subcommand shows gaps when found', async () => {
    mockIntensifier.scanGaps.mockReturnValueOnce([{ currentScore: 2, targetScore: 4, study: 'Study-01', missing: ['ADR'] }]);
    mockIntensifier.runCycle.mockReturnValueOnce({ scanned: 1, fixesApplied: 1, fixesFailed: 0, details: [{ status: 'fixed', study: 'Study-01', action: 'Added ADR' }] });
    await sub('intensify').parseAsync([], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Relatório'));
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('intensify subcommand exits when no gaps', async () => {
    mockIntensifier.scanGaps.mockReturnValueOnce([]);
    mockIntensifier.runCycle.mockReturnValueOnce({ scanned: 0, fixesApplied: 0, fixesFailed: 0, details: [] });
    await sub('intensify').parseAsync([], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Todos os estudos'));
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
