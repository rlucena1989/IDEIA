import {
  runSecurityCheck, runSecurityDiff, runSecurityBaseline, runSecurityLogs,
  securityCommand,
} from '../security';
import type { SecurityDeps } from '../security';

const makeDeps = (overrides = {}): SecurityDeps => ({
  root: '/test/project',
  loadBaseline: jest.fn().mockReturnValue([
    { file: '.ai/laws.yaml', rules: [{ text: 'nao usar senhas em texto puro', severity: 'critical' }] },
  ]),
  getCurrentRules: jest.fn().mockReturnValue([]),
  detectDowngrades: jest.fn().mockReturnValue([
    { file: '.ai/laws.yaml', rule: 'nao usar senhas em texto puro', severity: 'critical', action: 'removed' },
  ]),
  evaluateFindings: jest.fn().mockReturnValue({
    blocked: true, criticalCount: 1, findings: [], message: 'BLOQUEADO: 1 regra(s) critica(s) removida(s).',
  }),
  logDowngradeAttempt: jest.fn(),
  createBaseline: jest.fn().mockReturnValue([
    { file: '.ai/laws.yaml', rules: [{ text: 'nao usar senhas em texto puro', severity: 'critical' }] },
  ]),
  loadDowngradeLogs: jest.fn().mockReturnValue([]),
  printLine: jest.fn(),
  printResult: jest.fn(),
  ...overrides,
});

beforeEach(() => {
  process.exitCode = 0;
});

describe('runSecurityCheck', () => {
  it('deve exibir mensagem quando baseline esta vazio', () => {
    const deps = makeDeps({ loadBaseline: jest.fn().mockReturnValue([]) });
    runSecurityCheck(deps, {});
    expect(deps.printLine).toHaveBeenCalledWith(
      'Nenhum baseline encontrado. Execute "security baseline" primeiro.',
    );
    expect(deps.detectDowngrades).not.toHaveBeenCalled();
  });

  it('deve detectar downgrades e registrar tentativas', () => {
    const deps = makeDeps();
    runSecurityCheck(deps, {});
    expect(deps.detectDowngrades).toHaveBeenCalled();
    expect(deps.logDowngradeAttempt).toHaveBeenCalled();
    expect(deps.printLine).toHaveBeenCalledWith(
      expect.stringContaining('[CRITICAL]'),
    );
  });

  it('deve definir exit code 1 quando bloqueado', () => {
    const deps = makeDeps();
    process.exitCode = 0;
    runSecurityCheck(deps, {});
    expect(process.exitCode).toBe(1);
  });

  it('NAO deve definir exit code quando force bypass e usado', () => {
    const deps = makeDeps({
      evaluateFindings: jest.fn().mockReturnValue({
        blocked: false, criticalCount: 1, findings: [], message: 'BYPASS com --force',
      }),
    });
    process.exitCode = 0;
    runSecurityCheck(deps, { force: true, reason: 'teste' });
    expect(process.exitCode).toBe(0);
  });

  it('deve lidar com nenhum finding sem erro', () => {
    const deps = makeDeps({
      detectDowngrades: jest.fn().mockReturnValue([]),
      evaluateFindings: jest.fn().mockReturnValue({
        blocked: false, criticalCount: 0, findings: [], message: 'Nenhum downgrade detectado. Baseline intacta.',
      }),
    });
    runSecurityCheck(deps, {});
    expect(deps.printLine).toHaveBeenCalledWith('Nenhum downgrade detectado. Baseline intacta.');
    expect(process.exitCode).toBe(0);
  });
});

describe('runSecurityDiff', () => {
  it('deve mostrar resultado quando nao ha diferencas', () => {
    const deps = makeDeps({ detectDowngrades: jest.fn().mockReturnValue([]) });
    runSecurityDiff(deps);
    expect(deps.printResult).toHaveBeenCalledWith(
      'Nenhuma diferenca detectada entre baseline e estado atual.', true,
    );
  });

  it('deve mostrar diferencas quando encontradas', () => {
    const deps = makeDeps();
    runSecurityDiff(deps);
    expect(deps.printLine).toHaveBeenCalledWith(
      expect.stringContaining('Diferencas de seguranca encontradas'),
    );
    expect(deps.printLine).toHaveBeenCalledWith(
      expect.stringContaining('[CRITICAL]'),
    );
  });
});

describe('runSecurityBaseline', () => {
  it('deve criar baseline e exibir sumario', () => {
    const deps = makeDeps();
    runSecurityBaseline(deps);
    expect(deps.createBaseline).toHaveBeenCalledWith(deps.root);
    expect(deps.printResult).toHaveBeenCalledWith(
      expect.stringContaining('Baseline criada'), true,
    );
    expect(deps.printLine).toHaveBeenCalledWith(
      expect.stringContaining('critical'),
    );
  });
});

describe('runSecurityLogs', () => {
  it('deve exibir mensagem quando nao ha logs', () => {
    const deps = makeDeps({ loadDowngradeLogs: jest.fn().mockReturnValue([]) });
    runSecurityLogs(deps);
    expect(deps.printLine).toHaveBeenCalledWith(
      'Nenhuma tentativa de downgrade registrada.',
    );
  });

  it('deve exibir entradas de log quando existem', () => {
    const logs = [
      { severity: 'critical', file: '.ai/laws.yaml', rule: 'regra-1', timestamp: '2024-01-01T00:00:00Z', reason: 'teste' },
    ];
    const deps = makeDeps({ loadDowngradeLogs: jest.fn().mockReturnValue(logs) });
    runSecurityLogs(deps);
    expect(deps.printLine).toHaveBeenCalledWith(
      expect.stringContaining('Tentativas de downgrade'),
    );
    expect(deps.printLine).toHaveBeenCalledWith(
      expect.stringContaining('[critical]'),
    );
  });
});

describe('securityCommand', () => {
  it('deve retornar um Command com nome security', () => {
    const cmd = securityCommand();
    expect(cmd.name()).toBe('security');
  });
});
