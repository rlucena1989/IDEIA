import { createTrustCalibrator } from './trust-calibrator';
import { TaskOutcome } from './types';

describe('TrustCalibrator', () => {
  const calibrator = createTrustCalibrator();
  const successOutcome: TaskOutcome = { success: true, quality: 0.9, errors: [] };
  const _failureOutcome: TaskOutcome = { success: false, quality: 0.2, errors: ['error'] };

  it('should increase trust with successful actions', () => {
    calibrator.updateTrust('agent-1', successOutcome);
    const score = calibrator.getTrustScore('agent-1');
    expect(score).toBeGreaterThan(0);
  });

  it('should track agent-specific metrics', () => {
    calibrator.updateTrust('agent-2', successOutcome);
    calibrator.updateTrust('agent-2', successOutcome);
    const metrics = calibrator.getTrustMetrics('agent-2');
    expect(metrics?.totalTasks).toBe(2);
    expect(metrics?.successes).toBe(2);
  });

  it('should cap autonomy at 2 for agents with fewer than 5 tasks', () => {
    const result = calibrator.getEffectiveAutonomy('agent-3', 4);
    expect(result).toBe(2);
  });

  it('should return default trust for unknown agents', () => {
    const score = calibrator.getTrustScore('unknown-agent');
    expect(score).toBe(0.5);
  });

  it('should list registered agents', () => {
    calibrator.updateTrust('agent-list-test', successOutcome);
    const agents = calibrator.listAgents();
    expect(agents).toContain('agent-list-test');
  });
});
