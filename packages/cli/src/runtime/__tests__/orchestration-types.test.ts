import { describe, it, expect } from '@jest/globals';
import type {
  TaskStatus, AutonomyLevel, ExecutionMode, RiskLevel, PhaseId,
  DecisionOption, DecisionRequest, DecisionRecord, OrchestrationCheckpoint,
  TaskNode, PhaseState, OrchestrationState, ModelRouteResult, DecomposedTask,
} from '../orchestration-types';

describe('orchestration-types', () => {
  it('TaskStatus should accept valid values', () => {
    const statuses: TaskStatus[] = ['pending', 'ready', 'running', 'blocked', 'needs-decision', 'completed', 'validated', 'failed'];
    for (const s of statuses) {
      expect(s).toBeDefined();
    }
  });

  it('AutonomyLevel should accept valid values', () => {
    const levels: AutonomyLevel[] = ['autonomous', 'guided', 'blocked'];
    for (const l of levels) {
      expect(l).toBeDefined();
    }
  });

  it('ExecutionMode should accept valid values', () => {
    const modes: ExecutionMode[] = ['autonomous', 'guided', 'blocked'];
    for (const m of modes) {
      expect(m).toBeDefined();
    }
  });

  it('RiskLevel should accept valid values', () => {
    const risks: RiskLevel[] = ['low', 'medium', 'high'];
    for (const r of risks) {
      expect(r).toBeDefined();
    }
  });

  it('PhaseId should accept valid phase IDs', () => {
    const phases: PhaseId[] = ['diagnosis', 'structuring', 'parallelization', 'checkpoint', 'multi-model', 'decision-routing', 'full-autonomous', 'adaptive-governance', 'industrial-autonomy'];
    for (const p of phases) {
      expect(p).toBeDefined();
    }
  });

  it('DecisionOption should be constructible', () => {
    const opt: DecisionOption = { id: 'opt1', label: 'Option 1', description: 'Desc', riskLevel: 'low', impact: 'low', recommended: true };
    expect(opt.id).toBe('opt1');
    expect(opt.recommended).toBe(true);
  });

  it('DecisionRequest should be constructible', () => {
    const req: DecisionRequest = {
      id: 'dr1', title: 'Test', summary: 'Summary', context: 'Context', reason: 'Reason',
      recommendedAction: 'Action', options: [], customAllowed: false, checkpointId: 'cp1', createdAt: new Date().toISOString(),
    };
    expect(req.id).toBe('dr1');
    expect(req.customAllowed).toBe(false);
  });

  it('DecisionRecord should be constructible', () => {
    const rec: DecisionRecord = { decisionRequestId: 'dr1', selectedOptionId: 'opt1', rationale: 'Good choice', decidedAt: new Date().toISOString() };
    expect(rec.selectedOptionId).toBe('opt1');
  });

  it('OrchestrationCheckpoint should be constructible', () => {
    const cp: OrchestrationCheckpoint = {
      id: 'cp1', phase: 'diagnosis', status: 'completed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      contextHash: 'abc123', nextActions: [], dependencyIds: [], unlockIds: [],
    };
    expect(cp.contextHash).toBe('abc123');
  });

  it('TaskNode should be constructible with all fields', () => {
    const task: TaskNode = {
      id: 't1', name: 'Task 1', description: 'Do something', phase: 'structuring',
      status: 'ready', dependsOn: [], blockedBy: [], riskLevel: 'medium',
      estimatedEffort: 'hours', canParallelize: true, isDeterministic: false, requiresLLM: true, requiredModelTier: 'strong',
    };
    expect(task.canParallelize).toBe(true);
    expect(task.requiredModelTier).toBe('strong');
  });

  it('PhaseState should be constructible', () => {
    const ps: PhaseState = { id: 'diagnosis', name: 'Diagnosis', status: 'ready', progress: 0, tasks: [], completedTasks: 0, totalTasks: 0, blockedCount: 0 };
    expect(ps.status).toBe('ready');
  });

  it('OrchestrationState should be constructible', () => {
    const os: OrchestrationState = {
      currentPhase: 'diagnosis', version: '1.0', phases: [], pendingDecisions: [],
      checkpoints: [], executionMode: 'guided', autonomyLevel: 'guided', confidence: 0.5,
      startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), metadata: {},
    };
    expect(os.confidence).toBe(0.5);
  });

  it('ModelRouteResult should be constructible', () => {
    const mr: ModelRouteResult = { taskId: 't1', target: 'local', reason: 'simple', estimatedCostUsd: 0, estimatedLatencyMs: 100, confidence: 0.9 };
    expect(mr.target).toBe('local');
  });

  it('DecomposedTask should be constructible', () => {
    const dt: DecomposedTask = { originalId: 't1', subtasks: [], dependencies: [], parallelGroups: [] };
    expect(dt.originalId).toBe('t1');
  });
});
