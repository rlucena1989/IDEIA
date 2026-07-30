import {
  calculateRiskScore,
  formatRiskProfile,
  getEffectiveAutonomyLevel,
  shouldAutoExecute,
  shouldRequestHumanDecision,
  shouldRetry,
  adaptAutonomyForPhase,
  calculateSystemConfidence,
  buildAutonomySummary,
  AutonomyConfig,
} from '../autonomy-policy';
import { TaskNode } from '../orchestration-types';
import { RiskScore } from '../autonomy-policy';

function makeTask(overrides: Partial<TaskNode> = {}): TaskNode {
  return {
    id: 't1',
    name: 'Test Task',
    description: 'A test task',
    phase: 'diagnosis',
    status: 'ready',
    dependsOn: [],
    blockedBy: [],
    riskLevel: 'low',
    estimatedEffort: 'hours',
    canParallelize: false,
    isDeterministic: true,
    requiresLLM: false,
    requiredModelTier: 'local',
    ...overrides,
  };
}

describe('calculateRiskScore', () => {
  it('should return low score for low-risk deterministic task', () => {
    const task = makeTask({ riskLevel: 'low', estimatedEffort: 'hours', dependsOn: [], isDeterministic: true, requiresLLM: false, phase: 'diagnosis' });
    const result = calculateRiskScore(task);
    expect(result.score).toBeLessThanOrEqual(33);
    expect(result.level).toBe('low');
    expect(result.factors).toHaveLength(6);
  });

  it('should return high score for high-risk non-deterministic task', () => {
    const task = makeTask({ riskLevel: 'high', estimatedEffort: 'days', dependsOn: ['a', 'b', 'c'], isDeterministic: false, requiresLLM: true, phase: 'industrial-autonomy' });
    const result = calculateRiskScore(task);
    expect(result.score).toBeGreaterThan(66);
    expect(result.level).toBe('high');
  });

  it('should return medium score for mixed risk task', () => {
    const task = makeTask({ riskLevel: 'medium', estimatedEffort: 'days', dependsOn: ['a', 'b'], isDeterministic: false, requiresLLM: true, phase: 'parallelization' });
    const result = calculateRiskScore(task);
    expect(result.score).toBeGreaterThanOrEqual(34);
    expect(result.score).toBeLessThanOrEqual(66);
    expect(result.level).toBe('medium');
  });

  it('should include riskLevel factor with highest weight', () => {
    const task = makeTask({ riskLevel: 'high' });
    const result = calculateRiskScore(task);
    const riskFactor = result.factors.find(f => f.name === 'riskLevel')!;
    expect(riskFactor.weight).toBe(0.4);
    expect(riskFactor.score).toBe(85);
  });

  it('should handle unknown effort gracefully', () => {
    const task = makeTask({ estimatedEffort: 'minutes' as 'hours' });
    const result = calculateRiskScore(task);
    const effortFactor = result.factors.find(f => f.name === 'estimatedEffort')!;
    expect(effortFactor.score).toBe(30);
  });

  it('should handle unknown phase gracefully', () => {
    const task = makeTask({ phase: 'unknown' as any });
    const result = calculateRiskScore(task);
    const phaseFactor = result.factors.find(f => f.name === 'phase')!;
    expect(phaseFactor.score).toBe(50);
  });
});

describe('formatRiskProfile', () => {
  it('should format low risk profile correctly', () => {
    const riskScore: RiskScore = { score: 20, level: 'low', factors: [{ name: 'a', weight: 0.5, score: 20, contribution: 10 }] };
    expect(formatRiskProfile(riskScore)).toContain('Risco 20/100 (BAIXO)');
  });

  it('should format medium risk profile correctly', () => {
    const riskScore: RiskScore = { score: 55, level: 'medium', factors: [{ name: 'a', weight: 0.5, score: 55, contribution: 27.5 }] };
    expect(formatRiskProfile(riskScore)).toContain('Risco 55/100 (MEDIO)');
  });

  it('should format high risk profile correctly', () => {
    const riskScore: RiskScore = { score: 85, level: 'high', factors: [{ name: 'a', weight: 0.5, score: 85, contribution: 42.5 }] };
    expect(formatRiskProfile(riskScore)).toContain('Risco 85/100 (ALTO)');
  });

  it('should include top 3 factors sorted by contribution', () => {
    const riskScore: RiskScore = {
      score: 50, level: 'medium',
      factors: [
        { name: 'riskLevel', weight: 0.4, score: 55, contribution: 22 },
        { name: 'estimatedEffort', weight: 0.15, score: 60, contribution: 9 },
        { name: 'dependsOn', weight: 0.15, score: 50, contribution: 7.5 },
        { name: 'requiresLLM', weight: 0.1, score: 40, contribution: 4 },
      ],
    };
    const formatted = formatRiskProfile(riskScore);
    expect(formatted).toMatch(/Fatores:.*riskLevel\(55\).*estimatedEffort\(60\).*dependsOn\(50\)/);
  });
});

describe('getEffectiveAutonomyLevel', () => {
  it('should return blocked when failure rate > 0.5', () => {
    expect(getEffectiveAutonomyLevel({}, 0.9, 0.6)).toBe('blocked');
  });

  it('should return blocked when risk score >= 85', () => {
    expect(getEffectiveAutonomyLevel({}, 0.9, 0, 85)).toBe('blocked');
    expect(getEffectiveAutonomyLevel({}, 0.9, 0, 90)).toBe('blocked');
  });

  it('should return guided when risk score 60-84 and confidence < 0.7', () => {
    expect(getEffectiveAutonomyLevel({}, 0.6, 0, 70)).toBe('guided');
  });

  it('should return baseLevel when risk score < 60 and confidence >= 0.7', () => {
    expect(getEffectiveAutonomyLevel({}, 0.7, 0, 30)).toBe('guided');
  });

  it('should return guided when confidence below threshold', () => {
    expect(getEffectiveAutonomyLevel({}, 0.5, 0)).toBe('guided');
  });

  it('should return baseLevel when all conditions met', () => {
    const config: Partial<AutonomyConfig> = { baseLevel: 'autonomous', confidenceThreshold: 0.7 };
    expect(getEffectiveAutonomyLevel(config, 0.9, 0)).toBe('autonomous');
  });

  it('should return blocked when risk score >= 85 even with high confidence', () => {
    expect(getEffectiveAutonomyLevel({}, 0.95, 0, 100)).toBe('blocked');
  });

  it('should return guided when risk score 60-84 even with high confidence but config threshold is higher', () => {
    expect(getEffectiveAutonomyLevel({ confidenceThreshold: 0.8 }, 0.7, 0, 70)).toBe('guided');
  });
});

describe('shouldAutoExecute', () => {
  it('should return false when risk score >= 85', () => {
    const task = makeTask();
    expect(shouldAutoExecute(task, 'guided', {}, 85)).toBe(false);
    expect(shouldAutoExecute(task, 'guided', {}, 100)).toBe(false);
  });

  it('should return false when autonomy level is blocked', () => {
    expect(shouldAutoExecute(makeTask(), 'blocked')).toBe(false);
  });

  it('should return true when autonomy level is autonomous', () => {
    expect(shouldAutoExecute(makeTask(), 'autonomous')).toBe(true);
  });

  it('should return true when risk score < 60', () => {
    expect(shouldAutoExecute(makeTask({ riskLevel: 'medium' }), 'guided', {}, 30)).toBe(true);
  });

  it('should return false for high risk tasks', () => {
    expect(shouldAutoExecute(makeTask({ riskLevel: 'high' }), 'guided')).toBe(false);
  });

  it('should return false for medium risk with guided autonomy', () => {
    expect(shouldAutoExecute(makeTask({ riskLevel: 'medium' }), 'guided')).toBe(false);
  });

  it('should use autoExecuteRiskThreshold for low risk comparison', () => {
    const task = makeTask({ riskLevel: 'low' });
    expect(shouldAutoExecute(task, 'guided', { autoExecuteRiskThreshold: 'low' })).toBe(true);
    expect(shouldAutoExecute(task, 'guided', { autoExecuteRiskThreshold: 'high' })).toBe(true);
  });

  it('should return true for low risk task when threshold is low', () => {
    const task = makeTask({ riskLevel: 'low' });
    expect(shouldAutoExecute(task, 'guided', { autoExecuteRiskThreshold: 'low' })).toBe(true);
  });

  it('should return false for low risk task when threshold is exceeded', () => {
    const task = makeTask({ riskLevel: 'medium' });
    expect(shouldAutoExecute(task, 'guided', { autoExecuteRiskThreshold: 'low' })).toBe(false);
  });
});

describe('shouldRequestHumanDecision', () => {
  it('should return false when autonomous', () => {
    expect(shouldRequestHumanDecision(makeTask(), 'autonomous')).toBe(false);
  });

  it('should return true when blocked', () => {
    expect(shouldRequestHumanDecision(makeTask(), 'blocked')).toBe(true);
  });

  it('should return true for high risk tasks', () => {
    expect(shouldRequestHumanDecision(makeTask({ riskLevel: 'high' }), 'guided')).toBe(true);
  });

  it('should return true for phases requiring validation', () => {
    expect(shouldRequestHumanDecision(makeTask({ phase: 'full-autonomous' }), 'guided')).toBe(true);
    expect(shouldRequestHumanDecision(makeTask({ phase: 'industrial-autonomy' }), 'guided')).toBe(true);
    expect(shouldRequestHumanDecision(makeTask({ phase: 'diagnosis' }), 'guided')).toBe(true);
  });

  it('should return false for phases not requiring validation', () => {
    expect(shouldRequestHumanDecision(makeTask({ phase: 'structuring', riskLevel: 'low' }), 'guided')).toBe(false);
  });
});

describe('shouldRetry', () => {
  it('should return true when attempt < maxRetries', () => {
    expect(shouldRetry(0, makeTask())).toBe(true);
    expect(shouldRetry(1, makeTask())).toBe(true);
  });

  it('should return false when attempt >= maxRetries', () => {
    expect(shouldRetry(2, makeTask())).toBe(false);
    expect(shouldRetry(3, makeTask())).toBe(false);
  });

  it('should return false when autoRetryOnFailure is false', () => {
    expect(shouldRetry(0, makeTask(), { autoRetryOnFailure: false })).toBe(false);
  });

  it('should respect custom maxRetries', () => {
    expect(shouldRetry(2, makeTask(), { autoRetryOnFailure: true, maxRetries: 5 })).toBe(true);
    expect(shouldRetry(5, makeTask(), { autoRetryOnFailure: true, maxRetries: 5 })).toBe(false);
  });
});

describe('adaptAutonomyForPhase', () => {
  it('should return blocked when confidence < 0.3', () => {
    expect(adaptAutonomyForPhase('diagnosis', 0.2, 0, 10)).toBe('blocked');
  });

  it('should return guided when confidence < 0.6', () => {
    expect(adaptAutonomyForPhase('diagnosis', 0.5, 5, 10)).toBe('guided');
  });

  it('should return guided when progress < 0.3', () => {
    expect(adaptAutonomyForPhase('diagnosis', 0.8, 1, 10)).toBe('guided');
  });

  it('should return autonomous when progress >= 0.3 and confidence >= 0.6', () => {
    expect(adaptAutonomyForPhase('diagnosis', 0.8, 5, 10)).toBe('autonomous');
  });

  it('should handle zero total tasks gracefully', () => {
    expect(adaptAutonomyForPhase('diagnosis', 0.8, 0, 0)).toBe('guided');
  });
});

describe('calculateSystemConfidence', () => {
  it('should calculate correct weighted score', () => {
    const result = calculateSystemConfidence(1, 100, 1);
    expect(result).toBe(1);
  });

  it('should handle partial scores', () => {
    const result = calculateSystemConfidence(0.5, 50, 0.5);
    expect(result).toBeCloseTo(0.5, 5);
  });

  it('should give more weight to success rate', () => {
    const highSuccess = calculateSystemConfidence(1, 0, 0);
    const highQuality = calculateSystemConfidence(0, 100, 0);
    const highCheckpoint = calculateSystemConfidence(0, 0, 1);
    expect(highSuccess).toBeGreaterThan(highQuality);
    expect(highSuccess).toBeGreaterThan(highCheckpoint);
  });

  it('should handle zero values', () => {
    expect(calculateSystemConfidence(0, 0, 0)).toBe(0);
  });
});

describe('buildAutonomySummary', () => {
  it('should format autonomous level', () => {
    const summary = buildAutonomySummary('autonomous', 0.85);
    expect(summary).toContain('autonoma');
    expect(summary).toContain('confianca: 85%');
  });

  it('should format guided level', () => {
    const summary = buildAutonomySummary('guided', 0.7);
    expect(summary).toContain('guiada');
    expect(summary).toContain('confianca: 70%');
  });

  it('should format blocked level', () => {
    const summary = buildAutonomySummary('blocked', 0.3);
    expect(summary).toContain('bloqueada');
    expect(summary).toContain('confianca: 30%');
  });
});
