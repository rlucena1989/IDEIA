import { decisionCommand } from '../decision';

const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
}));

jest.mock('../../utils/version', () => ({
  getCliVersion: jest.fn(() => '1.0.0'),
}));

jest.mock('../../hardening/output-contract', () => ({
  createEnvelope: jest.fn((d: Record<string, unknown>) => d),
}));

const mockTraces: Array<Record<string, unknown>> = [];
const mockExplanations: Array<Record<string, unknown>> = [];
const mockEvidence: Array<Record<string, unknown>> = [];
const mockRationales: Array<Record<string, unknown>> = [];

jest.mock('../../explanation/explanation-registry', () => ({
  ExplanationRegistry: jest.fn().mockImplementation(() => ({
    registerTrace: jest.fn((t: Record<string, unknown>) => { mockTraces.push(t); }),
    registerExplanation: jest.fn((e: Record<string, unknown>) => { mockExplanations.push(e); }),
    registerEvidence: jest.fn((e: Record<string, unknown>) => { mockEvidence.push(e); }),
    registerRationale: jest.fn((r: Record<string, unknown>) => { mockRationales.push(r); }),
    listTraces: jest.fn(() => [...mockTraces]),
    listExplanations: jest.fn(() => [...mockExplanations]),
    listEvidence: jest.fn(() => [...mockEvidence]),
    listRationales: jest.fn(() => [...mockRationales]),
  })),
}));

jest.mock('../../explanation/decision-trace', () => ({
  createDecisionTrace: jest.fn((args: Record<string, unknown>) => ({
    ...args,
    traceId: 'trace-' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
  })),
}));

jest.mock('../../explanation/explanation-engine', () => ({
  explainDecision: jest.fn((_trace: unknown) => ({
    summary: 'Decision approved based on policy and signals',
    details: ['No conflicts', 'Tests passing'],
  })),
}));

jest.mock('../../explanation/rationale-builder', () => ({
  buildRationale: jest.fn((_trace: unknown, _evidence: unknown[]) => ({
    facts: ['PR #42 approved'],
    inferences: ['Low risk change'],
  })),
}));

jest.mock('../../explanation/evidence-linker', () => ({
  linkEvidence: jest.fn((_sources: unknown[]) => [
    { evidenceId: 'ev-1', sourceType: 'policy', sourceRef: 'policy-1', description: 'Evidence description' },
  ]),
}));

jest.mock('../../explanation/explain-report', () => ({
  buildExplainReport: jest.fn((_data: unknown) => ({
    notes: ['Report generated with 2 traces', 'All decisions accounted for'],
  })),
}));

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('decisionCommand', () => {
  const cmd = decisionCommand();

  beforeEach(() => {
    jest.clearAllMocks();
    mockTraces.length = 0;
    mockExplanations.length = 0;
    mockEvidence.length = 0;
    mockRationales.length = 0;
  });

  afterAll(() => {
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should be defined', () => {
    expect(cmd).toBeDefined();
  });

  it('should have name decision', () => {
    expect(cmd.name()).toBe('decision');
  });

  it('should have description', () => {
    expect(cmd.description().length).toBeGreaterThan(0);
  });

  it('should have trace, show, export subcommands', () => {
    const subcommands = cmd.commands.map(c => c.name());
    expect(subcommands).toContain('trace');
    expect(subcommands).toContain('show');
    expect(subcommands).toContain('export');
  });

  it('trace should create a decision trace', async () => {
    const { printHeader, printLine } = require('../../utils/output');
    const { createDecisionTrace } = require('../../explanation/decision-trace');
    await cmd.parseAsync(['node', 'test', 'trace', 'approve', 'PR #42']);
    expect(createDecisionTrace).toHaveBeenCalledWith({
      decisionType: 'approve',
      context: 'PR #42',
      signals: [],
      policyApplied: 'policy-default',
      outcome: 'approved',
    });
    expect(printHeader).toHaveBeenCalledWith('Trilha de Decisão');
  });

  it('trace --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'trace', 'approve', 'PR', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('trace with signals should parse them', async () => {
    const { createDecisionTrace } = require('../../explanation/decision-trace');
    await cmd.parseAsync(['node', 'test', 'trace', 'approve', 'PR #42', '--signals', 'no_conflicts,tests_passing']);
    const callArgs = createDecisionTrace.mock.calls[0][0];
    expect(callArgs.signals).toEqual(['no_conflicts', 'tests_passing']);
  });

  it('trace with custom policy and outcome', async () => {
    const { createDecisionTrace } = require('../../explanation/decision-trace');
    await cmd.parseAsync(['node', 'test', 'trace', 'block', 'Deploy', '--policy', 'policy-deploy-freeze', '--outcome', 'blocked']);
    const callArgs = createDecisionTrace.mock.calls[0][0];
    expect(callArgs.policyApplied).toBe('policy-deploy-freeze');
    expect(callArgs.outcome).toBe('blocked');
  });

  it('show should display a decision by trace ID', async () => {
    const { printHeader, printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'trace', 'approve', 'PR #42']);
    const traceId = mockTraces[0]?.traceId as string;
    await cmd.parseAsync(['node', 'test', 'show', traceId]);
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Decisão'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('PR #42 approved'));
  });

  it('show with non-existent trace ID should error', async () => {
    await cmd.parseAsync(['node', 'test', 'show', 'nonexistent-trace']);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Trilha não encontrada'));
  });

  it('show --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'trace', 'approve', 'PR']);
    const traceId = mockTraces[0]?.traceId as string;
    await cmd.parseAsync(['node', 'test', 'show', traceId, '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('export should generate report', async () => {
    const { printHeader, printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'export']);
    expect(printHeader).toHaveBeenCalledWith('Relatório de Decisões');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Report generated'));
  });

  it('export --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'export', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('export --seed should populate sample data', async () => {
    const { buildExplainReport } = require('../../explanation/explain-report');
    await cmd.parseAsync(['node', 'test', 'export', '--seed']);
    expect(buildExplainReport).toHaveBeenCalled();
  });

  it('export with seeded data includes all traces', async () => {
    await cmd.parseAsync(['node', 'test', 'export', '--seed']);
    expect(mockTraces.length).toBeGreaterThanOrEqual(2);
  });
});
