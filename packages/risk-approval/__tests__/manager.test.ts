import { createRiskApprovalManager } from '../src/index';

describe('RiskApprovalManager (integration)', () => {
  const mgr = createRiskApprovalManager();

  it('assesses and creates request', () => {
    const { assessment, request } = mgr.assessAndRequest('deploy', 'severe', 'likely', 'dev', ['db-migration'], 'production', 'critical fix');
    expect(assessment.level).toBe('critical');
    expect(request.status).toBe('pending');
  });

  it('auto-approves low risk', () => {
    expect(mgr.canProceed('low', 100)).toBe(true);
    expect(mgr.canProceed('critical', 100)).toBe(false);
  });
});
