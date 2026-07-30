import { describe, it, expect } from '@jest/globals';
import { DecisionAnalyzer, createDecisionAnalyzer } from '../src/decision-analyzer';

describe('DecisionAnalyzer', () => {
  it('should create via factory', () => {
    const analyzer = createDecisionAnalyzer();
    expect(analyzer).toBeInstanceOf(DecisionAnalyzer);
  });

  it('should record and analyze decisions', () => {
    const analyzer = new DecisionAnalyzer();
    analyzer.recordDecision({ text: 'Use Express for API', action: 'framework_choice', source: 'architect', outcome: 'approved', confidence: 0.9 });
    analyzer.recordDecision({ text: 'Use Express for API', action: 'framework_choice', source: 'architect', outcome: 'approved', confidence: 0.9 });
    analyzer.recordDecision({ text: 'Use Express for API', action: 'framework_choice', source: 'architect', outcome: 'approved', confidence: 0.9 });
    const analysis = analyzer.analyze();
    expect(analysis.totalDecisions).toBe(3);
    expect(analysis.patterns.length).toBeGreaterThanOrEqual(1);
  });

  it('should return recent decisions in reverse order', () => {
    const analyzer = new DecisionAnalyzer();
    analyzer.recordDecision({ text: 'First', action: 'a', source: 'test', confidence: 0.5 });
    analyzer.recordDecision({ text: 'Second', action: 'b', source: 'test', confidence: 0.5 });
    const recent = analyzer.getRecentDecisions(2);
    expect(recent[0].text).toBe('Second');
    expect(recent[1].text).toBe('First');
  });

  it('should filter decisions by source', () => {
    const analyzer = new DecisionAnalyzer();
    analyzer.recordDecision({ text: 'Arch decision', action: 'a', source: 'architect', confidence: 0.9 });
    analyzer.recordDecision({ text: 'Dev decision', action: 'b', source: 'developer', confidence: 0.7 });
    const arch = analyzer.getDecisionsBySource('architect');
    expect(arch.length).toBe(1);
    expect(arch[0].text).toBe('Arch decision');
  });

  it('should filter decisions by action', () => {
    const analyzer = new DecisionAnalyzer();
    analyzer.recordDecision({ text: 'Choice A', action: 'framework_choice', source: 'test', confidence: 0.8 });
    analyzer.recordDecision({ text: 'Choice B', action: 'deploy_strategy', source: 'test', confidence: 0.8 });
    const frameworks = analyzer.getDecisionsByAction('framework_choice');
    expect(frameworks.length).toBe(1);
  });

  it('should clear all data', () => {
    const analyzer = new DecisionAnalyzer();
    analyzer.recordDecision({ text: 'Test decision', action: 'a', source: 'test', confidence: 0.5 });
    expect(analyzer.decisionCount).toBe(1);
    analyzer.clear();
    expect(analyzer.decisionCount).toBe(0);
    expect(analyzer.isDirty()).toBe(true);
  });

  it('should cap decisions at 10000', () => {
    const analyzer = new DecisionAnalyzer();
    for (let i = 0; i < 12000; i++) {
      analyzer.recordDecision({ text: `Decision ${i}`, action: 'test', source: 'test', confidence: 0.5 });
    }
    expect(analyzer.decisionCount).toBeLessThanOrEqual(10000);
  });

  it('should return patterns', () => {
    const analyzer = new DecisionAnalyzer();
    analyzer.recordDecision({ text: 'Use React for UI', action: 'ui_choice', source: 'architect', confidence: 0.9 });
    analyzer.recordDecision({ text: 'Use React for UI', action: 'ui_choice', source: 'architect', confidence: 0.9 });
    analyzer.recordDecision({ text: 'Use React for UI', action: 'ui_choice', source: 'architect', confidence: 0.9 });
    analyzer.recordDecision({ text: 'Use React for UI', action: 'ui_choice', source: 'architect', confidence: 0.9 });
    analyzer.analyze();
    const patterns = analyzer.getPatterns();
    expect(patterns.length).toBeGreaterThanOrEqual(1);
    expect(patterns[0].frequency).toBeGreaterThanOrEqual(3);
  });
});
