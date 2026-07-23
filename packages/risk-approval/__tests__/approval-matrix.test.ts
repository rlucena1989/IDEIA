import { ApprovalMatrix } from '../src/approval-matrix';

describe('ApprovalMatrix', () => {
  const matrix = new ApprovalMatrix();

  it('returns requirements per risk level', () => {
    const req = matrix.getRequirement('critical');
    expect(req.requiredApprovals).toContain('security');
    expect(req.autoApprove).toBe(false);
  });

  it('creates approval request', () => {
    const req = matrix.createRequest('deploy to prod', 'critical', 'dev-user', 'emergency fix');
    expect(req.status).toBe('pending');
    expect(req.approvals.length).toBe(3);
  });

  it('auto-approves low risk (no approvals needed)', () => {
    const req = matrix.createRequest('simple task', 'low', 'dev');
    expect(req.status).toBe('approved');
    expect(req.approvals.length).toBe(0);
  });

  it('approves high risk when all approvals met', () => {
    let req = matrix.createRequest('complex task', 'high', 'dev');
    req = matrix.approve(req, 'supervisor', 'lead');
    req = matrix.approve(req, 'manager', 'cto');
    expect(req.status).toBe('approved');
  });

  it('rejects and blocks', () => {
    let req = matrix.createRequest('dangerous', 'critical', 'dev');
    req = matrix.reject(req, 'supervisor', 'lead', 'too risky');
    expect(req.status).toBe('rejected');
  });

  it('auto-approves low risk small tasks', () => {
    expect(matrix.canAutoApprove('low', 100)).toBe(true);
    expect(matrix.canAutoApprove('critical', 100)).toBe(false);
  });
});
