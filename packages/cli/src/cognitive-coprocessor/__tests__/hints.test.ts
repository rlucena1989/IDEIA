import { generateReasoningHints } from '../hints';
import type { ProblemDescriptor, ContextInfo, Hint } from '../types';

function makeProblem(input: string, type: ProblemDescriptor['type'] = 'numerical', domain?: string): ProblemDescriptor {
  return { type, input, domain };
}

describe('generateReasoningHints', () => {
  it('detects calculation problems', () => {
    const result = generateReasoningHints(makeProblem('calculate the sum of values'));
    expect(result.hints.length).toBeGreaterThanOrEqual(2);
    expect(result.hints.some(h => h.type === 'calculation')).toBe(true);
    expect(result.deterministicPaths).toContain('calculation-engine.executeCalculation');
  });

  it('detects statistics problems', () => {
    const result = generateReasoningHints(makeProblem('analyze stddev and variance distribution'));
    expect(result.deterministicPaths).toContain('stats-engine.summary');
    expect(result.priority).toBe(1);
  });

  it('detects physics problems', () => {
    const result = generateReasoningHints(makeProblem('força e energia cinética'));
    expect(result.deterministicPaths).toContain('physics-engine.force');
  });

  it('detects validation problems', () => {
    const result = generateReasoningHints(makeProblem('check and verify the output'));
    expect(result.deterministicPaths).toContain('cognitive-coprocessor.validateAnswer');
  });

  it('detects comparison problems', () => {
    const result = generateReasoningHints(makeProblem('compare A versus B'));
    expect(result.deterministicPaths).toContain('cognitive-coprocessor.computeMetrics');
  });

  it('detects ranking problems', () => {
    const result = generateReasoningHints(makeProblem('rank priorities by urgency'));
    expect(result.deterministicPaths).toContain('cognitive-coprocessor.rankPriorities');
  });

  it('detects simulation problems', () => {
    const result = generateReasoningHints(makeProblem('simulate what-if scenario'));
    expect(result.deterministicPaths).toContain('cognitive-coprocessor.simulateOutcomes');
  });

  it('falls back to general for unknown input', () => {
    const result = generateReasoningHints(makeProblem('hello world'));
    expect(result.deterministicPaths).toContain('cognitive-coprocessor.normalizeInput');
  });

  it('detects numbers in general input', () => {
    const result = generateReasoningHints(makeProblem('analyze 42 items'));
    expect(result.deterministicPaths).toContain('cognitive-coprocessor.computeMetrics');
  });

  it('includes threshold hints when context has thresholds', () => {
    const ctx: ContextInfo = { thresholds: { maxTemp: 100, minTemp: 0 } };
    const result = generateReasoningHints(makeProblem('check temperature'), ctx);
    const thresholdHints = result.hints.filter(h => h.message.includes('thresholds'));
    expect(thresholdHints.length).toBeGreaterThanOrEqual(1);
  });

  it('sorts hints by priority ascending', () => {
    const result = generateReasoningHints(makeProblem('calculate sum'));
    for (let i = 1; i < result.hints.length; i++) {
      expect(result.hints[i].priority).toBeGreaterThanOrEqual(result.hints[i - 1].priority);
    }
  });

  it('deduplicates deterministic paths', () => {
    const result = generateReasoningHints(makeProblem('check and validate'));
    const unique = new Set(result.deterministicPaths);
    expect(result.deterministicPaths.length).toBe(unique.size);
  });

  it('falls back with hints for empty input', () => {
    const result = generateReasoningHints(makeProblem(''));
    expect(result.hints.length).toBeGreaterThanOrEqual(1);
    expect(result.deterministicPaths).toContain('cognitive-coprocessor.normalizeInput');
  });
});
