import { describe, it, expect, beforeEach } from '@jest/globals';
import { IncidentManager } from '../src/incident-manager';
import { IncidentSeverity, IncidentStatus } from '../src/types';

describe('IncidentManager', () => {
  let manager: IncidentManager;

  beforeEach(() => {
    manager = new IncidentManager();
  });

  describe('constructor', () => {
    it('should create manager without notifier', () => {
      const manager = new IncidentManager();
      expect(manager).toBeInstanceOf(IncidentManager);
    });
  });

  describe('create', () => {
    it('should create incident with required fields', () => {
      const incident = manager.create({
        title: 'Test Incident',
        description: 'Test description',
        severity: IncidentSeverity.high,
      });
      expect(incident.id).toBeDefined();
      expect(incident.title).toBe('Test Incident');
      expect(incident.status).toBe(IncidentStatus.detected);
      expect(incident.severity).toBe(IncidentSeverity.high);
    });

    it('should create incident with assignee', () => {
      const incident = manager.create({
        title: 'Test Incident',
        description: 'Test description',
        severity: IncidentSeverity.medium,
        assignee: 'user-1',
      });
      expect(incident.assignee).toBe('user-1');
    });

    it('should create incident with tags', () => {
      const incident = manager.create({
        title: 'Test Incident',
        description: 'Test description',
        severity: IncidentSeverity.low,
        tags: ['bug', 'urgent'],
      });
      expect(incident.tags).toEqual(['bug', 'urgent']);
    });

    it('should set SLA based on severity', () => {
      const critical = manager.create({
        title: 'Critical',
        description: 'Critical incident',
        severity: IncidentSeverity.critical,
      });
      const low = manager.create({
        title: 'Low',
        description: 'Low incident',
        severity: IncidentSeverity.low,
      });
      expect(critical.sla.getTime()).toBeLessThan(low.sla.getTime());
    });
  });

  describe('updateStatus', () => {
    it('should update incident status', () => {
      const incident = manager.create({
        title: 'Test',
        description: 'Test',
        severity: IncidentSeverity.medium,
      });
      const updated = manager.updateStatus(incident.id, IncidentStatus.analyzing);
      expect(updated?.status).toBe(IncidentStatus.analyzing);
    });

    it('should set resolvedAt when resolved', () => {
      const incident = manager.create({
        title: 'Test',
        description: 'Test',
        severity: IncidentSeverity.medium,
      });
      const updated = manager.updateStatus(incident.id, IncidentStatus.resolved);
      expect(updated?.resolvedAt).toBeDefined();
    });

    it('should return undefined for non-existent incident', () => {
      const result = manager.updateStatus('non-existent', IncidentStatus.resolved);
      expect(result).toBeUndefined();
    });
  });

  describe('assign', () => {
    it('should assign incident to user', () => {
      const incident = manager.create({
        title: 'Test',
        description: 'Test',
        severity: IncidentSeverity.medium,
      });
      const updated = manager.assign(incident.id, 'user-1');
      expect(updated?.assignee).toBe('user-1');
    });
  });

  describe('addNote', () => {
    it('should add note to incident', () => {
      const incident = manager.create({
        title: 'Test',
        description: 'Test',
        severity: IncidentSeverity.medium,
      });
      const updated = manager.addNote(incident.id, 'Test note', 'user-1');
      expect(updated?.notes).toHaveLength(2);
      expect(updated?.notes[1].message).toBe('Test note');
    });
  });

  describe('resolve', () => {
    it('should resolve incident', () => {
      const incident = manager.create({
        title: 'Test',
        description: 'Test',
        severity: IncidentSeverity.medium,
      });
      const resolved = manager.resolve(incident.id, 'Fixed');
      expect(resolved?.status).toBe(IncidentStatus.resolved);
      expect(resolved?.resolvedAt).toBeDefined();
    });
  });

  describe('getTimeline', () => {
    it('should return incident timeline', () => {
      const incident = manager.create({
        title: 'Test',
        description: 'Test',
        severity: IncidentSeverity.medium,
      });
      const timeline = manager.getTimeline(incident.id);
      expect(timeline).toBeDefined();
      expect(timeline?.length).toBeGreaterThan(0);
    });
  });

  describe('list', () => {
    it('should list all incidents', () => {
      manager.create({
        title: 'Test 1',
        description: 'Test',
        severity: IncidentSeverity.low,
      });
      manager.create({
        title: 'Test 2',
        description: 'Test',
        severity: IncidentSeverity.high,
      });
      const incidents = manager.list();
      expect(incidents).toHaveLength(2);
    });

    it('should filter by status', () => {
      manager.create({
        title: 'Test 1',
        description: 'Test',
        severity: IncidentSeverity.low,
      });
      const incident2 = manager.create({
        title: 'Test 2',
        description: 'Test',
        severity: IncidentSeverity.high,
      });
      manager.updateStatus(incident2.id, IncidentStatus.resolved);
      const resolved = manager.list({ status: IncidentStatus.resolved });
      expect(resolved).toHaveLength(1);
    });

    it('should filter by severity', () => {
      manager.create({
        title: 'Test 1',
        description: 'Test',
        severity: IncidentSeverity.low,
      });
      manager.create({
        title: 'Test 2',
        description: 'Test',
        severity: IncidentSeverity.high,
      });
      const high = manager.list({ severity: IncidentSeverity.high });
      expect(high).toHaveLength(1);
    });

    it('should filter by assignee', () => {
      manager.create({
        title: 'Test 1',
        description: 'Test',
        severity: IncidentSeverity.low,
        assignee: 'user-1',
      });
      manager.create({
        title: 'Test 2',
        description: 'Test',
        severity: IncidentSeverity.high,
        assignee: 'user-2',
      });
      const user1 = manager.list({ assignee: 'user-1' });
      expect(user1).toHaveLength(1);
    });
  });

  describe('createPostMortem', () => {
    it('should create post-mortem for incident', () => {
      const incident = manager.create({
        title: 'Test',
        description: 'Test',
        severity: IncidentSeverity.high,
      });
      manager.resolve(incident.id);
      const pm = manager.createPostMortem({
        incidentId: incident.id,
        rootCause: 'Bug in code',
        impact: 'Service down for 1 hour',
        lessons: 'Add more tests',
      });
      expect(pm).toBeDefined();
      expect(pm?.rootCause).toBe('Bug in code');
    });

    it('should return undefined for non-existent incident', () => {
      const pm = manager.createPostMortem({
        incidentId: 'non-existent',
        rootCause: 'Test',
        impact: 'Test',
        lessons: 'Test',
      });
      expect(pm).toBeUndefined();
    });
  });

  describe('addActionItem', () => {
    it('should add action item to post-mortem', () => {
      const incident = manager.create({
        title: 'Test',
        description: 'Test',
        severity: IncidentSeverity.high,
      });
      manager.createPostMortem({
        incidentId: incident.id,
        rootCause: 'Test',
        impact: 'Test',
        lessons: 'Test',
      });
      const item = manager.addActionItem(incident.id, 'Fix bug', 'user-1');
      expect(item).toBeDefined();
      expect(item?.description).toBe('Fix bug');
    });
  });

  describe('completeActionItem', () => {
    it('should complete action item', () => {
      const incident = manager.create({
        title: 'Test',
        description: 'Test',
        severity: IncidentSeverity.high,
      });
      manager.createPostMortem({
        incidentId: incident.id,
        rootCause: 'Test',
        impact: 'Test',
        lessons: 'Test',
      });
      const item = manager.addActionItem(incident.id, 'Fix bug', 'user-1');
      const completed = manager.completeActionItem(incident.id, item!.id);
      expect(completed).toBe(true);
    });
  });

  describe('getPostMortem', () => {
    it('should get post-mortem by incident id', () => {
      const incident = manager.create({
        title: 'Test',
        description: 'Test',
        severity: IncidentSeverity.high,
      });
      manager.createPostMortem({
        incidentId: incident.id,
        rootCause: 'Test',
        impact: 'Test',
        lessons: 'Test',
      });
      const pm = manager.getPostMortem(incident.id);
      expect(pm).toBeDefined();
    });
  });

  describe('getSlaHours', () => {
    it('should return SLA hours for severity', () => {
      expect(manager.getSlaHours(IncidentSeverity.critical)).toBe(1);
      expect(manager.getSlaHours(IncidentSeverity.high)).toBe(4);
      expect(manager.getSlaHours(IncidentSeverity.medium)).toBe(24);
      expect(manager.getSlaHours(IncidentSeverity.low)).toBe(72);
    });
  });
});
