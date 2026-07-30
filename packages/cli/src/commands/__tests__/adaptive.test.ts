import { adaptiveCommand } from '../adaptive';

jest.mock('../../adaptive/pattern-store', () => {
  const store = { clear: jest.fn(), createAndAddEvent: jest.fn(), listEvents: jest.fn(), setPatterns: jest.fn() };
  return { PatternStore: jest.fn().mockImplementation(() => store), __mockStore: store };
});
jest.mock('../../adaptive/pattern-analyzer', () => ({
  analyzePatterns: jest.fn().mockReturnValue([{ name: 'Drift', impact: 'medium', frequency: 3, confidence: 0.8, recommendedAction: 'Fix', triggers: ['warn'], type: 'consistency' }]),
}));
jest.mock('../../adaptive/adaptive-score', () => ({
  computeAdaptiveScores: jest.fn().mockReturnValue({ consistencyWeight: 0.35, hardeningWeight: 0.25, generationWeight: 0.20, evolutionWeight: 0.20 }),
}));
jest.mock('../../adaptive/recommendation-engine', () => ({
  recommendActions: jest.fn().mockReturnValue([{ priority: 'high', action: 'Fix', reason: 'Drift', confidence: 0.8 }]),
}));
jest.mock('../../adaptive/cycle-controller', () => ({
  controlCycle: jest.fn().mockReturnValue({ nextAction: 'continue', shouldRepeat: true, shouldEscalate: false, notes: ['OK'] }),
}));
jest.mock('../../adaptive/adaptive-report', () => ({
  buildAdaptiveReport: jest.fn().mockReturnValue({ summary: ['Events: 6'], generatedAt: 'now', metrics: {} }),
}));
jest.mock('../../hardening/output-contract', () => ({
  createEnvelope: jest.fn().mockImplementation((data: any) => data),
}));
jest.mock('../../utils/output', () => ({ printHeader: jest.fn(), printLine: jest.fn(), printResult: jest.fn() }));
jest.mock('../../utils/version', () => ({ getCliVersion: jest.fn().mockReturnValue('1.0.0') }));

function mockStore() { return require('../../adaptive/pattern-store').__mockStore; }
function output() { return require('../../utils/output'); }

describe('adaptiveCommand', () => {
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

  function makeCmd() { return adaptiveCommand(); }
  function sub(name: string) { return makeCmd().commands.find((c: any) => c.name() === name)!; }

  it('should be defined', () => { expect(makeCmd()).toBeDefined(); });
  it('should have a name', () => { expect(typeof makeCmd().name()).toBe('string'); });
  it('should have description', () => { expect(makeCmd().description().length).toBeGreaterThan(0); });

  it('events prints text output', () => {
    mockStore().listEvents.mockReturnValueOnce([{ type: 't', command: 'c', outcome: 'ok' }]);
    sub('events').parse([], { from: 'user' });
    expect(output().printHeader).toHaveBeenCalledWith('Eventos Operacionais');
  });

  it('events prints JSON output', () => {
    mockStore().listEvents.mockReturnValueOnce([{ type: 't', command: 'c', outcome: 'ok' }]);
    sub('events').parse(['--json'], { from: 'user' });
    expect(output().printLine).toHaveBeenCalled();
    const parsed = JSON.parse(output().printLine.mock.calls[0][0]);
    expect(parsed.command).toBe('adaptive events');
  });

  it('events --seed stores events', () => {
    mockStore().listEvents.mockReturnValueOnce([]);
    sub('events').parse(['--seed'], { from: 'user' });
    expect(mockStore().clear).toHaveBeenCalled();
  });

  it('events shows blocked outcome', () => {
    mockStore().listEvents.mockReturnValueOnce([{ type: 'e', command: 'c', outcome: 'blocked' }]);
    sub('events').parse([], { from: 'user' });
    expect(output().printLine).toHaveBeenCalledWith(expect.stringContaining('blocked'));
  });

  it('analyze prints text output', () => {
    mockStore().listEvents.mockReturnValueOnce([{ type: 't', command: 'c', outcome: 'warning' }]);
    sub('analyze').parse([], { from: 'user' });
    expect(output().printHeader).toHaveBeenCalledWith('Análise de Padrões');
  });

  it('analyze prints JSON output', () => {
    mockStore().listEvents.mockReturnValueOnce([{ type: 't', command: 'c', outcome: 'ok' }]);
    sub('analyze').parse(['--json'], { from: 'user' });
    expect(output().printLine).toHaveBeenCalled();
  });

  it('analyze stores patterns', () => {
    mockStore().listEvents.mockReturnValueOnce([{ type: 't', command: 'c', outcome: 'ok' }]);
    sub('analyze').parse([], { from: 'user' });
    expect(mockStore().setPatterns).toHaveBeenCalled();
  });

  it('recommend prints text output', () => {
    mockStore().listEvents.mockReturnValueOnce([{ type: 't', command: 'c', outcome: 'warning' }]);
    sub('recommend').parse([], { from: 'user' });
    expect(output().printHeader).toHaveBeenCalledWith('Recomendações');
  });

  it('recommend prints JSON output', () => {
    mockStore().listEvents.mockReturnValueOnce([]);
    sub('recommend').parse(['--json'], { from: 'user' });
    expect(output().printLine).toHaveBeenCalled();
  });

  it('cycle prints text output', () => {
    mockStore().listEvents.mockReturnValueOnce([{ type: 't', command: 'c', outcome: 'ok' }]);
    sub('cycle').parse([], { from: 'user' });
    expect(output().printHeader).toHaveBeenCalledWith('Ciclo Adaptativo');
  });

  it('cycle prints JSON output', () => {
    mockStore().listEvents.mockReturnValueOnce([]);
    sub('cycle').parse(['--json'], { from: 'user' });
    expect(output().printLine).toHaveBeenCalled();
    const parsed = JSON.parse(output().printLine.mock.calls[0][0]);
    expect(parsed.command).toBe('adaptive cycle');
  });

  it('report prints text output', () => {
    mockStore().listEvents.mockReturnValueOnce([{ type: 't', command: 'c', outcome: 'ok' }]);
    sub('report').parse([], { from: 'user' });
    expect(output().printHeader).toHaveBeenCalledWith('Relatório Adaptativo');
  });

  it('report prints JSON output', () => {
    mockStore().listEvents.mockReturnValueOnce([]);
    sub('report').parse(['--json'], { from: 'user' });
    expect(output().printLine).toHaveBeenCalled();
  });

  it('report builds full report with all components', () => {
    mockStore().listEvents.mockReturnValueOnce([{ type: 't', command: 'c', outcome: 'failed' }]);
    sub('report').parse(['--seed'], { from: 'user' });
    const { buildAdaptiveReport } = require('../../adaptive/adaptive-report');
    expect(buildAdaptiveReport).toHaveBeenCalledWith(expect.objectContaining({
      events: expect.any(Array), patterns: expect.any(Array),
    }));
  });
});
