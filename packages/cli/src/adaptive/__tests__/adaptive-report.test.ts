import { describe, it, expect } from '@jest/globals';
import { buildAdaptiveReport } from '../adaptive-report';
import { OperationalEvent, OperationalPattern } from '../pattern-types';
import { AdaptiveScores } from '../adaptive-score';
import { Recommendation } from '../recommendation-engine';
import { CycleControlResult } from '../cycle-controller';

describe('adaptive-report', () => {
  const makeEvent = (): OperationalEvent => ({
    eventId: 'e1', type: 'state', command: 'check',
    outcome: 'ok', createdAt: new Date().toISOString(),
  });

  const makePattern = (): OperationalPattern => ({
    patternId: 'p1', name: 'P1', description: '', frequency: 1,
    confidence: 0.9, impact: 'medium', triggers: [], recommendedAction: 'sync',
  });

  const scores: AdaptiveScores = {
    consistencyWeight: 1.2, hardeningWeight: 1.0,
    generationWeight: 0.95, evolutionWeight: 1.05,
  };

  const recommendations: Recommendation[] = [{
    action: 'sync', reason: 'Stable', confidence: 0.95, priority: 'low',
  }];

  const cycleControl: CycleControlResult = {
    shouldRepeat: false, shouldEscalate: false,
    nextAction: 'stop', notes: ['Normal cycle.'],
  };

  it('should build report with all data', () => {
    const report = buildAdaptiveReport({
      events: [makeEvent()],
      patterns: [makePattern()],
      scores,
      recommendations,
      cycleControl,
    });
    expect(report.eventCount).toBe(1);
    expect(report.patterns).toHaveLength(1);
    expect(report.adaptiveScores.consistencyWeight).toBeCloseTo(1.2);
    expect(report.recommendations).toHaveLength(1);
    expect(report.cycleControl.nextAction).toBe('stop');
    expect(report.generatedAt).toBeDefined();
  });

  it('should generate summary with key info', () => {
    const report = buildAdaptiveReport({
      events: [makeEvent(), makeEvent()],
      patterns: [makePattern()],
      scores,
      recommendations,
      cycleControl,
    });
    expect(report.summary).toContain('2 evento(s) analisado(s)');
    expect(report.summary).toContain('1 padrão(ões) detectado(s)');
    expect(report.summary.some(s => s.startsWith('Ciclo:'))).toBe(true);
  });

  it('should handle empty arrays', () => {
    const report = buildAdaptiveReport({
      events: [], patterns: [], scores, recommendations: [], cycleControl,
    });
    expect(report.eventCount).toBe(0);
    expect(report.summary.some(s => s.includes('0 evento(s)'))).toBe(true);
  });

  it('should escalate summary when cycle escalates', () => {
    const escalate: CycleControlResult = {
      shouldRepeat: true, shouldEscalate: true,
      nextAction: 'block', notes: ['Critical!', 'Escalation required.'],
    };
    const report = buildAdaptiveReport({
      events: [], patterns: [], scores, recommendations, cycleControl: escalate,
    });
    expect(report.cycleControl.shouldEscalate).toBe(true);
    expect(report.summary.some(s => s.includes('escalate: true'))).toBe(true);
  });
});
