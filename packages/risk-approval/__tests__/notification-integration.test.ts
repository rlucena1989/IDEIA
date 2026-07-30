import { createRiskApprovalManager, RiskApprovalManager, RiskApprovalNotificationEvent } from '../src/index';

describe('RiskApprovalManager — Notification Integration', () => {
  let events: RiskApprovalNotificationEvent[];

  beforeEach(() => {
    events = [];
  });

  it('emits request_created event on assessAndRequest', () => {
    const mgr = createRiskApprovalManager((evt) => { events.push(evt); });
    mgr.assessAndRequest('deploy', 'severe', 'likely', 'dev', ['db-migration'], 'production', 'urgent fix');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('request_created');
    expect(events[0].request.status).toBe('pending');
    expect(events[0].assessment).toBeDefined();
    expect(events[0].assessment!.level).toBe('critical');
  });

  it('emits request_approved event when all approvals are met', () => {
    const mgr = createRiskApprovalManager((evt) => { events.push(evt); });
    const { request } = mgr.assessAndRequest('deploy', 'severe', 'likely', 'dev', [], 'production', 'fix');
    mgr.approve(request, 'supervisor', 'lead-dev', 'looks good');
    mgr.approve(request, 'manager', 'cto', 'approved');
    mgr.approve(request, 'security', 'sec-team', 'safe');
    const types = events.map(e => e.type);
    expect(types.filter(t => t === 'request_created').length).toBeGreaterThanOrEqual(1);
    expect(types).toContain('request_approved');
  });

  it('emits request_rejected event on reject', () => {
    const mgr = createRiskApprovalManager((evt) => { events.push(evt); });
    const { request } = mgr.assessAndRequest('dangerous-action', 'severe', 'likely', 'dev');
    mgr.reject(request, 'supervisor', 'lead-dev', 'too risky');
    const rejectEvents = events.filter(e => e.type === 'request_rejected');
    expect(rejectEvents.length).toBe(1);
    expect(rejectEvents[0].reason).toBe('too risky');
    expect(rejectEvents[0].approvedBy).toBe('lead-dev');
  });

  it('supports setNotificationHandler after construction', () => {
    const mgr = new RiskApprovalManager();
    mgr.setNotificationHandler((evt) => { events.push(evt); });
    mgr.assessAndRequest('test', 'minor', 'rare', 'dev', [], undefined, undefined);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('request_created');
  });

  it('includes full request and assessment data in notification event', () => {
    const mgr = createRiskApprovalManager((evt) => { events.push(evt); });
    const { assessment, request } = mgr.assessAndRequest('deploy-prod', 'major', 'possible', 'dev-user', ['schema-change'], 'production', 'performance improvement');
    const event = events[0];
    expect(event.request.id).toBe(request.id);
    expect(event.request.action).toBe('deploy-prod');
    expect(event.request.requestedBy).toBe('dev-user');
    expect(event.request.justification).toBe('performance improvement');
    expect(event.assessment!.score).toBe(assessment.score);
    expect(event.timestamp).toBeDefined();
  });

  it('emits no events when no handler is set', () => {
    const mgr = createRiskApprovalManager();
    mgr.assessAndRequest('deploy', 'minor', 'rare', 'dev');
    expect(events).toHaveLength(0);
  });
});
