import { describe, it, expect } from '@jest/globals';
import { recommendPrevention } from '../preventive-recommender';
import { predictRisk } from '../predictor-engine';
import { createPredictionInput } from '../prediction-types';

describe('preventive-recommender', () => {
  it('recommendPrevention should be defined', () => {
    expect(recommendPrevention).toBeDefined();
  });

  it('should return normal supervision for low risk', () => {
    const prediction = predictRisk(createPredictionInput({
      target: 't', historyScore: [1], driftScore: [0], alertCount: [0], failureCount: [0],
    }));
    const actions = recommendPrevention(prediction);
    expect(actions).toContain('Continue normal supervision');
  });

  it('should return human review for critical risk', () => {
    const prediction = predictRisk(createPredictionInput({
      target: 't', historyScore: [5], driftScore: [5], alertCount: [5], failureCount: [8],
    }));
    const actions = recommendPrevention(prediction);
    expect(actions).toContain('Trigger human review');
    expect(actions).toContain('Run preventive maintenance immediately');
  });

  it('should return monitoring for moderate risk', () => {
    const prediction = predictRisk(createPredictionInput({
      target: 't', historyScore: [3], driftScore: [3], alertCount: [2], failureCount: [0],
    }));
    const actions = recommendPrevention(prediction);
    expect(actions).toContain('Watch trend closely');
  });
});
