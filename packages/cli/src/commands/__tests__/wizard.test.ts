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
