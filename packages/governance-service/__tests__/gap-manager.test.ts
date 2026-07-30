jest.mock('fs');

import { GapManager, createGapManager } from '../src/gap-manager';


describe('GapManager', () => {
  let manager: GapManager;

  beforeEach(() => {
    manager = new GapManager('/tmp/test-gaps.json');
  });

  describe('construction', () => {
    it('should start with empty state', () => {
      expect(manager.listGaps()).toHaveLength(0);
    });

    it('factory createGapManager returns a GapManager instance', () => {
      const m = createGapManager('/tmp/factory.json');
      expect(m).toBeInstanceOf(GapManager);
    });
  });

  describe('registerGap', () => {
    it('should create a gap with all required fields', () => {
      const gap = manager.registerGap('Critical Bug', 'Fix this now', 'critical', 'security', 'pentest', true);
      expect(gap.id).toMatch(/^gap_/);
      expect(gap.title).toBe('Critical Bug');
      expect(gap.description).toBe('Fix this now');
      expect(gap.severity).toBe('critical');
      expect(gap.category).toBe('security');
      expect(gap.source).toBe('pentest');
      expect(gap.blocking).toBe(true);
    });

    it('should default status to open', () => {
      const gap = manager.registerGap('Test', '', 'low', 'documentation', 'src', false);
      expect(gap.status).toBe('open');
    });

    it('should set createdAt and updatedAt', () => {
      const before = Date.now();
      const gap = manager.registerGap('Test', '', 'low', 'testing', 'src', false);
      const after = Date.now();
      const created = new Date(gap.createdAt).getTime();
      expect(created).toBeGreaterThanOrEqual(before);
      expect(created).toBeLessThanOrEqual(after);
      expect(new Date(gap.updatedAt).getTime()).toBeGreaterThanOrEqual(before);
    });

    it('should generate unique IDs for each gap', () => {
      const g1 = manager.registerGap('A', '', 'low', 'compliance', 'src', false);
      const g2 = manager.registerGap('B', '', 'low', 'compliance', 'src', false);
      expect(g1.id).not.toBe(g2.id);
    });

    it('should add the gap to the list', () => {
      manager.registerGap('Gap', '', 'medium', 'architecture', 'audit', false);
      expect(manager.listGaps()).toHaveLength(1);
    });
  });

  describe('updateGap', () => {
    it('should update fields and refresh updatedAt', () => {
      const gap = manager.registerGap('Original', 'desc', 'low', 'documentation', 'src', false);
      const updated = manager.updateGap(gap.id, { title: 'Updated', description: 'new desc', blocking: true });
      expect(updated!.title).toBe('Updated');
      expect(updated!.description).toBe('new desc');
      expect(updated!.blocking).toBe(true);
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(gap.updatedAt).getTime());
    });

    it('should auto-set resolvedAt when status changes to resolved', () => {
      const gap = manager.registerGap('Fix me', '', 'high', 'performance', 'tests', false);
      const updated = manager.updateGap(gap.id, { status: 'resolved' });
      expect(updated!.status).toBe('resolved');
      expect(updated!.resolvedAt).toBeDefined();
    });

    it('should not overwrite resolvedAt on subsequent updates', () => {
      const gap = manager.registerGap('Fix me', '', 'high', 'quality', 'tests', false);
      const first = manager.updateGap(gap.id, { status: 'resolved' });
      const resolvedAt1 = first!.resolvedAt;
      const second = manager.updateGap(gap.id, { severity: 'low' });
      expect(second!.resolvedAt).toBe(resolvedAt1);
    });

    it('should preserve fields not included in updates', () => {
      const gap = manager.registerGap('Original', 'desc', 'low', 'documentation', 'src', false);
      manager.updateGap(gap.id, { title: 'New Title' });
      const updated = manager.getGap(gap.id);
      expect(updated!.description).toBe('desc');
      expect(updated!.severity).toBe('low');
    });

    it('should return null for nonexistent gap', () => {
      expect(manager.updateGap('nonexistent', { title: 'Nope' })).toBeNull();
    });
  });

  describe('resolveGap', () => {
    it('should set status, resolution, resolvedAt, and updatedAt', () => {
      const gap = manager.registerGap('Bug', 'A bug', 'critical', 'quality', 'qa', true);
      const resolved = manager.resolveGap(gap.id, 'Fixed by refactoring');
      expect(resolved!.status).toBe('resolved');
      expect(resolved!.resolution).toBe('Fixed by refactoring');
      expect(resolved!.resolvedAt).toBeDefined();
      expect(new Date(resolved!.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(gap.updatedAt).getTime());
    });

    it('should return null for nonexistent gap', () => {
      expect(manager.resolveGap('bad-id', 'nothing')).toBeNull();
    });
  });

  describe('getGap', () => {
    it('should return the gap by ID', () => {
      const gap = manager.registerGap('Target', 'desc', 'medium', 'architecture', 'src', false);
      expect(manager.getGap(gap.id)!.title).toBe('Target');
    });

    it('should return null for nonexistent ID', () => {
      expect(manager.getGap('no-such-gap')).toBeNull();
    });
  });

  describe('listGaps', () => {
    it('should return all gaps sorted by creation date descending', () => {
      const g1 = manager.registerGap('First', '', 'low', 'testing', 'a', false);
      const g2 = manager.registerGap('Second', '', 'low', 'testing', 'a', false);
      const g3 = manager.registerGap('Third', '', 'low', 'testing', 'a', false);
      const list = manager.listGaps();
      expect(list).toHaveLength(3);
      const ids = list.map(g => g.id);
      expect(ids).toContain(g1.id);
      expect(ids).toContain(g2.id);
      expect(ids).toContain(g3.id);
      for (let i = 1; i < list.length; i++) {
        const prev = new Date(list[i - 1].createdAt).getTime();
        const curr = new Date(list[i].createdAt).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('should filter by status', () => {
      const open = manager.registerGap('Open', '', 'low', 'testing', 'a', false);
      const resolved = manager.registerGap('Resolved', '', 'low', 'testing', 'a', false);
      manager.resolveGap(resolved.id, 'done');
      const result = manager.listGaps('open');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(open.id);
    });

    it('should filter by category', () => {
      manager.registerGap('A', '', 'low', 'security', 'a', false);
      manager.registerGap('B', '', 'low', 'performance', 'a', false);
      manager.registerGap('C', '', 'low', 'security', 'a', false);
      expect(manager.listGaps(undefined, 'security')).toHaveLength(2);
      expect(manager.listGaps(undefined, 'performance')).toHaveLength(1);
      expect(manager.listGaps(undefined, 'documentation')).toHaveLength(0);
    });

    it('should combine status and category filters', () => {
      const g = manager.registerGap('Critical Sec', '', 'critical', 'security', 'a', false);
      manager.registerGap('Low Sec', '', 'low', 'security', 'a', false);
      manager.resolveGap(g.id, 'done');
      const result = manager.listGaps('resolved', 'security');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(g.id);
    });
  });

  describe('getBlockingGaps', () => {
    it('should return only unresolved gaps marked as blocking', () => {
      manager.registerGap('Blocking', '', 'high', 'architecture', 'a', true);
      manager.registerGap('Non-blocking', '', 'low', 'testing', 'a', false);
      const result = manager.getBlockingGaps();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Blocking');
    });

    it('should exclude resolved blocking gaps', () => {
      const bg = manager.registerGap('Blocking', '', 'high', 'architecture', 'a', true);
      manager.resolveGap(bg.id, 'fixed');
      expect(manager.getBlockingGaps()).toHaveLength(0);
    });

    it('should return empty array when no blocking gaps', () => {
      expect(manager.getBlockingGaps()).toHaveLength(0);
    });
  });

  describe('generateReport', () => {
    it('should return correct aggregated stats', () => {
      manager.registerGap('A', '', 'critical', 'security', 'a', true);
      manager.registerGap('B', '', 'high', 'performance', 'a', false);
      manager.registerGap('C', '', 'medium', 'quality', 'a', false);
      manager.registerGap('D', '', 'low', 'documentation', 'a', false);
      manager.registerGap('E', '', 'critical', 'architecture', 'a', true);
      const report = manager.generateReport();
      expect(report.total).toBe(5);
      expect(report.open).toBe(5);
      expect(report.inProgress).toBe(0);
      expect(report.resolved).toBe(0);
      expect(report.critical).toBe(2);
      expect(report.blocking).toBe(2);
      expect(report.byCategory.security).toBe(1);
      expect(report.byCategory.architecture).toBe(1);
      expect(report.byCategory.performance).toBe(1);
      expect(report.byCategory.quality).toBe(1);
      expect(report.byCategory.documentation).toBe(1);
      expect(report.bySeverity.critical).toBe(2);
      expect(report.bySeverity.high).toBe(1);
      expect(report.bySeverity.medium).toBe(1);
      expect(report.bySeverity.low).toBe(1);
    });

    it('should count across all statuses', () => {
      const g = manager.registerGap('A', '', 'high', 'security', 'a', false);
      manager.resolveGap(g.id, 'done');
      const report = manager.generateReport();
      expect(report.total).toBe(1);
      expect(report.resolved).toBe(1);
      expect(report.open).toBe(0);
    });

    it('should return zeroed counts for empty state', () => {
      const report = manager.generateReport();
      expect(report.total).toBe(0);
      expect(report.open).toBe(0);
      expect(report.inProgress).toBe(0);
      expect(report.resolved).toBe(0);
      expect(report.critical).toBe(0);
      expect(report.blocking).toBe(0);
    });
  });

  describe('persistence', () => {
    it('should call writeFileSync on registerGap', () => {
      const fs = require('fs');
      manager.registerGap('Test', '', 'low', 'testing', 'src', false);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should call writeFileSync on updateGap', () => {
      const fs = require('fs');
      const gap = manager.registerGap('Test', '', 'low', 'testing', 'src', false);
      fs.writeFileSync.mockClear();
      manager.updateGap(gap.id, { title: 'Changed' });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should call writeFileSync on resolveGap', () => {
      const fs = require('fs');
      const gap = manager.registerGap('Test', '', 'low', 'testing', 'src', false);
      fs.writeFileSync.mockClear();
      manager.resolveGap(gap.id, 'done');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });
});
