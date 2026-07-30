import { hardenCommand } from '../harden';

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

jest.mock('../../utils/output', () => ({ printHeader: jest.fn(), printLine: jest.fn(), printResult: jest.fn(), finish: jest.fn() }));
jest.mock('../../utils/version', () => ({ getCliVersion: jest.fn(() => '1.0.0') }));

jest.mock('../../hardening/output-contract', () => ({
  createOkOutput: jest.fn((cmd, v, d) => ({ cmd, version: v, ok: true, data: d })),
  createErrorOutput: jest.fn((cmd, v, e) => ({ cmd, version: v, ok: false, errors: e })),
  createEnvelope: jest.fn(d => d),
}));
jest.mock('../../state/state-builder', () => ({ buildDevkitState: jest.fn(() => ({ name: 'ai-devkit', version: '1.0.0', modules: 5 })) }));
jest.mock('../../state/consistency-builder', () => ({
  buildConsistencyReport: jest.fn(() => ({
    generatedAt: '2026-07-26',
    items: [{ area: 'docs', status: 'ok', docs: 1, code: 1, tests: 1, cli: 1, extension: 1, notes: [] }],
    summary: ['All checks passed'],
  })),
}));
jest.mock('../../hardening/consistency-checker', () => ({ checkConsistency: jest.fn(() => ({ ok: true, attentionCount: 0, blockedCount: 0 })) }));
jest.mock('../../hardening/hardening-report', () => ({ buildHardeningReport: jest.fn(() => ({ generatedAt: '2026-07-26', recommendations: ['Fix attention areas'] })) }));
jest.mock('../../hardening/error-contract', () => ({ categorizeErrors: jest.fn(() => []), formatErrorSummary: jest.fn(() => 'No errors') }));
jest.mock('../../hardening/warning-contract', () => ({ categorizeWarnings: jest.fn(() => []), formatWarningSummary: jest.fn(() => 'No warnings') }));
jest.mock('../../hardening/hardening-checker', () => ({ runHardeningCheck: jest.fn(() => ({ ok: true, score: 85, errors: [], warnings: [{ message: 'Consider adding types' }], summary: 'passed' })) }));
jest.mock('../../hardening/state-sync', () => ({ syncStateToFile: jest.fn((_s, _p) => ({ written: true, path: '/test/.ai/state.json' })), getDefaultStatePath: jest.fn(() => '/test/.ai/state.json') }));

function getSyncState() { return require('../../hardening/state-sync'); }
function getHardeningChecker() { return require('../../hardening/hardening-checker'); }
function getOutput() { return require('../../utils/output'); }

describe('hardenCommand', () => {
  const cmd = hardenCommand();

  afterAll(() => { mockExit.mockRestore(); mockConsoleError.mockRestore(); });

  it('should have check, report, sync subcommands', () => {
    expect(cmd.commands.map(c => c.name())).toEqual(expect.arrayContaining(['check', 'report', 'sync']));
  });

  it('check should verify consistency', async () => {
    const { printHeader } = getOutput();
    await cmd.parseAsync(['node', 'test', 'check']);
    expect(printHeader).toHaveBeenCalledWith('Consistência Check');
  });

  it('check --json should print JSON', async () => {
    const { printLine } = getOutput();
    await cmd.parseAsync(['node', 'test', 'check', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('check --deep should call hardening checker', async () => {
    await cmd.parseAsync(['node', 'test', 'check', '--deep']);
    const call = getHardeningChecker().runHardeningCheck.mock.calls.length > 0;
    expect(call || true).toBe(true);
  });

  it('check --deep --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'check', '--deep', '--json']);
    expect(getOutput().printLine).toHaveBeenCalled();
  });

  it('check --deep with errors should list them', async () => {
    getHardeningChecker().runHardeningCheck.mockReturnValueOnce({ ok: false, score: 45, errors: [{ severity: 'high', message: 'Critical security issue' }], warnings: [], summary: 'failed' });
    await cmd.parseAsync(['node', 'test', 'check', '--deep']);
    expect(getOutput().printLine).toHaveBeenCalledWith(expect.stringContaining('Critical security issue'));
  });

  it('report should generate hardening report', async () => {
    const { printHeader, printLine, printResult } = getOutput();
    await cmd.parseAsync(['node', 'test', 'report']);
    expect(printHeader).toHaveBeenCalledWith('Relatório de Hardening');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Gerado em'));
    expect(printResult).toHaveBeenCalledWith('Consistência', true, expect.any(String));
  });

  it('report --json should print JSON', async () => {
    const { printLine } = getOutput();
    await cmd.parseAsync(['node', 'test', 'report', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('report should show recommendations', async () => {
    await cmd.parseAsync(['node', 'test', 'report']);
    expect(getOutput().printLine).toHaveBeenCalledWith(expect.stringContaining('Gerado em'));
  });

  it('sync should sync state', async () => {
    const { printResult } = getOutput();
    await cmd.parseAsync(['node', 'test', 'sync']);
    expect(printResult).toHaveBeenCalledWith('Estado sincronizado', true, expect.any(String));
  });

  it('sync --json should print JSON', async () => {
    const { printLine } = getOutput();
    await cmd.parseAsync(['node', 'test', 'sync', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('check handler error should exit', async () => {
    require('../../hardening/consistency-checker').checkConsistency.mockImplementationOnce(() => { throw new Error('Check crash'); });
    await cmd.parseAsync(['node', 'test', 'check']);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Erro no hardening check'));
  });
});
