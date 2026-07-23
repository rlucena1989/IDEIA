import { describe, it, expect, jest } from '@jest/globals';
import { ProjectLifecycleOrchestrator } from '../project-lifecycle-orchestrator';

describe('project-lifecycle-orchestrator', () => {
  it('should initialize with idea phase in progress', () => {
    const orchestrator = new ProjectLifecycleOrchestrator('test-project');
    const report = orchestrator.getReport();
    expect(report.projectName).toBe('test-project');
    expect(report.status).toBe('active');
    expect(report.currentPhase).toBe('idea');
  });

  it('should advance through phases', () => {
    const orchestrator = new ProjectLifecycleOrchestrator('test');
    expect(orchestrator.advance('idea')).toBe(true);
    expect(orchestrator.getReport().currentPhase).toBe('analysis');
    expect(orchestrator.advance('analysis')).toBe(true);
    expect(orchestrator.getReport().currentPhase).toBe('architecture');
  });

  it('should complete full lifecycle', () => {
    const orchestrator = new ProjectLifecycleOrchestrator('test');
    const phases = ['idea', 'analysis', 'architecture', 'implementation', 'testing', 'deployment', 'monitoring'];
    for (const phase of phases) {
      expect(orchestrator.advance(phase as any)).toBe(true);
    }
    expect(orchestrator.getReport().status).toBe('completed');
    expect(orchestrator.getReport().overallProgress).toBe(100);
  });

  it('should reject advancing non-current phase', () => {
    const orchestrator = new ProjectLifecycleOrchestrator('test');
    expect(orchestrator.advance('deployment')).toBe(false);
    expect(orchestrator.getReport().errors.length).toBeGreaterThan(0);
  });

  it('should handle phase failure and rollback', () => {
    const orchestrator = new ProjectLifecycleOrchestrator('test', { autoTransition: false, rollbackOnFailure: true });
    orchestrator.advance('idea');
    orchestrator.fail('analysis', 'Test failure');
    const report = orchestrator.getReport();
    expect(report.status).toBe('active');
  });

  it('should add and validate checkpoints', () => {
    const orchestrator = new ProjectLifecycleOrchestrator('test');
    orchestrator.addCheckpoint('idea', 'Idea defined', true);
    orchestrator.addCheckpoint('idea', 'Budget approved', true);
    expect(orchestrator.validateCheckpoints('idea')).toBe(true);
    expect(orchestrator.advance('idea')).toBe(true);
  });

  it('should fail if checkpoints not passed', () => {
    const orchestrator = new ProjectLifecycleOrchestrator('test');
    orchestrator.addCheckpoint('idea', 'Critical requirement', false);
    expect(orchestrator.advance('idea')).toBe(false);
  });

  it('should add artifacts to phases', () => {
    const orchestrator = new ProjectLifecycleOrchestrator('test');
    orchestrator.addArtifact('idea', 'idea-spec.md');
    const state = orchestrator.getPhaseState('idea');
    expect(state?.artifacts).toContain('idea-spec.md');
  });

  it('should return phase definitions', () => {
    const orchestrator = new ProjectLifecycleOrchestrator('test');
    const defs = orchestrator.getPhaseDefinitions();
    expect(defs.length).toBe(7);
    expect(defs[0].phase).toBe('idea');
    expect(defs[6].phase).toBe('monitoring');
  });

  it('should estimate remaining time', () => {
    const orchestrator = new ProjectLifecycleOrchestrator('test');
    const totalTime = orchestrator.getEstimatedTimeRemaining();
    expect(totalTime).toBeGreaterThan(0);
  });

  it('should format report as text', () => {
    const orchestrator = new ProjectLifecycleOrchestrator('test');
    const report = orchestrator.formatReport('text');
    expect(report).toContain('Lifecycle Report: test');
    expect(report).toContain('Idea');
  });

  it('should format report as JSON', () => {
    const orchestrator = new ProjectLifecycleOrchestrator('test');
    const report = orchestrator.formatReport('json');
    const parsed = JSON.parse(report);
    expect(parsed.projectName).toBe('test');
  });

  it('should get current phase correctly', () => {
    const orchestrator = new ProjectLifecycleOrchestrator('test');
    expect(orchestrator.getCurrentPhase()?.phase).toBe('idea');
    orchestrator.advance('idea');
    expect(orchestrator.getCurrentPhase()?.phase).toBe('analysis');
    orchestrator.advance('analysis');
    expect(orchestrator.getCurrentPhase()?.phase).toBe('architecture');
  });

  it('should support custom config without auto transition', () => {
    const orchestrator = new ProjectLifecycleOrchestrator('test', { autoTransition: false, requireApproval: true });
    expect(orchestrator.advance('idea')).toBe(true);
    expect(orchestrator.getReport().currentPhase).toBe('analysis');
  });
});
