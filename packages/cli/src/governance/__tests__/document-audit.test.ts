import { detectConflicts, resolveConflict, runAudit } from '../document-audit';

describe('document-audit', () => {
  describe('detectConflicts', () => {
    it('detects at least 5 known conflicts', () => {
      const conflicts = detectConflicts();
      expect(conflicts.length).toBeGreaterThanOrEqual(5);
    });

    it('coverage threshold conflict is critical', () => {
      const conflicts = detectConflicts();
      const cov = conflicts.find(c => c.taskType === 'coverage');
      expect(cov).toBeDefined();
      expect(cov!.severity).toBe('critical');
      expect(cov!.documents).toContain('jest.config.js');
    });

    it('no-explicit-any conflict is high severity', () => {
      const conflicts = detectConflicts();
      const arch = conflicts.find(c => c.taskType === 'architecture');
      expect(arch).toBeDefined();
      expect(arch!.severity).toBe('high');
    });

    it('e2e config missing conflict targets tests', () => {
      const conflicts = detectConflicts();
      const tst = conflicts.find(c => c.taskType === 'tests');
      expect(tst).toBeDefined();
      expect(tst!.documents).toContain('package.json');
    });

    it('governance duplication is medium severity', () => {
      const conflicts = detectConflicts();
      const gov = conflicts.find(c => c.taskType === 'governance');
      expect(gov).toBeDefined();
      expect(gov!.severity).toBe('medium');
    });

    it('metrics conflict is high severity', () => {
      const conflicts = detectConflicts();
      const met = conflicts.find(c => c.taskType === 'metrics');
      expect(met).toBeDefined();
      expect(met!.severity).toBe('high');
    });
  });

  describe('resolveConflict', () => {
    it('applies specificity rule for tests type', () => {
      const conflicts = detectConflicts();
      const tst = conflicts.find(c => c.taskType === 'tests')!;
      const resolved = resolveConflict(tst);
      expect(resolved.rule).toContain('specificity');
      expect(resolved.document).toBeTruthy();
    });

    it('applies priority rule for strategy type', () => {
      const conflict = {
        taskType: 'strategy' as const,
        documents: ['master-plan', 'future-plans'],
        reason: 'Test conflict',
        severity: 'low' as const,
        recommendation: 'Test',
        detail: 'Test',
      };
      const resolved = resolveConflict(conflict);
      expect(resolved.rule).toContain('priority');
    });

    it('applies specificity rule for coverage type', () => {
      const conflict = {
        taskType: 'coverage' as const,
        documents: ['jest.config.js', '.ai/laws.yaml'],
        reason: 'Test conflict',
        severity: 'critical' as const,
        recommendation: 'Update jest.config.js',
        detail: 'jest.config.js lines:40 vs laws 80%',
      };
      const resolved = resolveConflict(conflict);
      expect(resolved.rule).toContain('specificity');
      expect(resolved.document).toBe('jest.config.js');
    });

    it('defaults to priority when no policy matches', () => {
      const conflict = {
        taskType: 'unknown-type' as const,
        documents: ['doc-a', 'doc-b'],
        reason: 'No policy for this type',
        severity: 'low' as const,
        recommendation: 'Check manually',
        detail: 'Test',
      };
      const resolved = resolveConflict(conflict);
      expect(resolved.document).toBe('doc-a');
      expect(resolved.rule).toContain('priority');
    });
  });

  describe('runAudit', () => {
    it('returns complete audit report', () => {
      const report = runAudit();
      expect(report.conflicts.length).toBeGreaterThanOrEqual(5);
      expect(report.resolved.length).toBe(report.conflicts.length);
      expect(report.timestamp).toBeTruthy();
      expect(report.totalDocuments).toBeGreaterThan(0);
      expect(report.totalPolicies).toBeGreaterThan(0);
      expect(['clean', 'warning', 'blocked']).toContain(report.status);
    });

    it('status is blocked when critical conflicts exist', () => {
      const report = runAudit();
      expect(report.status).toBe('blocked');
    });

    it('every conflict has a resolution', () => {
      const report = runAudit();
      for (const r of report.resolved) {
        expect(r.document).toBeTruthy();
        expect(r.reason).toBeTruthy();
        expect(r.rule).toBeTruthy();
      }
    });
  });
});
