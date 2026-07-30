import { roadmapCommand } from '../roadmap';

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

jest.mock('../../utils/output', () => ({ printHeader: jest.fn(), printLine: jest.fn(), printResult: jest.fn() }));
jest.mock('../../utils/version', () => ({ getCliVersion: jest.fn(() => '1.0.0') }));
jest.mock('../../hardening/output-contract', () => ({ createEnvelope: jest.fn(d => d) }));
jest.mock('../../strategy/target-state', () => ({ createTargetState: jest.fn((a: any) => ({ ...a, targetId: 'target-12345', riskLevel: a.riskLevel || 'medium' })) }));
jest.mock('../../strategy/roadmap-builder', () => ({ buildRoadmap: jest.fn((_t, items) => ({ roadmapId: 'roadmap-12345', items: items.map((it: any, i: number) => ({ ...it, priority: i + 1 })) })) }));
jest.mock('../../strategy/gap-analyzer', () => ({ analyzeGaps: jest.fn(() => [{ category: 'functional', description: 'Missing state', severity: 'critical' }]) }));
jest.mock('../../strategy/strategy-prioritizer', () => ({ prioritizeStrategy: jest.fn((_g, items) => items.map((it: any, i: number) => ({ ...it, priority: i + 1, value: 100 - i * 10 }))) }));

describe('roadmapCommand', () => {
  const cmd = roadmapCommand();
  const { printHeader, printLine } = require('../../utils/output');

  afterAll(() => { mockExit.mockRestore(); mockConsoleError.mockRestore(); });

  it('should have define, analyze, build, prioritize subcommands', () => {
    expect(cmd.commands.map(c => c.name())).toEqual(expect.arrayContaining(['define', 'analyze', 'build', 'prioritize']));
  });

  it('define should create target state', async () => {
    await cmd.parseAsync(['node', 'test', 'define', 'MyTarget', 'My description']);
    expect(printHeader).toHaveBeenCalledWith('Estado Alvo');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('MyTarget'));
  });

  it('define --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'define', 'T', 'D', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('define with custom risk', async () => {
    await cmd.parseAsync(['node', 'test', 'define', 'T', 'D', '--risk', 'high']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('high'));
  });

  it('analyze should find gaps', async () => {
    await cmd.parseAsync(['node', 'test', 'analyze', '["state"]']);
    expect(printHeader).toHaveBeenCalledWith('Análise de Gaps');
  });

  it('analyze --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'analyze', '["state"]', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('analyze with invalid JSON should handle error', async () => {
    await cmd.parseAsync(['node', 'test', 'analyze', 'not-json']);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Erro na análise'));
    expect(mockExit).toHaveBeenCalled();
  });

  it('build should create roadmap from items', async () => {
    await cmd.parseAsync(['node', 'test', 'build', '[{"title":"Item1","effort":5,"risk":"low"}]']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Item1'));
  });

  it('build --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'build', '[{"title":"Item1"}]', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('build with invalid JSON should handle error', async () => {
    await cmd.parseAsync(['node', 'test', 'build', 'not-json']);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Erro ao construir'));
    expect(mockExit).toHaveBeenCalled();
  });

  it('prioritize should prioritize items', async () => {
    await cmd.parseAsync(['node', 'test', 'prioritize', '[{"title":"Item1"}]']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Item1'));
  });

  it('prioritize --critical-gap should simulate critical gap', async () => {
    await cmd.parseAsync(['node', 'test', 'prioritize', '[{"title":"Item1"}]', '--critical-gap']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Item1'));
  });

  it('prioritize --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'prioritize', '[{"title":"Item1"}]', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });
});
