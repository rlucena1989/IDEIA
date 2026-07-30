import { DecisionEngine, createDecisionEngine } from '../src/decision';
import {   DecisionOption } from '../src/types';

describe('DecisionEngine Extended', () => {
  let engine: DecisionEngine;

  beforeEach(() => {
    engine = createDecisionEngine();
  });

  it('should handle edge case scores in classifyRisk', () => {
    expect(engine.classifyRisk(0, 0)).toBe('low');
    expect(engine.classifyRisk(1, 1)).toBe('critical');
    expect(engine.classifyRisk(0.3, 0.19)).toBe('low');
    expect(engine.classifyRisk(0.69, 0.59)).toBe('medium');
  });

  it('should evaluate empty fuzzy rules', () => {
    const results = engine.evaluateFuzzy({ test: 1 });
    expect(results).toEqual([]);
  });

  it('should evaluate fuzzy rules with only min constraint', () => {
    engine.addFuzzyRule({ condition: { x: { min: 5 } }, output: 'big', confidence: 0.8 });
    expect(engine.evaluateFuzzy({ x: 10 })).toEqual(['big']);
    expect(engine.evaluateFuzzy({ x: 3 })).toEqual([]);
  });

  it('should evaluate fuzzy rules with only max constraint', () => {
    engine.addFuzzyRule({ condition: { x: { max: 5 } }, output: 'small', confidence: 0.8 });
    expect(engine.evaluateFuzzy({ x: 3 })).toEqual(['small']);
    expect(engine.evaluateFuzzy({ x: 10 })).toEqual([]);
  });

  it('should handle missing input keys in fuzzy rules', () => {
    engine.addFuzzyRule({ condition: { missing: { min: 1 } }, output: 'cant-match', confidence: 0.5 });
    const results = engine.evaluateFuzzy({ other: 5 });
    expect(results).toEqual([]);
  });

  it('should evaluate expert rules with AND conditions', () => {
    engine.addExpertRule({ id: 'r1', condition: 'status = "active" AND role = "admin"', actions: ['grant'], priority: 1, category: 'auth' });
    expect(engine.evaluateExpert({ status: 'active', role: 'admin' })).toEqual(['grant']);
    expect(engine.evaluateExpert({ status: 'active', role: 'user' })).toEqual([]);
  });

  it('should evaluate expert rules with OR conditions', () => {
    engine.addExpertRule({ id: 'r1', condition: 'role = "admin" OR role = "owner"', actions: ['elevate'], priority: 1, category: 'auth' });
    expect(engine.evaluateExpert({ role: 'admin' })).toEqual(['elevate']);
    expect(engine.evaluateExpert({ role: 'owner' })).toEqual(['elevate']);
    expect(engine.evaluateExpert({ role: 'viewer' })).toEqual([]);
  });

  it('should handle numeric comparisons in expert rules', () => {
    engine.addExpertRule({ id: 'r1', condition: 'score > 80', actions: ['approve'], priority: 1, category: 'quality' });
    expect(engine.evaluateExpert({ score: 90 })).toEqual(['approve']);
    expect(engine.evaluateExpert({ score: 70 })).toEqual([]);
  });

  it('should return multiple actions from a single matching rule', () => {
    engine.addExpertRule({ id: 'r1', condition: 'error = "critical"', actions: ['alert', 'log', 'escalate'], priority: 1, category: 'ops' });
    const actions = engine.evaluateExpert({ error: 'critical' });
    expect(actions).toEqual(['alert', 'log', 'escalate']);
  });

  it('should handle single option decision', () => {
    const options: DecisionOption<string>[] = [{ id: 'a', label: 'Only', value: 'x', score: 1, risks: [], benefits: [] }];
    const result = engine.decide(options);
    expect(result.selected.id).toBe('a');
    expect(result.alternatives).toEqual([]);
    expect(result.confidence).toBe(1);
  });

  it('should include rationale in decision result', () => {
    const options: DecisionOption<string>[] = [
      { id: 'a', label: 'Best', value: 'x', score: 9, risks: [], benefits: [] },
      { id: 'b', label: 'Worst', value: 'y', score: 1, risks: [], benefits: [] },
    ];
    const result = engine.decide(options);
    expect(result.rationale).toContain('Best');
    expect(result.rationale).toContain('score');
  });

  it('should handle expert rules matching empty context', () => {
    engine.addExpertRule({ id: 'r1', condition: 'flag = true', actions: ['trigger'], priority: 1, category: 't' });
    const actions = engine.evaluateExpert({});
    expect(actions).toEqual([]);
  });

  it('should support boolean context values', () => {
    engine.addExpertRule({ id: 'r1', condition: 'enabled = true', actions: ['run'], priority: 1, category: 't' });
    expect(engine.evaluateExpert({ enabled: true })).toEqual(['run']);
    expect(engine.evaluateExpert({ enabled: false })).toEqual([]);
  });
});