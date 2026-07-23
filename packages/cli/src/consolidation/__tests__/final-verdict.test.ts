import { describe, it, expect } from '@jest/globals';
import { createFinalVerdict } from '../final-verdict';
import { consolidateSystem } from '../consolidation-engine';

describe('final-verdict', () => {
  it('createFinalVerdict should be defined', () => {
    expect(createFinalVerdict).toBeDefined();
  });

  it('should block for blocked health', () => {
    const c = consolidateSystem({ telemetryCount: 10, alertCount: 10, failureCount: 5, policyViolationCount: 3, activeAgents: 0 });
    const v = createFinalVerdict(c);
    expect(v.status).toBe('blocked');
    expect(v.allowAutonomy).toBe(false);
  });

  it('should require human review for critical', () => {
    const c = consolidateSystem({ telemetryCount: 10, alertCount: 2, failureCount: 3, policyViolationCount: 1, activeAgents: 1 });
    const v = createFinalVerdict(c);
    expect(v.status).toBe('requires-human-review');
  });

  it('should grant autonomy for score >= 90', () => {
    const c = consolidateSystem({ telemetryCount: 10, alertCount: 0, failureCount: 0, policyViolationCount: 0, activeAgents: 5 });
    const v = createFinalVerdict(c);
    expect(v.status).toBe('ready-for-autonomy');
    expect(v.allowAutonomy).toBe(true);
  });

  it('should return health status for intermediate scores', () => {
    const c = consolidateSystem({ telemetryCount: 10, alertCount: 2, failureCount: 1, policyViolationCount: 1, activeAgents: 3 });
    const v = createFinalVerdict(c);
    expect(['healthy', 'degraded']).toContain(v.status);
  });
});
