import { describe, it, expect, jest } from '@jest/globals';
import {
  createInitialState,
  evaluatePhaseReadiness,
  advancePhase,
  PHASE_ORDER,
  PHASE_NAMES,
} from '../phase-orchestrator';
import type { TaskNode, OrchestrationState } from '../orchestration-types';

jest.mock('../checkpoint-manager', () => ({
  createCheckpoint: jest.fn(() => ({
    id: `cp-${Date.now()}`,
    phase: 'diagnosis',
    status: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contextHash: 'mock-hash',
    nextActions: [],
    dependencyIds: [],
    unlockIds: [],
  })),
  saveOrchestrationState: jest.fn(),
  saveCheckpoint: jest.fn(),
  computeFilesystemHash: jest.fn(() => 'mock-hash'),
  loadLatestCheckpoint: jest.fn(() => null),
  listCheckpoints: jest.fn(() => []),
  getCheckpoint: jest.fn(() => null),
}));

jest.mock('../autonomy-policy', () => ({
  getEffectiveAutonomyLevel: jest.fn(() => 'guided'),
  shouldAutoExecute: jest.fn(() => false),
  shouldRequestHumanDecision: jest.fn(() => false),
}));

jest.mock('../unlock-engine', () => ({
  getReadyTasks: jest.fn((tasks: TaskNode[]) => tasks.filter(t => t.status === 'ready')),
  evaluateAfterCheckpoint: jest.fn(() => []),
  updateTaskStatuses: jest.fn(t => t),
}));

jest.mock('../decision-center', () => ({
  buildDecisionRequest: jest.fn(() => ({
    id: `dr-${Date.now()}`,
    title: 'Mock Decision',
    summary: 'Mock summary',
    context: 'Mock context',
    reason: 'Mock reason',
    recommendedAction: 'mock',
    options: [],
    customAllowed: false,
    checkpointId: 'cp-mock',
    createdAt: new Date().toISOString(),
  })),
  resolveDecision: jest.fn(),
}));

jest.mock('../model-router', () => ({
  routeBatch: jest.fn(() => []),
  estimateBatchCost: jest.fn(() => 0),
}));

function makeTasks(): TaskNode[] {
  return [
    {
      id: 't1',
      name: 'Diagnose project',
      description: 'Run initial diagnosis',
      phase: 'diagnosis',
      status: 'ready',
      dependsOn: [],
      blockedBy: [],
      riskLevel: 'low',
      estimatedEffort: 'hours',
      canParallelize: false,
      isDeterministic: true,
      requiresLLM: false,
    },
    {
      id: 't2',
      name: 'Structure output',
      description: 'Organize project structure',
      phase: 'structuring',
      status: 'pending',
      dependsOn: ['t1'],
      blockedBy: [],
      riskLevel: 'low',
      estimatedEffort: 'hours',
      canParallelize: false,
      isDeterministic: true,
      requiresLLM: false,
    },
  ];
}

describe('createInitialState', () => {
  it('should create initial state with all phases', () => {
    const state = createInitialState(process.cwd(), makeTasks(), 'guided');
    expect(state.currentPhase).toBe('diagnosis');
    expect(state.phases.length).toBe(PHASE_ORDER.length);
    expect(state.version).toBe('1.0.0');
  });

  it('should set first phase as ready', () => {
    const state = createInitialState(process.cwd(), makeTasks(), 'guided');
    expect(state.phases[0].status).toBe('ready');
  });

  it('should set other phases as pending', () => {
    const state = createInitialState(process.cwd(), makeTasks(), 'guided');
    for (let i = 1; i < state.phases.length; i++) {
      expect(state.phases[i].status).toBe('pending');
    }
  });

  it('should place tasks in correct phases', () => {
    const state = createInitialState(process.cwd(), makeTasks(), 'guided');
    const diagPhase = state.phases.find(p => p.id === 'diagnosis');
    expect(diagPhase!.tasks).toHaveLength(1);
    expect(diagPhase!.tasks[0].id).toBe('t1');
  });

  it('should create initial checkpoint', () => {
    const state = createInitialState(process.cwd(), makeTasks(), 'guided');
    expect(state.checkpoints.length).toBe(1);
    expect(state.lastCheckpointId).toBeDefined();
  });
});

describe('evaluatePhaseReadiness', () => {
  it('should return cannot advance when at final phase', () => {
    const state = createInitialState(process.cwd(), makeTasks(), 'guided');
    const result = evaluatePhaseReadiness(state, process.cwd(), PHASE_ORDER.length - 1);
    expect(result.canAdvance).toBe(false);
    expect(result.reason).toContain('Fase final');
  });

  it('should return cannot advance when tasks incomplete', () => {
    const state = createInitialState(process.cwd(), makeTasks(), 'guided');
    const result = evaluatePhaseReadiness(state, process.cwd(), 0);
    expect(result.canAdvance).toBe(false);
    expect(result.reason).toContain('Aguardando');
  });
});

describe('advancePhase', () => {
  it('should not advance when not ready', () => {
    const state = createInitialState(process.cwd(), makeTasks(), 'guided');
    const { state: newState, transition } = advancePhase(state, process.cwd());
    expect(transition.canAdvance).toBe(false);
    expect(newState).toBe(state);
  });
});
