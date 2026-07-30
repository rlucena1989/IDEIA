import { HumanInTheLoop } from '../src/human-loop';

describe('HumanInTheLoop', () => {
  it('creates approval request', () => {
    const h = new HumanInTheLoop(0);
    const a = h.requestApproval('deploy.production', 'Deploy to prod', 'critical', 'agent-1');
    expect(a.id).toBeDefined();
    expect(a.status).toBe('pending');
    expect(a.requiredRole).toBe('security');
  });

  it('approves request', () => {
    const h = new HumanInTheLoop(0);
    const a = h.requestApproval('deploy.production', 'test', 'critical', 'agent');
    const r = h.approve(a.id, 'user-1', 'ok');
    expect(r!.approved).toBe(true);
    expect(r!.approvedBy).toBe('user-1');
    expect(h.getStatus(a.id)).toBe('approved');
  });

  it('rejects request', () => {
    const h = new HumanInTheLoop(0);
    const a = h.requestApproval('data.delete', 'test', 'high', 'agent');
    const r = h.reject(a.id, 'not safe', 'user-2');
    expect(r!.approved).toBe(false);
    expect(h.getStatus(a.id)).toBe('rejected');
  });

  it('timeout after configured ms', async () => {
    const h = new HumanInTheLoop(10);
    h.requestApproval('deploy.production', 'test', 'critical', 'agent');
    expect(h.getPendingApprovals().length).toBe(1);
    await new Promise(r => setTimeout(r, 30));
    expect(h.getPendingApprovals().length).toBe(0);
    const completed = h.getCompletedApprovals();
    expect(completed.some(c => !c.approved && c.reason !== undefined)).toBe(true);
  });

  it('getPendingByRole filters by role', () => {
    const h = new HumanInTheLoop(0);
    h.requestApproval('deploy.production', 'prod', 'critical', 'a');
    h.requestApproval('config.global', 'config', 'low', 'b');
    expect(h.getPendingByRole('security').length).toBe(1);
    expect(h.getPendingByRole('dev').length).toBe(1);
  });

  it('getStatus returns not_found for unknown', () => {
    const h = new HumanInTheLoop(0);
    expect(h.getStatus('nonexistent')).toBe('not_found');
  });

  it('isCriticalAction detects critical types', () => {
    const h = new HumanInTheLoop(0);
    expect(h.isCriticalAction('deploy.production')).toBe(true);
    expect(h.isCriticalAction('policy.modify')).toBe(true);
    expect(h.isCriticalAction('data.delete')).toBe(true);
    expect(h.isCriticalAction('secrets.access')).toBe(true);
    expect(h.isCriticalAction('user.create.admin')).toBe(true);
    expect(h.isCriticalAction('file.read')).toBe(false);
    expect(h.isCriticalAction('chat.message')).toBe(false);
  });

  it('enforce returns requiresApproval for critical actions', () => {
    const h = new HumanInTheLoop(0);
    const r = h.enforce('deploy.production', 'Deploy to production');
    expect(r.requiresApproval).toBe(true);
    expect(r.action).toBeDefined();
  });

  it('enforce returns true for deploy.* actions', () => {
    const h = new HumanInTheLoop(0);
    const r = h.enforce('deploy.staging', 'Deploy to staging');
    expect(r.requiresApproval).toBe(true);
  });

  it('enforce returns false for non-critical actions', () => {
    const h = new HumanInTheLoop(0);
    const r = h.enforce('file.read', 'Read file');
    expect(r.requiresApproval).toBe(false);
  });

  it('enforce skips approval when skipApproval is true', () => {
    const h = new HumanInTheLoop(0);
    const r = h.enforce('deploy.production', 'Deploy', { skipApproval: true });
    expect(r.requiresApproval).toBe(false);
    expect(r.override).toBe(true);
  });

  it('clearCompleted removes completed approvals', () => {
    const h = new HumanInTheLoop(0);
    const a = h.requestApproval('data.delete', 'del', 'high', 'a');
    h.reject(a.id, 'no');
    expect(h.getCompletedApprovals().length).toBe(1);
    h.clearCompleted();
    expect(h.getCompletedApprovals().length).toBe(0);
  });
});
