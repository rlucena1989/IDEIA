import { createConsistencyCommand } from '../consistency';

const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

jest.mock('fs', () => {
  const existsSync = jest.fn(() => true);
  const readFileSync = jest.fn((p: string) => {
    if (p === '/empty.ts') return '';
    return 'content';
  });
  return { existsSync, readFileSync, writeFileSync: jest.fn(), mkdirSync: jest.fn() };
});

jest.mock('../../runtime/consistency-engine', () => ({
  ConsistencyEngine: jest.fn().mockImplementation(() => ({
    evaluate: jest.fn(() => ({
      summary: '2 decisions made',
      decisions: [
        { mode: 'preserve', patternId: 'P1', confidence: 0.9, reason: 'Standard pattern', riskWarning: null },
        { mode: 'adapt', patternId: 'P2', confidence: 0.7, reason: 'Needs adjustment', riskWarning: 'Potential issue' },
      ],
    })),
  })),
  classifyIntent: jest.fn(() => 'refactoring'),
  estimateComplexity: jest.fn(() => 5),
  calculateRisk: jest.fn(() => 'medium'),
}));

jest.mock('../../runtime/equivalence-detector', () => ({
  detectEquivalence: jest.fn(() => ({
    structuralSimilarity: 0.85, semanticSimilarity: 0.75, overallSimilarity: 0.8, equivalent: true, confidence: 0.9, differences: ['Line 5 differs'],
  })),
}));

jest.mock('../../runtime/solution-upgrader', () => ({
  SolutionUpgrader: jest.fn().mockImplementation(() => ({
    analyze: jest.fn(() => ({
      summary: '2 upgrade opportunities',
      suggestions: [{ id: 'S1', description: 'Use const', breaking: false, effort: 1, risk: 'low', oldPattern: 'var', newPattern: 'const' }],
    })),
  })),
}));

jest.mock('../../runtime/intent-expander', () => ({
  expandIntent: jest.fn(() => ({ scope: 'module-level', impactAreas: ['performance', 'readability'], recommendations: ['Add types', 'Use async'] })),
  assessRisk: jest.fn(() => ({
    mitigatedRisk: 'low',
    factors: [{ name: 'Complexity', impact: 3, probability: 0.4, severity: 0.12, mitigation: 'Add tests' }],
  })),
}));

jest.mock('../../state/consistency-builder', () => ({
  buildConsistencyReport: jest.fn(() => ({
    generatedAt: '2026-07-26',
    items: [
      { area: 'docs', status: 'ok', docs: 1, code: 1, tests: 1, cli: 1, extension: 1, notes: [] },
      { area: 'api', status: 'attention', docs: 0, code: 1, tests: 1, cli: 0, extension: 0, notes: ['Missing docs'] },
    ],
    summary: ['All good'],
  })),
}));

jest.mock('../../hardening/consistency-checker', () => ({
  checkConsistency: jest.fn(() => ({ ok: true, attentionCount: 1, blockedCount: 0 })),
}));

jest.mock('../../hardening/output-contract', () => ({
  createOkOutput: jest.fn((cmd, v, d) => ({ cmd, version: v, ok: true, data: d })),
  createErrorOutput: jest.fn(),
}));

jest.mock('../../utils/version', () => ({ getCliVersion: jest.fn(() => '1.0.0') }));

describe('createConsistencyCommand', () => {
  const cmd = createConsistencyCommand();

  beforeEach(() => {
    const fs = require('fs');
    fs.existsSync.mockImplementation(() => true);
    fs.readFileSync.mockImplementation((p: string) => {
      if (p === '/empty.ts') return '';
      if (p === '/complex.ts') return 'function test() { if (x) { return 1; } }';
      return 'content';
    });
  });

  afterAll(() => { mockExit.mockRestore(); mockConsoleError.mockRestore(); mockConsoleLog.mockRestore(); });

  it('should have evaluate, classify, equivalent, upgrade, matrix subcommands', () => {
    const snames = cmd.commands.map(c => c.name());
    expect(snames).toContain('evaluate'); expect(snames).toContain('classify');
    expect(snames).toContain('equivalent'); expect(snames).toContain('upgrade'); expect(snames).toContain('matrix');
  });

  it('evaluate should run consistency engine', async () => {
    await cmd.parseAsync(['node', 'test', 'evaluate', '/test.ts']);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Consistencia Engine'));
  });

  it('evaluate --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'evaluate', '/test.ts', '--json']);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"decisions"'));
  });

  it('evaluate with non-existent file should error and exit', async () => {
    const fs = require('fs');
    fs.existsSync.mockReturnValueOnce(false);
    await cmd.parseAsync(['node', 'test', 'evaluate', '/nonexistent.ts']);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Arquivo nao encontrado'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('evaluate with risk warning should print it', async () => {
    await cmd.parseAsync(['node', 'test', 'evaluate', '/test.ts']);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Potential issue'));
  });

  it('classify should analyze intent', async () => {
    await cmd.parseAsync(['node', 'test', 'classify', '/test.ts']);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Classificacao'));
  });

  it('classify --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'classify', '/test.ts', '--json']);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"intent"'));
  });

  it('classify with non-existent file should error', async () => {
    const fs = require('fs');
    fs.existsSync.mockReturnValueOnce(false);
    await cmd.parseAsync(['node', 'test', 'classify', '/nonexistent.ts']);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Arquivo nao encontrado'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('equivalent should compare two files', async () => {
    await cmd.parseAsync(['node', 'test', 'equivalent', '/fileA.ts', '/fileB.ts']);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('SIM'));
  });

  it('equivalent --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'equivalent', '/fileA.ts', '/fileB.ts', '--json']);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"overallSimilarity"'));
  });

  it('equivalent with non-existent file A should error', async () => {
    const fs = require('fs');
    fs.existsSync.mockReturnValueOnce(false);
    await cmd.parseAsync(['node', 'test', 'equivalent', '/nonexistent.ts', '/fileB.ts']);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Arquivo nao encontrado'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('equivalent with low confidence should print it', async () => {
    const { detectEquivalence } = require('../../runtime/equivalence-detector');
    detectEquivalence.mockReturnValueOnce({
      structuralSimilarity: 0.5, semanticSimilarity: 0.5, overallSimilarity: 0.5,
      equivalent: false, confidence: 0.6, differences: ['Major difference'],
    });
    await cmd.parseAsync(['node', 'test', 'equivalent', '/fileA.ts', '/fileB.ts']);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Confianca'));
  });

  it('upgrade should analyze upgrade opportunities', async () => {
    await cmd.parseAsync(['node', 'test', 'upgrade', '/test.ts']);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Upgrade Analysis'));
  });

  it('upgrade --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'upgrade', '/test.ts', '--json']);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"summary"'));
  });

  it('matrix should build consistency matrix', async () => {
    await cmd.parseAsync(['node', 'test', 'matrix']);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Matriz de Consistência'));
  });

  it('matrix --json should print JSON', async () => {
    await cmd.parseAsync(['node', 'test', 'matrix', '--json']);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"consistency"'));
  });
});
