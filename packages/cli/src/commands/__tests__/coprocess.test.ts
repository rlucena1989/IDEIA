import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPrintHeader = jest.fn();
const mockPrintLine = jest.fn();
const mockPrintResult = jest.fn();
const mockFinish = jest.fn();

jest.mock('../../utils/output', () => ({
  printHeader: (...args: unknown[]) => mockPrintHeader(...args),
  printLine: (...args: unknown[]) => mockPrintLine(...args),
  printResult: (...args: unknown[]) => mockPrintResult(...args),
  finish: (...args: unknown[]) => mockFinish(...args),
}));

const mockNormalizeInput = jest.fn();
const mockComputeMetrics = jest.fn();
const mockRankPriorities = jest.fn();
const mockDetectInconsistencies = jest.fn();
const mockSimulateOutcomes = jest.fn();
const mockValidateAnswer = jest.fn();
const mockGenerateReasoningHints = jest.fn();
const mockPrepareContextForLLM = jest.fn();

jest.mock('../../cognitive-coprocessor/normalize', () => ({ normalizeInput: (...args: unknown[]) => mockNormalizeInput(...args) }));
jest.mock('../../cognitive-coprocessor/metrics', () => ({ computeMetrics: (...args: unknown[]) => mockComputeMetrics(...args) }));
jest.mock('../../cognitive-coprocessor/rank', () => ({ rankPriorities: (...args: unknown[]) => mockRankPriorities(...args) }));
jest.mock('../../cognitive-coprocessor/inconsistencies', () => ({ detectInconsistencies: (...args: unknown[]) => mockDetectInconsistencies(...args) }));
jest.mock('../../cognitive-coprocessor/simulate', () => ({ simulateOutcomes: (...args: unknown[]) => mockSimulateOutcomes(...args) }));
jest.mock('../../cognitive-coprocessor/validate', () => ({ validateAnswer: (...args: unknown[]) => mockValidateAnswer(...args) }));
jest.mock('../../cognitive-coprocessor/hints', () => ({ generateReasoningHints: (...args: unknown[]) => mockGenerateReasoningHints(...args) }));
jest.mock('../../cognitive-coprocessor/context', () => ({ prepareContextForLLM: (...args: unknown[]) => mockPrepareContextForLLM(...args) }));

function getCmd() {
  const { coprocessCommand } = require('../coprocess');
  return coprocessCommand();
}

describe('coprocessCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrepareContextForLLM.mockReturnValue({ context: { key: 'val' }, formatted: '# formatted' });
    mockNormalizeInput.mockReturnValue({ anomalies: [], normalized: 'data' });
    mockComputeMetrics.mockReturnValue({ avg: 10, p50: 9, p95: 11 });
    mockRankPriorities.mockReturnValue({ ranked: ['a'], method: 'combined' });
    mockDetectInconsistencies.mockReturnValue({ inconsistencies: [], count: 0 });
    mockSimulateOutcomes.mockReturnValue({ outcomes: ['x'], mode: 'deterministic' });
    mockValidateAnswer.mockReturnValue({ valid: true, reasons: [] });
    mockGenerateReasoningHints.mockReturnValue({ hints: ['think step by step'] });
  });

  it('returns command named coprocess', () => {
    expect(getCmd().name()).toBe('coprocess');
  });

  it('has all subcommands', () => {
    const names = getCmd().commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(['run', 'normalize', 'metrics', 'rank', 'detect', 'simulate', 'validate', 'hints', 'context']);
  });

  it('run subcommand calls prepareContextForLLM with parsed input', () => {
    const cmd = getCmd();
    const run = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
    run._actionHandler(['{"hello":"world"}']);
    expect(mockPrepareContextForLLM).toHaveBeenCalledWith({ hello: 'world' }, { format: 'markdown' });
    expect(mockPrintHeader).toHaveBeenCalled();
    expect(mockFinish).toHaveBeenCalledWith(expect.objectContaining({ checkpoint: 'coprocess-context', ok: true }));
  });

  it('run subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const run = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
    run.setOptionValue('json', true);
    run._actionHandler(['{"test":1}']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"key"'));
  });

  it('run subcommand outputs llm-ready with --llm-ready flag', () => {
    const cmd = getCmd();
    const run = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
    mockPrepareContextForLLM.mockReturnValue({ context: { key: 'val' }, formatted: '# llm formatted' });
    run.setOptionValue('llmReady', true);
    run._actionHandler(['{"test":1}']);
    expect(mockPrintLine).toHaveBeenCalledWith('# llm formatted');
  });

  it('normalize subcommand shows anomalies count when anomalies exist', () => {
    const cmd = getCmd();
    mockNormalizeInput.mockReturnValue({ anomalies: ['anomaly1'], normalized: 'data' });
    const normalize = cmd.commands.find((c: { name: () => string }) => c.name() === 'normalize')!;
    normalize._actionHandler(['{"val":42}']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('anomalia'));
  });

  it('normalize subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const normalize = cmd.commands.find((c: { name: () => string }) => c.name() === 'normalize')!;
    normalize.setOptionValue('json', true);
    normalize._actionHandler(['{"val":42}']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"anomalies"'));
  });

  it('metrics subcommand calls computeMetrics with percentiles and trend', () => {
    const cmd = getCmd();
    const metrics = cmd.commands.find((c: { name: () => string }) => c.name() === 'metrics')!;
    metrics._actionHandler(['{"values":[1,2,3]}']);
    expect(mockComputeMetrics).toHaveBeenCalledWith({ values: [1, 2, 3] }, { percentiles: true, trend: true });
  });

  it('rank subcommand parses JSON and calls rankPriorities', () => {
    const cmd = getCmd();
    const rank = cmd.commands.find((c: { name: () => string }) => c.name() === 'rank')!;
    rank._actionHandler(['[{"id":"a","urgency":5}]']);
    expect(mockRankPriorities).toHaveBeenCalledWith([{ id: 'a', urgency: 5 }]);
  });

  it('rank subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const rank = cmd.commands.find((c: { name: () => string }) => c.name() === 'rank')!;
    rank.setOptionValue('json', true);
    rank._actionHandler(['[{"id":"a"}]']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"ranked"'));
  });

  it('detect subcommand passes rules option', () => {
    const cmd = getCmd();
    const detect = cmd.commands.find((c: { name: () => string }) => c.name() === 'detect')!;
    detect.setOptionValue('rules', '{"max":50}');
    detect._actionHandler(['{"value":100}']);
    expect(mockDetectInconsistencies).toHaveBeenCalledWith({ value: 100 }, { max: 50 });
  });

  it('detect subcommand works without rules option', () => {
    const cmd = getCmd();
    const detect = cmd.commands.find((c: { name: () => string }) => c.name() === 'detect')!;
    detect._actionHandler(['{"value":100}']);
    expect(mockDetectInconsistencies).toHaveBeenCalledWith({ value: 100 }, undefined);
  });

  it('simulate subcommand uses deterministic mode by default', () => {
    const cmd = getCmd();
    const simulate = cmd.commands.find((c: { name: () => string }) => c.name() === 'simulate')!;
    simulate._actionHandler(['{"scenario":"test"}']);
    expect(mockSimulateOutcomes).toHaveBeenCalledWith({ scenario: 'test' }, { mode: 'deterministic', iterations: 100 });
  });

  it('simulate subcommand uses provided mode and iterations', () => {
    const cmd = getCmd();
    const simulate = cmd.commands.find((c: { name: () => string }) => c.name() === 'simulate')!;
    simulate.setOptionValue('mode', 'monte-carlo');
    simulate.setOptionValue('iterations', '500');
    simulate._actionHandler(['{"scenario":"test"}']);
    expect(mockSimulateOutcomes).toHaveBeenCalledWith({ scenario: 'test' }, { mode: 'monte-carlo', iterations: 500 });
  });

  it('validate subcommand passes ground truth and rules', () => {
    const cmd = getCmd();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate.setOptionValue('groundTruth', '{"answer":42}');
    validate.setOptionValue('rules', '{"max":100}');
    validate._actionHandler(['{"answer":42}']);
    expect(mockValidateAnswer).toHaveBeenCalledWith({ answer: 42 }, { answer: 42 }, { max: 100 });
  });

  it('validate subcommand works without groundTruth or rules', () => {
    const cmd = getCmd();
    const validate = cmd.commands.find((c: { name: () => string }) => c.name() === 'validate')!;
    validate._actionHandler(['{"answer":42}']);
    expect(mockValidateAnswer).toHaveBeenCalledWith({ answer: 42 }, undefined, undefined);
  });

  it('hints subcommand classifies problem type as numerical', () => {
    const cmd = getCmd();
    const hints = cmd.commands.find((c: { name: () => string }) => c.name() === 'hints')!;
    hints._actionHandler(['123+456']);
    expect(mockGenerateReasoningHints).toHaveBeenCalledWith({ type: 'numerical', input: '123+456' });
  });

  it('hints subcommand classifies problem type as mixed', () => {
    const cmd = getCmd();
    const hints = cmd.commands.find((c: { name: () => string }) => c.name() === 'hints')!;
    hints._actionHandler(['compare A and B']);
    expect(mockGenerateReasoningHints).toHaveBeenCalledWith({ type: 'mixed', input: 'compare A and B' });
  });

  it('hints subcommand classifies problem type as textual', () => {
    const cmd = getCmd();
    const hints = cmd.commands.find((c: { name: () => string }) => c.name() === 'hints')!;
    hints._actionHandler(['explain gravity']);
    expect(mockGenerateReasoningHints).toHaveBeenCalledWith({ type: 'textual', input: 'explain gravity' });
  });

  it('context subcommand calls prepareContextForLLM and outputs context', () => {
    const cmd = getCmd();
    mockPrepareContextForLLM.mockReturnValue({ context: { prepared: true }, formatted: '# context' });
    const context = cmd.commands.find((c: { name: () => string }) => c.name() === 'context')!;
    context._actionHandler(['{"task":"test"}']);
    expect(mockPrepareContextForLLM).toHaveBeenCalledWith({ task: 'test' }, { format: 'markdown' });
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('prepared'));
  });

  it('context subcommand outputs formatted text with --llm-ready flag', () => {
    const cmd = getCmd();
    mockPrepareContextForLLM.mockReturnValue({ context: { prepared: true }, formatted: '# formatted context' });
    const context = cmd.commands.find((c: { name: () => string }) => c.name() === 'context')!;
    context.setOptionValue('llmReady', true);
    context._actionHandler(['{"task":"test"}']);
    expect(mockPrintLine).toHaveBeenCalledWith('# formatted context');
  });

  it('normalize handles non-JSON string input', () => {
    const cmd = getCmd();
    const normalize = cmd.commands.find((c: { name: () => string }) => c.name() === 'normalize')!;
    normalize._actionHandler(['plain text input']);
    expect(mockNormalizeInput).toHaveBeenCalledWith('plain text input');
  });
});
