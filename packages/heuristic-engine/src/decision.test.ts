import { DecisionEngine, createDecisionEngine } from './decision';
import { FuzzyRule, ExpertRule, DecisionOption } from './types';

describe('DecisionEngine', () => {
  let engine: DecisionEngine;

  beforeEach(() => {
    engine = createDecisionEngine();
  });

  describe('classifyRisk', () => {
    it('returns critical when impact and probability are both high', () => {
      expect(engine.classifyRisk(0.9, 0.8)).toBe('critical');
    });

    it('returns high when impact is high and probability is medium', () => {
      expect(engine.classifyRisk(0.9, 0.4)).toBe('high');
    });

    it('returns high when impact is medium and probability is high', () => {
      expect(engine.classifyRisk(0.5, 0.8)).toBe('high');
    });

    it('returns low when both impact and probability are low', () => {
      expect(engine.classifyRisk(0.1, 0.1)).toBe('low');
    });

    it('returns medium for all other combinations', () => {
      expect(engine.classifyRisk(0.5, 0.4)).toBe('medium');
    });
  });

  describe('evaluateFuzzy', () => {
    it('returns matching rule outputs', () => {
      const rule: FuzzyRule = {
        condition: { complexity: { min: 5, max: 10 } },
        output: 'complex-task',
        confidence: 0.8,
      };
      engine.addFuzzyRule(rule);
      expect(engine.evaluateFuzzy({ complexity: 7 })).toEqual(['complex-task']);
    });

    it('returns empty when no rules match', () => {
      const rule: FuzzyRule = {
        condition: { complexity: { min: 5, max: 10 } },
        output: 'complex-task',
        confidence: 0.8,
      };
      engine.addFuzzyRule(rule);
      expect(engine.evaluateFuzzy({ complexity: 2 })).toEqual([]);
    });

    it('matches multiple rules', () => {
      engine.addFuzzyRule({ condition: { a: { min: 1 } }, output: 'rule1', confidence: 0.5 });
      engine.addFuzzyRule({ condition: { b: { max: 5 } }, output: 'rule2', confidence: 0.5 });
      const results = engine.evaluateFuzzy({ a: 2, b: 3 });
      expect(results).toContain('rule1');
      expect(results).toContain('rule2');
    });
  });

  describe('evaluateExpert', () => {
    it('triggers actions when condition matches', () => {
      const rule: ExpertRule = {
        id: 'r1',
        condition: 'risk = "high"',
        actions: ['escalate', 'notify'],
        priority: 1,
        category: 'security',
      };
      engine.addExpertRule(rule);
      expect(engine.evaluateExpert({ risk: 'high' })).toEqual(['escalate', 'notify']);
    });

    it('returns empty when no condition matches', () => {
      const rule: ExpertRule = {
        id: 'r1',
        condition: 'risk = "high"',
        actions: ['escalate'],
        priority: 1,
        category: 'security',
      };
      engine.addExpertRule(rule);
      expect(engine.evaluateExpert({ risk: 'low' })).toEqual([]);
    });

    it('handles AND/OR conditions', () => {
      engine.addExpertRule({
        id: 'r1',
        condition: 'a > 5 AND b < 3',
        actions: ['complex-rule'],
        priority: 1,
        category: 'test',
      });
      expect(engine.evaluateExpert({ a: 10, b: 1 })).toEqual(['complex-rule']);
      expect(engine.evaluateExpert({ a: 10, b: 10 })).toEqual([]);
    });

    it('returns false on malformed conditions without throwing', () => {
      engine.addExpertRule({
        id: 'r1',
        condition: '!!! invalid syntax &&&',
        actions: ['should-not-run'],
        priority: 1,
        category: 'test',
      });
      expect(engine.evaluateExpert({ x: 1 })).toEqual([]);
    });
  });

  describe('decide', () => {
    it('selects the option with the highest score', () => {
      const options: DecisionOption<string>[] = [
        { id: 'a', label: 'Option A', value: 'a', score: 3, risks: [], benefits: [] },
        { id: 'b', label: 'Option B', value: 'b', score: 5, risks: [], benefits: [] },
      ];
      const result = engine.decide(options);
      expect(result.selected.id).toBe('b');
    });

    it('throws when options array is empty', () => {
      expect(() => engine.decide([])).toThrow('No options to decide from');
    });

    it('includes alternatives sorted by score', () => {
      const options: DecisionOption<string>[] = [
        { id: 'a', label: 'A', value: 'a', score: 1, risks: [], benefits: [] },
        { id: 'b', label: 'B', value: 'b', score: 5, risks: [], benefits: [] },
        { id: 'c', label: 'C', value: 'c', score: 3, risks: [], benefits: [] },
      ];
      const result = engine.decide(options);
      expect(result.alternatives.map(o => o.id)).toEqual(['c', 'a']);
    });

    it('calculates confidence between 0 and 1', () => {
      const options: DecisionOption<string>[] = [
        { id: 'a', label: 'A', value: 'a', score: 10, risks: [], benefits: [] },
        { id: 'b', label: 'B', value: 'b', score: 10, risks: [], benefits: [] },
      ];
      const result = engine.decide(options);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('setFuzzyRules / setExpertRules', () => {
    it('replaces all fuzzy rules', () => {
      engine.addFuzzyRule({ condition: { x: { min: 1 } }, output: 'old', confidence: 1 });
      engine.setFuzzyRules([{ condition: { y: { min: 1 } }, output: 'new', confidence: 1 }]);
      expect(engine.evaluateFuzzy({ x: 5 })).toEqual([]);
      expect(engine.evaluateFuzzy({ y: 5 })).toEqual(['new']);
    });

    it('replaces all expert rules', () => {
      engine.addExpertRule({ id: 'r1', condition: 'x = 1', actions: ['old'], priority: 1, category: 't' });
      engine.setExpertRules([{ id: 'r2', condition: 'x = 2', actions: ['new'], priority: 1, category: 't' }]);
      expect(engine.evaluateExpert({ x: 1 })).toEqual([]);
      expect(engine.evaluateExpert({ x: 2 })).toEqual(['new']);
    });
  });

  it('creates engine via factory function', () => {
    expect(createDecisionEngine()).toBeInstanceOf(DecisionEngine);
  });
});
