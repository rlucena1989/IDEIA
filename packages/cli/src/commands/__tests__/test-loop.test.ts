import { testCommand, testLoopRunAction } from '../test-loop';
import { printLine, finish } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../runtime/test-loop');
import { runTestLoop, formatTestReport } from '../../runtime/test-loop';

beforeEach(() => {
  jest.clearAllMocks();
  (finish as jest.Mock).mockImplementation(() => {});
  (runTestLoop as jest.Mock).mockReturnValue({
    overallPassed: true, sessionId: 'test-001',
    results: [{ phase: 'lint', passed: true }],
  });
  (formatTestReport as jest.Mock).mockReturnValue('Report content');
});

describe('testLoopRunAction', () => {
  it('deve executar pipeline e gerar relatorio', () => {
    testLoopRunAction();
    expect(runTestLoop).toHaveBeenCalled();
    expect(formatTestReport).toHaveBeenCalled();
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('deve reportar falha se testes nao passarem', () => {
    (runTestLoop as jest.Mock).mockReturnValue({
      overallPassed: false, sessionId: 'test-002',
      results: [{ phase: 'lint', passed: false }],
    });
    testLoopRunAction();
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });
});

describe('testCommand', () => {
  it('should be defined', () => {
    expect(testCommand).toBeDefined();
  });

  it('should return Command with run subcommand', () => {
    const cmd = testCommand();
    expect(cmd.name()).toBe('test-loop');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('run');
  });
});
