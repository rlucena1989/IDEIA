import { Command } from 'commander';
import { traceCommand } from '../trace';

jest.mock('../../explanation/explanation-registry', () => ({
  ExplanationRegistry: jest.fn().mockImplementation(() => ({
    listTraces: jest.fn().mockReturnValue([]),
    findTraceByType: jest.fn().mockReturnValue([]),
    findTraceByOutcome: jest.fn().mockReturnValue([]),
    searchTraces: jest.fn().mockReturnValue([]),
  })),
}));

jest.mock('../../explanation/decision-trace', () => ({
  createDecisionTrace: jest.fn(),
}));

jest.mock('../../explanation/explanation-engine', () => ({
  explainDecision: jest.fn().mockReturnValue({ summary: 'Mock explanation' }),
}));

jest.mock('../../hardening/output-contract', () => ({
  createEnvelope: jest.fn().mockReturnValue({ ok: true }),
}));

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
}));

jest.mock('../../utils/version', () => ({
  getCliVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('traceCommand', () => {
  it('returns a Commander Command with name trace', () => {
    const cmd = traceCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('trace');
  });

  it('has description', () => {
    const cmd = traceCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has sub-command list', () => {
    const cmd = traceCommand();
    const sub = cmd.commands.find((c) => c.name() === 'list');
    expect(sub).toBeDefined();
    expect(sub!.description()).toBeTruthy();
  });

  it('has sub-command show', () => {
    const cmd = traceCommand();
    const sub = cmd.commands.find((c) => c.name() === 'show');
    expect(sub).toBeDefined();
    expect(sub!.description()).toBeTruthy();
  });

  it('has sub-command search', () => {
    const cmd = traceCommand();
    const sub = cmd.commands.find((c) => c.name() === 'search');
    expect(sub).toBeDefined();
    expect(sub!.description()).toBeTruthy();
  });
});
