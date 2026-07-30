import { describe, it, expect, beforeEach } from '@jest/globals';
import { QualityGateSystem, createQualityGateSystem } from '../src/gates';
import { GateSeverity, VerificationLayer, GateDefinition } from '../src/types';

describe('QualityGateSystem', () => {
  let system: QualityGateSystem;

  beforeEach(() => {
    system = createQualityGateSystem();
  });

  describe('constructor', () => {
    it('should create system with components', () => {
      expect(system).toBeInstanceOf(QualityGateSystem);
      expect(system.barrier).toBeDefined();
      expect(system.scorer).toBeDefined();
      expect(system.verifier).toBeDefined();
      expect(system.regressionAnalyzer).toBeDefined();
    });
  });

  describe('addGate', () => {
    it('should add gate to system', () => {
      system.addGate('test-gate', 'Test gate', 'warning', 'syntax', false);
    });

    it('should add blocking gate', () => {
      system.addGate('critical-gate', 'Critical gate', 'critical', 'syntax', true);
    });

    it('should add gate with custom timeout', () => {
      system.addGate('timeout-gate', 'Timeout gate', 'error', 'semantic', false, 60000);
    });
  });

  describe('executeAll', () => {
    it('should execute all gates', async () => {
      system.addGate('test-gate', 'Test gate', 'warning', 'syntax', false);
      
      const executor = async (gate: GateDefinition) => ({
        gate: gate.name,
        status: 'passed' as const,
        severity: gate.severity,
        layer: gate.layer,
        durationMs: 100,
        blocking: gate.blocking,
      });

      const result = await system.executeAll(executor);
      expect(result).toBeDefined();
      expect(result.layers).toBeDefined();
      expect(result.decision).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });

  describe('detectRegression', () => {
    it('should detect regression between gate results', () => {
      const before = [
        {
          gate: 'test-1',
          status: 'passed' as const,
          severity: 'warning' as const,
          layer: 'syntax' as const,
          durationMs: 100,
          blocking: false,
        },
      ];
      const after = [
        {
          gate: 'test-1',
          status: 'failed' as const,
          severity: 'error' as const,
          layer: 'syntax' as const,
          durationMs: 100,
          blocking: false,
        },
      ];

      const result = system.detectRegression(before, after);
      expect(result).toBeDefined();
      expect(result.hasRegression).toBe(true);
    });

    it('should not detect regression when all pass', () => {
      const before = [
        {
          gate: 'test-1',
          status: 'passed' as const,
          severity: 'warning' as const,
          layer: 'syntax' as const,
          durationMs: 100,
          blocking: false,
        },
      ];
      const after = [
        {
          gate: 'test-1',
          status: 'passed' as const,
          severity: 'warning' as const,
          layer: 'syntax' as const,
          durationMs: 100,
          blocking: false,
        },
      ];

      const result = system.detectRegression(before, after);
      expect(result.hasRegression).toBe(false);
    });
  });

  describe('barrier', () => {
    it('should have barrier instance', () => {
      expect(system.barrier).toBeDefined();
    });
  });

  describe('scorer', () => {
    it('should have scorer instance', () => {
      expect(system.scorer).toBeDefined();
    });
  });

  describe('verifier', () => {
    it('should have verifier instance', () => {
      expect(system.verifier).toBeDefined();
    });
  });

  describe('regressionAnalyzer', () => {
    it('should have regression analyzer instance', () => {
      expect(system.regressionAnalyzer).toBeDefined();
    });
  });
});

describe('createQualityGateSystem', () => {
  it('should create system instance', () => {
    const system = createQualityGateSystem();
    expect(system).toBeInstanceOf(QualityGateSystem);
  });
});
