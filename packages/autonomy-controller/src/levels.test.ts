import { createLevelDeterminer, AUTONOMY_LIMITS, LEVEL_NAMES } from './levels';
import { AutonomyLevel } from './types';

describe('LevelDeterminer', () => {
  const determiner = createLevelDeterminer();

  it('should return level 0 for high-risk contexts', () => {
    const level = determiner.determine({
      taskRisk: 1, reversibility: 0, dataSensitivity: 1,
      historicalSuccess: 0, taskSimilarity: 0, userTrustScore: 0,
      environment: 'production', projectMaturity: 0, hasRollback: false,
      maxAutonomyLevel: 4, requiresApproval: [],
    });
    expect(level).toBe(0);
  });

  it('should return level 4 for optimal contexts', () => {
    const level = determiner.determine({
      taskRisk: 0, reversibility: 1, dataSensitivity: 0,
      historicalSuccess: 1, taskSimilarity: 1, userTrustScore: 1,
      environment: 'dev', projectMaturity: 1, hasRollback: true,
      maxAutonomyLevel: 4, requiresApproval: [],
    });
    expect(level).toBe(4);
  });

  it('should have limits defined for all numeric levels', () => {
    const levels: AutonomyLevel[] = [0, 1, 2, 3, 4];
    for (const level of levels) {
      expect(AUTONOMY_LIMITS[level]).toBeDefined();
      expect(AUTONOMY_LIMITS[level].maxTokensConsumed).toBeGreaterThan(0);
    }
  });

  it('should increase limits with higher levels', () => {
    expect(AUTONOMY_LIMITS[4].maxTokensConsumed).toBeGreaterThan(AUTONOMY_LIMITS[0].maxTokensConsumed);
    expect(AUTONOMY_LIMITS[4].maxFilesChanged).toBeGreaterThan(AUTONOMY_LIMITS[0].maxFilesChanged);
  });

  it('should map numeric levels to names', () => {
    expect(LEVEL_NAMES[0]).toBe('Assisted');
    expect(LEVEL_NAMES[4]).toBe('Total Autonomous');
  });

  it('should respect maxAutonomyLevel cap', () => {
    const level = determiner.determine({
      taskRisk: 0, reversibility: 1, dataSensitivity: 0,
      historicalSuccess: 1, taskSimilarity: 1, userTrustScore: 1,
      environment: 'dev', projectMaturity: 1, hasRollback: true,
      maxAutonomyLevel: 2, requiresApproval: [],
    });
    expect(level).toBeLessThanOrEqual(2);
  });
});
