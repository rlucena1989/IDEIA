import { describe, it, expect } from '@jest/globals';
import { createCorrectionAction, applySelfCorrection } from '../self-correction-engine';

describe('self-correction-engine', () => {
  it('createCorrectionAction should be defined', () => {
    expect(createCorrectionAction).toBeDefined();
  });

  it('should create action with id', () => {
    const a = createCorrectionAction('Reindex cache', true);
    expect(a.actionId).toBeDefined();
    expect(a.allowed).toBe(true);
  });

  it('applySelfCorrection should set appliedAt for allowed', () => {
    const actions = [
      createCorrectionAction('A1', true),
      createCorrectionAction('A2', false),
    ];
    const result = applySelfCorrection(actions);
    expect(result[0].appliedAt).toBeDefined();
    expect(result[1].appliedAt).toBeUndefined();
  });
});
