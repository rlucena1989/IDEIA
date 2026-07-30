import { wizardCommand, printGoalSummary, GOALS, FEATURE_TEMPLATES } from '../wizard';

describe('GOALS', () => {
  it('deve conter 5 objetivos', () => {
    expect(GOALS).toHaveLength(5);
    expect(GOALS[0].id).toBe('new-project');
    expect(GOALS[4].id).toBe('config-governance');
  });
});

describe('FEATURE_TEMPLATES', () => {
  it('deve conter templates para generate-api', () => {
    expect(FEATURE_TEMPLATES['generate-api']).toContain('REST endpoint with CRUD');
  });

  it('deve conter templates para add-tests', () => {
    expect(FEATURE_TEMPLATES['add-tests']).toContain('Unit tests (jest)');
  });
});

describe('printGoalSummary', () => {
  it('deve exibir resumo de new-project', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    printGoalSummary({ goal: 'new-project', name: 'MeuApp', language: 'typescript', framework: 'nestjs', features: 'auth,api', packageManager: 'npm' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('MeuApp'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('typescript'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('nestjs'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('npm'));
    logSpy.mockRestore();
  });

  it('deve exibir resumo de generate-api', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    printGoalSummary({ goal: 'generate-api', resource: 'users', template: 'REST endpoint with CRUD', fields: 'name:string', auth: 'yes' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('users'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('CRUD'));
    logSpy.mockRestore();
  });

  it('deve exibir resumo de add-tests', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    printGoalSummary({ goal: 'add-tests', target: 'src/auth', type: 'Unit tests', framework: 'jest', coverage: '80' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('src/auth'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('80%'));
    logSpy.mockRestore();
  });

  it('deve exibir resumo de add-module', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    printGoalSummary({ goal: 'add-module', moduleName: 'payments', type: 'Clean Architecture', withTests: 'yes', withDocs: 'no' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('payments'));
    logSpy.mockRestore();
  });

  it('deve exibir resumo de config-governance', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    printGoalSummary({ goal: 'config-governance', mode: 'Padrão (recomendado)', withCI: 'yes', withAdr: 'no' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Padrão'));
    logSpy.mockRestore();
  });
});

describe('printGoalSummary', () => {
  it('deve lidar com goal desconhecido sem lancar erro', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    expect(() => printGoalSummary({ goal: 'unknown_goal' })).not.toThrow();
    logSpy.mockRestore();
  });
});

describe('wizardCommand', () => {
  it('returns a commander command', () => {
    const cmd = wizardCommand();
    expect(cmd.name()).toBe('wizard');
  });

  it('has description', () => {
    const cmd = wizardCommand();
    expect(cmd.description()).toBeTruthy();
  });
});

describe('wizardCommand actions', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;
  let stdoutWriteSpy: jest.SpyInstance;
  let originalIsTTY: boolean | undefined;

  beforeAll(() => {
    originalIsTTY = process.stdin.isTTY;
  });

  afterAll(() => {
    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
  });

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit'); }) as () => never);
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
    stdoutWriteSpy.mockRestore();
  });

  it('--no-wizard desativa modo interativo', () => {
    const cmd = wizardCommand();
    cmd.parse(['node', 'test', '--no-wizard']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('desativado'));
  });

  it('modo piped desativa wizard', () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const cmd = wizardCommand();
    cmd.parse(['node', 'test']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('desativado'));
  });

  it('--goal invalido exibe erro', async () => {
    jest.isolateModules(async () => {
      jest.mock('../wizard', () => ({
        ...jest.requireActual('../wizard'),
        runWizard: jest.fn().mockResolvedValue({}),
      }));
      const { wizardCommand } = await import('../wizard');
      const cmd = wizardCommand();
      try { await cmd.parseAsync(['node', 'test', '--goal', 'invalid-goal']); } catch {}
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('inválido'));
    });
  });
});
