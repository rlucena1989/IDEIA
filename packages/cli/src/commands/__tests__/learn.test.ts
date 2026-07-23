import { learnCommand, learnAnalyzeAction, learnRecommendAction, learnApplyAction } from '../learn';
import { printHeader, printLine, printResult } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../utils/version');
jest.mock('../../hardening/output-contract');
jest.mock('../../memory/pattern-detector');
jest.mock('../../memory/learning-engine');
jest.mock('../../memory/policy-adapter');

let mockMemoryStore: { list: jest.Mock; append: jest.Mock };
jest.mock('@ideia/memory-store', () => {
  mockMemoryStore = { list: jest.fn(), append: jest.fn() };
  return { MemoryStore: jest.fn(() => mockMemoryStore), createMemoryRecord: jest.fn((x: unknown) => x) };
});

import { detectPatterns } from '../../memory/pattern-detector';
import { generateRecommendations } from '../../memory/learning-engine';
import { adaptPolicy } from '../../memory/policy-adapter';
import { createEnvelope } from '../../hardening/output-contract';
import { getCliVersion } from '../../utils/version';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  (getCliVersion as jest.Mock).mockReturnValue('1.0.0');
  (createEnvelope as jest.Mock).mockImplementation((data: unknown) => data);
  mockMemoryStore.list.mockReturnValue([]);
  (detectPatterns as jest.Mock).mockReturnValue([{ name: 'failure-pattern', frequency: 3, confidence: 0.8 }]);
  (generateRecommendations as jest.Mock).mockReturnValue([{ action: 'review', target: 'consistency-check', confidence: 0.75, rationale: 'Alta taxa de falha' }]);
  (adaptPolicy as jest.Mock).mockReturnValue({ approved: true, policyName: 'test-policy', change: 'relax threshold', reason: 'Aprovado por aprendizado' });
});

describe('learnAnalyzeAction', () => {
  it('deve analizar padroes', () => {
    learnAnalyzeAction({});
    expect(detectPatterns).toHaveBeenCalled();
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Padrões'));
  });

  it('deve popular memoria com seed', () => {
    learnAnalyzeAction({ seed: true });
    expect(mockMemoryStore.append).toHaveBeenCalled();
  });

  it('deve retornar JSON quando solicitado', () => {
    learnAnalyzeAction({ json: true });
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });
});

describe('learnRecommendAction', () => {
  it('deve gerar recomendacoes', () => {
    learnRecommendAction({});
    expect(generateRecommendations).toHaveBeenCalled();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('review'));
  });
});

describe('learnApplyAction', () => {
  it('deve aplicar politica', () => {
    learnApplyAction('test-policy', 'relax threshold', {});
    expect(adaptPolicy).toHaveBeenCalledWith('test-policy', 'relax threshold', 0.85);
    expect(printResult).toHaveBeenCalledWith('Aprovado', true, expect.any(String));
  });
});

describe('learnCommand', () => {
  it('should be defined', () => {
    expect(learnCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = learnCommand();
    expect(cmd.name()).toBe('learn');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('analyze');
    expect(names).toContain('recommend');
    expect(names).toContain('apply');
  });
});
