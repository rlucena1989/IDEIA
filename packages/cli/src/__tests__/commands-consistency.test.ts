import { describe, it, expect, jest } from '@jest/globals';

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
}));

jest.mock('../runtime/consistency-engine', () => ({
  ConsistencyEngine: jest.fn(),
  classifyIntent: jest.fn(() => 'feature'),
  estimateComplexity: jest.fn(() => 5),
  calculateRisk: jest.fn(() => 'medium'),
}));

jest.mock('../runtime/equivalence-detector', () => ({
  detectEquivalence: jest.fn(() => ({
    structuralSimilarity: 0.9,
    semanticSimilarity: 0.85,
    overallSimilarity: 0.88,
    equivalent: true,
    confidence: 0.95,
    differences: [],
  })),
}));

jest.mock('../runtime/solution-upgrader', () => ({
  SolutionUpgrader: jest.fn(() => ({
    analyze: jest.fn(() => ({
      summary: '2 upgrade opportunities found',
      suggestions: [
        { id: 'UPG-001', description: 'Use async/await', oldPattern: '.then()', newPattern: 'async/await', effort: 'low', risk: 'low', breaking: false },
      ],
    })),
  })),
}));

jest.mock('../runtime/intent-expander', () => ({
  expandIntent: jest.fn(() => ({ scope: 'module', impactAreas: ['api'], recommendations: ['add tests'] })),
  assessRisk: jest.fn(() => ({ mitigatedRisk: 'low', factors: [] })),
}));

jest.mock('../state/consistency-builder', () => ({
  buildConsistencyReport: jest.fn(() => ({
    generatedAt: '2024-01-01',
    items: [
      { area: 'docs', status: 'ok', docs: 1, code: 1, tests: 1, cli: 1, extension: 1, notes: [] },
      { area: 'api', status: 'attention', docs: 1, code: 1, tests: 0, cli: 1, extension: 0, notes: ['missing tests'] },
    ],
    summary: ['All clear'],
  })),
}));

jest.mock('../hardening/consistency-checker', () => ({
  checkConsistency: jest.fn(() => ({ ok: true, attentionCount: 1, blockedCount: 0 })),
}));

jest.mock('../hardening/output-contract', () => ({
  createOkOutput: jest.fn(() => ({ ok: true, data: {} })),
}));

jest.mock('../utils/version', () => ({
  getCliVersion: jest.fn(() => '1.0.0'),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => 'content'),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('createConsistencyCommand', () => {
  it('returns a Command object with name consistency', () => {
    const { createConsistencyCommand } = require('../commands/consistency');
    const cmd = createConsistencyCommand();
    expect(cmd.name()).toBe('consistency');
  });

  it('has description', () => {
    const { createConsistencyCommand } = require('../commands/consistency');
    const cmd = createConsistencyCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has evaluate subcommand', () => {
    const { createConsistencyCommand } = require('../commands/consistency');
    const cmd = createConsistencyCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('evaluate');
  });

  it('has classify subcommand', () => {
    const { createConsistencyCommand } = require('../commands/consistency');
    const cmd = createConsistencyCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('classify');
  });

  it('has equivalent subcommand', () => {
    const { createConsistencyCommand } = require('../commands/consistency');
    const cmd = createConsistencyCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('equivalent');
  });

  it('has upgrade subcommand', () => {
    const { createConsistencyCommand } = require('../commands/consistency');
    const cmd = createConsistencyCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('upgrade');
  });

  it('has matrix subcommand', () => {
    const { createConsistencyCommand } = require('../commands/consistency');
    const cmd = createConsistencyCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('matrix');
  });

  it('evaluate subcommand has --json option', () => {
    const { createConsistencyCommand } = require('../commands/consistency');
    const cmd = createConsistencyCommand();
    const evaluate = cmd.commands.find((c: { name: () => string }) => c.name() === 'evaluate');
    expect(evaluate.options.some((o: { attributeName: () => string }) => o.attributeName() === 'json')).toBe(true);
  });
});
