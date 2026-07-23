import { describe, it, expect } from '@jest/globals';
import { predictRisk } from '../predictor-engine';
import { createPredictionInput } from '../prediction-types';

describe('predictor-engine', () => {
  it('predictRisk should be defined', () => {
    expect(predictRisk).toBeDefined();
  });

  it('should return low risk for clean input', () => {
    const input = createPredictionInput({
      target: 'system-a',
      historyScore: [1, 2, 1],
      driftScore: [0],
      alertCount: [0],
      failureCount: [0],
    });
    const result = predictRisk(input);
    expect(result.riskLevel).toBe('low');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should return critical risk for high failure count', () => {
    const input = createPredictionInput({
      target: 'system-b',
      historyScore: [5, 5],
      driftScore: [5],
      alertCount: [5],
      failureCount: [8],
    });
    const result = predictRisk(input);
    expect(result.riskLevel).toBe('critical');
  });

  it('should calculate confidence from history size', () => {
    const small = predictRisk(createPredictionInput({ target: 't', historyScore: [1] }));
    const large = predictRisk(createPredictionInput({ target: 't', historyScore: [1, 2, 3, 4, 5] }));
    expect(large.confidence).toBeGreaterThan(small.confidence);
  });
});
