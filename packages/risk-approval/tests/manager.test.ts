import { describe, it, expect, beforeEach } from '@jest/globals';
import { RiskApprovalManager, createRiskApprovalManager } from '../src/manager';
import { RiskLevel, ImpactLevel, ProbabilityLevel } from '../src/types';

describe('RiskApprovalManager', () => {
  let manager: RiskApprovalManager;

  beforeEach(() => {
    manager = createRiskApprovalManager();
  });

  describe('constructor', () => {
    it('should create manager with components', () => {
      expect(manager).toBeInstanceOf(RiskApprovalManager);
      expect(manager.classifier).toBeDefined();
      expect(manager.approvalMatrix).toBeDefined();
    });
  });

  describe('assessAndRequest', () => {
    it('should assess risk and create request', () => {
      const result = manager.assessAndRequest(
        'deploy-code',
        'moderate',
        'possible',
        'user-1'
      );
      expect(result).toBeDefined();
      expect(result.assessment).toBeDefined();
      expect(result.request).toBeDefined();
    });

    it('should include factors in assessment', () => {
      const result = manager.assessAndRequest(
        'deploy-code',
        'major',
        'likely',
        'user-1',
        ['production', 'high-traffic']
      );
      expect(result.assessment.factors).toContain('production');
      expect(result.assessment.factors).toContain('high-traffic');
    });

    it('should include justification in request', () => {
      const result = manager.assessAndRequest(
        'deploy-code',
        'minor',
        'rare',
        'user-1',
        [],
        'dev',
        'Test deployment'
      );
      expect(result.request.justification).toBe('Test deployment');
    });
  });

  describe('canProceed', () => {
    it('should allow low risk with low token count', () => {
      const canProceed = manager.canProceed('low', 100);
      expect(canProceed).toBe(true);
    });

    it('should block critical risk with high token count', () => {
      const canProceed = manager.canProceed('critical', 100000);
      expect(canProceed).toBe(false);
    });
  });

  describe('classifier', () => {
    it('should have classifier instance', () => {
      expect(manager.classifier).toBeDefined();
    });
  });

  describe('approvalMatrix', () => {
    it('should have approval matrix instance', () => {
      expect(manager.approvalMatrix).toBeDefined();
    });
  });
});

describe('createRiskApprovalManager', () => {
  it('should create manager instance', () => {
    const manager = createRiskApprovalManager();
    expect(manager).toBeInstanceOf(RiskApprovalManager);
  });
});
