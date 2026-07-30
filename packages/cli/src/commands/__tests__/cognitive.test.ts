import { cognitiveCommand } from '../cognitive';

jest.mock('../../utils/output', () => ({ printHeader: jest.fn(), printLine: jest.fn() }));
jest.mock('../../types/cli-result', () => ({ success: jest.fn((m, d) => ({ ok: true, message: m, data: d })) }));

const mockProcess = jest.fn(() => Promise.resolve({
  intent: { primary: 'refactor', secondary: [], confidence: 0.9 },
  plan: ['Step 1', 'Step 2'], validated: true, validationErrors: [],
}));

const mockRecord = jest.fn();
const mockEnrich = jest.fn(() => Promise.resolve({
  patterns: [{ name: 'pattern1', frequency: 10, confidence: 0.9, source: 'code' }],
  recommendations: [{ category: 'performance', title: 'Optimize X', confidence: 0.85 }],
  suggestions: ['Consider using async/await'],
}));

const mockGetPatterns = jest.fn(() => [{ name: 'pattern1', frequency: 10, confidence: 0.9, source: 'code' }]);
const mockGetTrends = jest.fn(() => ['trend1', 'trend2']);
const mockGetHistory = jest.fn(() => ['history1']);
const mockGetProvider = jest.fn(() => ({ name: 'ollama', version: '0.1.0' }));
const mockListProviders = jest.fn(() => ['ollama', 'openai']);

jest.mock('../../cognitive-coprocessor/integration', () => ({ CognitiveCoprocessor: jest.fn().mockImplementation(() => ({ process: mockProcess })) }));
jest.mock('../../cognitive-coprocessor/pattern-integration', () => ({
  PatternIntegration: jest.fn().mockImplementation(() => ({
    recordInteraction: mockRecord, enrichContext: mockEnrich,
    getDetector: jest.fn(() => ({ getPatterns: mockGetPatterns, getTrends: mockGetTrends, getPatternHistory: mockGetHistory })),
  })),
}));
jest.mock('../../cognitive-coprocessor/llm-enrichment', () => ({
  LlmEnrichment: jest.fn().mockImplementation(() => ({ getProvider: mockGetProvider, getRouter: jest.fn(() => ({ listProviders: mockListProviders })) })),
}));

describe('cognitiveCommand', () => {
  const cmd = cognitiveCommand();

  it('should have analyze and status subcommands', () => {
    expect(cmd.commands.map(c => c.name())).toEqual(expect.arrayContaining(['analyze', 'status']));
  });

  it('analyze should process input and print results', async () => {
    const { printHeader, printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'analyze', 'refactor this code']);
    expect(printHeader).toHaveBeenCalledWith('Cognitive Coprocessor — Analysis');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('refactor'));
  });

  it('analyze --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'analyze', 'test input', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('"intent"'));
  });

  it('analyze --record should record interaction', async () => {
    await cmd.parseAsync(['node', 'test', 'analyze', 'record this', '--record']);
    expect(mockRecord).toHaveBeenCalledWith('record this');
  });

  it('analyze with validation errors should print them', async () => {
    mockProcess.mockResolvedValueOnce({
      intent: { primary: 'refactor', secondary: [], confidence: 0.9 },
      plan: ['Step 1', 'Step 2'], validated: false,
      validationErrors: ['Missing required field', 'Invalid type'],
    });
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'analyze', 'invalid input']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Missing required field'));
  });

  it('analyze with suggestions should print them', async () => {
    mockEnrich.mockResolvedValueOnce({
      patterns: [{ name: 'p1', frequency: 1, confidence: 0.5, source: 'test' }],
      recommendations: [], suggestions: ['Suggestion A', 'Suggestion B'],
    });
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'analyze', 'input with suggestions']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Suggestion A'));
  });

  it('status should show detector and provider status', async () => {
    const { printHeader, printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'status']);
    expect(printHeader).toHaveBeenCalledWith('Cognitive Coprocessor — Status');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('total patterns'));
  });

  it('status --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'status', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('"patternDetector"'));
  });

  it('status with available patterns should show them', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'status']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('pattern1'));
  });

  it('analyze returns success result', async () => {
    const { success } = require('../../types/cli-result');
    await cmd.parseAsync(['node', 'test', 'analyze', 'test']);
    expect(success).toHaveBeenCalledWith('Cognitive analysis completed', expect.objectContaining({ intent: expect.any(Object) }));
  });
});
