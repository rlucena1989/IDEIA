import { IncidentManager } from '../src/incident-manager';
import { IncidentSeverity, IncidentStatus } from '../src/types';

describe('IncidentManager', () => {
  let manager: IncidentManager;

  beforeEach(() => {
    manager = new IncidentManager();
  });

  it('should create an incident', () => {
    const incident = manager.create({
      title: 'Database outage',
      description: 'Primary database is down',
      severity: IncidentSeverity.critical,
      assignee: 'alice',
      tags: ['database', 'production'],
    });

    expect(incident.id).toBeDefined();
    expect(incident.title).toBe('Database outage');
    expect(incident.severity).toBe(IncidentSeverity.critical);
    expect(incident.status).toBe(IncidentStatus.detected);
    expect(incident.detectedAt).toBeInstanceOf(Date);
    expect(incident.sla).toBeInstanceOf(Date);
    expect(incident.assignee).toBe('alice');
    expect(incident.tags).toEqual(['database', 'production']);
  });

  it('should set SLA based on severity', () => {
    const critical = manager.create({
      title: 'Critical',
      description: 'Critical issue',
      severity: IncidentSeverity.critical,
    });
    const low = manager.create({
      title: 'Low',
      description: 'Low issue',
      severity: IncidentSeverity.low,
    });

    const criticalSla = critical.sla.getTime() - critical.detectedAt.getTime();
    const lowSla = low.sla.getTime() - low.detectedAt.getTime();

    expect(criticalSla).toBe(60 * 60 * 1000);
    expect(lowSla).toBe(72 * 60 * 60 * 1000);
  });

  it('should return SLA hours', () => {
    expect(manager.getSlaHours(IncidentSeverity.critical)).toBe(1);
    expect(manager.getSlaHours(IncidentSeverity.high)).toBe(4);
    expect(manager.getSlaHours(IncidentSeverity.medium)).toBe(24);
    expect(manager.getSlaHours(IncidentSeverity.low)).toBe(72);
  });

  it('should update incident status', () => {
    const incident = manager.create({
      title: 'Test',
      description: 'Test incident',
      severity: IncidentSeverity.medium,
    });

    manager.updateStatus(incident.id, IncidentStatus.analyzing);
    expect(manager.list()[0]?.status).toBe(IncidentStatus.analyzing);

    manager.updateStatus(incident.id, IncidentStatus.resolved);
    expect(manager.list()[0]?.status).toBe(IncidentStatus.resolved);
    expect(manager.list()[0]?.resolvedAt).toBeDefined();
  });

  it('should return undefined for unknown incident', () => {
    expect(manager.updateStatus('unknown', IncidentStatus.resolved)).toBeUndefined();
    expect(manager.assign('unknown', 'alice')).toBeUndefined();
    expect(manager.addNote('unknown', 'note')).toBeUndefined();
    expect(manager.resolve('unknown')).toBeUndefined();
  });

  it('should assign an incident', () => {
    const incident = manager.create({
      title: 'Test',
      description: 'Test',
      severity: IncidentSeverity.low,
    });

    manager.assign(incident.id, 'bob');
    expect(manager.list()[0]?.assignee).toBe('bob');
  });

  it('should add notes', () => {
    const incident = manager.create({
      title: 'Test',
      description: 'Test',
      severity: IncidentSeverity.low,
    });

    manager.addNote(incident.id, 'Investigating the root cause', 'alice');
    const timeline = manager.getTimeline(incident.id);
    expect(timeline).toHaveLength(2);
    expect(timeline?.[1]?.message).toBe('Investigating the root cause');
    expect(timeline?.[1]?.author).toBe('alice');
  });

  it('should resolve an incident', () => {
    const incident = manager.create({
      title: 'Test',
      description: 'Test',
      severity: IncidentSeverity.low,
    });

    manager.resolve(incident.id, 'Fixed by restarting the service');
    const resolved = manager.list()[0];
    expect(resolved?.status).toBe(IncidentStatus.resolved);
    expect(resolved?.resolvedAt).toBeDefined();
  });

  it('should get timeline', () => {
    const incident = manager.create({
      title: 'Test',
      description: 'Test',
      severity: IncidentSeverity.low,
    });

    const timeline = manager.getTimeline(incident.id);
    expect(timeline).toBeDefined();
    expect(timeline).toHaveLength(1);
    expect(timeline?.[0]?.type).toBe('status_change');

    expect(manager.getTimeline('unknown')).toBeUndefined();
  });

  it('should list incidents with filters', () => {
    manager.create({ title: 'Critical', description: 'C', severity: IncidentSeverity.critical });
    manager.create({ title: 'Low', description: 'L', severity: IncidentSeverity.low, assignee: 'alice' });
    manager.create({ title: 'Medium', description: 'M', severity: IncidentSeverity.medium, assignee: 'bob' });

    expect(manager.list().length).toBeGreaterThanOrEqual(3);

    const critical = manager.list({ severity: IncidentSeverity.critical });
    expect(critical).toHaveLength(1);
    expect(critical[0]?.title).toBe('Critical');

    const aliceIncidents = manager.list({ assignee: 'alice' });
    expect(aliceIncidents).toHaveLength(1);
  });

  it('should create post-mortem', () => {
    const incident = manager.create({
      title: 'Outage',
      description: 'Production outage',
      severity: IncidentSeverity.critical,
    });

    const pm = manager.createPostMortem({
      incidentId: incident.id,
      rootCause: 'Memory leak in cache layer',
      impact: '30 minutes of degraded service',
      lessons: 'Add memory monitoring alerts',
    });

    expect(pm).toBeDefined();
    expect(pm?.rootCause).toBe('Memory leak in cache layer');
    expect(pm?.impact).toBe('30 minutes of degraded service');

    const updated = manager.list()[0];
    expect(updated?.status).toBe(IncidentStatus.post_mortem);
  });

  it('should return undefined for post-mortem on unknown incident', () => {
    const pm = manager.createPostMortem({
      incidentId: 'unknown',
      rootCause: 'Unknown',
      impact: 'None',
      lessons: 'None',
    });
    expect(pm).toBeUndefined();
  });

  it('should manage post-mortem action items', () => {
    const incident = manager.create({
      title: 'Outage',
      description: 'Outage',
      severity: IncidentSeverity.high,
    });

    manager.createPostMortem({
      incidentId: incident.id,
      rootCause: 'Bug',
      impact: 'Minor',
      lessons: 'Test more',
    });

    const item = manager.addActionItem(incident.id, 'Add memory monitoring', 'alice');
    expect(item).toBeDefined();
    expect(item?.description).toBe('Add memory monitoring');
    expect(item?.completed).toBe(false);

    const completed = manager.completeActionItem(incident.id, item!.id);
    expect(completed).toBe(true);

    const pm = manager.getPostMortem(incident.id);
    expect(pm?.actionItems[0]?.completed).toBe(true);
    expect(pm?.actionItems[0]?.completedAt).toBeDefined();
  });

  it('should return false for completing unknown action item', () => {
    const incident = manager.create({
      title: 'Test',
      description: 'Test',
      severity: IncidentSeverity.low,
    });

    manager.createPostMortem({
      incidentId: incident.id,
      rootCause: 'X',
      impact: 'Y',
      lessons: 'Z',
    });

    expect(manager.completeActionItem(incident.id, 'unknown-item')).toBe(false);
    expect(manager.completeActionItem('unknown-incident', 'item')).toBe(false);
  });

  it('should return undefined for addActionItem without post-mortem', () => {
    const incident = manager.create({
      title: 'Test',
      description: 'Test',
      severity: IncidentSeverity.low,
    });

    expect(manager.addActionItem(incident.id, 'Task', 'owner')).toBeUndefined();
  });
});
