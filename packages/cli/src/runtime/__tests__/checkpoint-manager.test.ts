
const mockFs = {
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
};

jest.mock('node:fs', () => mockFs);

jest.mock('node:crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'abcdef1234567890abcdef1234567890abcdef12'),
  })),
}));

import {
  computeFilesystemHash,
  createCheckpoint,
  saveCheckpoint,
  loadCheckpoint,
  loadLatestCheckpoint,
  listCheckpoints,
  listCheckpointsByPhase,
  updateCheckpointStatus,
  attachDecisionToCheckpoint,
  getCheckpointMetrics,
  getOrchestrationSummary,
} from '../checkpoint-manager';

import type { OrchestrationCheckpoint, DecisionRecord, OrchestrationState } from '../orchestration-types';

function makeCp(overrides: Partial<OrchestrationCheckpoint> = {}): OrchestrationCheckpoint {
  return {
    id: 'cp-default',
    phase: 'diagnosis',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    contextHash: 'abc123',
    nextActions: [],
    dependencyIds: [],
    unlockIds: [],
    ...overrides,
  };
}

describe('checkpoint-manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.mkdirSync.mockReturnValue(undefined);
    mockFs.writeFileSync.mockReturnValue(undefined);
  });

  describe('computeFilesystemHash()', () => {
    it('should return a hex string hash', () => {
      mockFs.existsSync.mockReturnValue(false);
      const hash = computeFilesystemHash('/test');
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });

    it('should include existing config files', () => {
      mockFs.existsSync.mockImplementation((p: string) =>
        String(p).endsWith('package.json') || String(p).endsWith('tsconfig.json'),
      );
      mockFs.readFileSync.mockReturnValue('{"name":"test"}');
      const hash = computeFilesystemHash('/test');
      expect(hash).toBeTruthy();
      expect(mockFs.readFileSync).toHaveBeenCalled();
    });
  });

  describe('createCheckpoint()', () => {
    it('should create a checkpoint with the given phase and status', () => {
      const cp = createCheckpoint('/test', 'diagnosis', 'task-1', 'running');
      expect(cp.id).toContain('cp-');
      expect(cp.phase).toBe('diagnosis');
      expect(cp.taskId).toBe('task-1');
      expect(cp.status).toBe('running');
      expect(cp.contextHash).toBeTruthy();
    });

    it('should include metrics when provided', () => {
      const metrics = { coverage: 85, branches: 10, scorecard: 90 };
      const cp = createCheckpoint('/test', 'structuring', 'task-2', 'pending', metrics);
      expect(cp.metrics).toEqual(metrics);
    });

    it('should persist the checkpoint via fs.writeFileSync', () => {
      createCheckpoint('/test', 'checkpoint', 'task-3', 'completed');
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
      expect(written.phase).toBe('checkpoint');
    });
  });

  describe('saveCheckpoint() / loadCheckpoint()', () => {
    it('should save and load a checkpoint via mock', () => {
      const cp = makeCp({ id: 'cp-custom', phase: 'parallelization' });
      saveCheckpoint('/test', cp);
      expect(mockFs.writeFileSync).toHaveBeenCalled();

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(cp));

      const loaded = loadCheckpoint('/test', 'cp-custom');
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe('cp-custom');
      expect(loaded!.phase).toBe('parallelization');
    });

    it('should return null for nonexistent checkpoint', () => {
      mockFs.existsSync.mockReturnValue(false);
      const loaded = loadCheckpoint('/test', 'cp-nonexistent');
      expect(loaded).toBeNull();
    });
  });

  describe('loadLatestCheckpoint()', () => {
    it('should return latest checkpoint from latest.json', () => {
      const cp = makeCp({ id: 'cp-latest' });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(cp));

      const latest = loadLatestCheckpoint('/test');
      expect(latest).not.toBeNull();
      expect(latest!.id).toBe('cp-latest');
    });

    it('should return null when no latest checkpoint exists', () => {
      mockFs.existsSync.mockReturnValue(false);
      const latest = loadLatestCheckpoint('/test');
      expect(latest).toBeNull();
    });
  });

  describe('listCheckpoints()', () => {
    it('should return empty array when no checkpoints exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      const list = listCheckpoints('/test');
      expect(list).toEqual([]);
    });

    it('should list and sort checkpoint files by createdAt desc', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['cp-2.json', 'cp-1.json', 'latest.json']);
      const cp1 = makeCp({ id: 'cp-1', createdAt: '2026-01-01T00:00:00.000Z' });
      const cp2 = makeCp({ id: 'cp-2', createdAt: '2026-01-02T00:00:00.000Z' });
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify(cp1))
        .mockReturnValueOnce(JSON.stringify(cp2));

      const list = listCheckpoints('/test');
      expect(list).toHaveLength(2);
      expect(list[0].id).toBe('cp-2');
      expect(list[1].id).toBe('cp-1');
    });
  });

  describe('listCheckpointsByPhase()', () => {
    it('should filter checkpoints by phase', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['cp-a.json', 'cp-b.json']);
      const cpA = makeCp({ id: 'cp-a', phase: 'diagnosis', createdAt: '2026-01-01T00:00:00.000Z' });
      const cpB = makeCp({ id: 'cp-b', phase: 'structuring', createdAt: '2026-01-02T00:00:00.000Z' });
      mockFs.readFileSync
        .mockReturnValueOnce(JSON.stringify(cpA))
        .mockReturnValueOnce(JSON.stringify(cpB));

      const result = listCheckpointsByPhase('/test', 'diagnosis');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cp-a');
    });
  });

  describe('updateCheckpointStatus()', () => {
    it('should update status and return updated checkpoint', () => {
      const cp = makeCp({ id: 'cp-update', status: 'pending' });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(cp));

      const updated = updateCheckpointStatus('/test', 'cp-update', 'completed');
      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('completed');
    });

    it('should return null for nonexistent checkpoint', () => {
      mockFs.existsSync.mockReturnValue(false);
      const updated = updateCheckpointStatus('/test', 'cp-none', 'completed');
      expect(updated).toBeNull();
    });
  });

  describe('attachDecisionToCheckpoint()', () => {
    it('should attach decision and update status to completed', () => {
      const cp = makeCp({ id: 'cp-decision', status: 'needs-decision' });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(cp));

      const decision: DecisionRecord = {
        decisionRequestId: 'dr-1',
        selectedOptionId: 'opt-1',
        rationale: 'Best option',
        decidedAt: '2026-01-01T00:00:00.000Z',
      };

      const updated = attachDecisionToCheckpoint('/test', 'cp-decision', decision);
      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('completed');
    });
  });

  describe('getCheckpointMetrics()', () => {
    it('should return zero metrics when no checkpoints exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      const metrics = getCheckpointMetrics('/test');
      expect(metrics.count).toBe(0);
      expect(metrics.completed).toBe(0);
      expect(metrics.failed).toBe(0);
      expect(metrics.needsDecision).toBe(0);
    });
  });

  describe('getOrchestrationSummary()', () => {
    it('should return summary with zero values when no state exists', () => {
      mockFs.existsSync.mockReturnValue(false);
      const summary = getOrchestrationSummary('/test');
      expect(summary.totalPhases).toBe(0);
      expect(summary.currentPhase).toBe('unknown');
    });

    it('should compute progress from orchestration state', () => {
      mockFs.existsSync.mockReturnValue(true);
      const state: OrchestrationState = {
        currentPhase: 'structuring',
        version: '1.0',
        phases: [
          {
            id: 'diagnosis', name: 'Diagnosis', status: 'completed', progress: 100,
            tasks: [{
              id: 't1', name: 'Task 1', description: '', phase: 'diagnosis',
              status: 'completed', dependsOn: [], blockedBy: [],
              riskLevel: 'low', estimatedEffort: 'minutes',
              canParallelize: false, isDeterministic: true, requiresLLM: false,
            }],
            completedTasks: 1, totalTasks: 1, blockedCount: 0,
          },
        ],
        pendingDecisions: [],
        checkpoints: [],
        executionMode: 'guided',
        autonomyLevel: 'guided',
        confidence: 80,
        startedAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        metadata: {},
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(state));
      mockFs.readdirSync.mockReturnValue([]);

      const summary = getOrchestrationSummary('/test');
      expect(summary.currentPhase).toBe('structuring');
      expect(summary.totalPhases).toBe(1);
      expect(summary.completedTasks).toBe(1);
      expect(summary.overallProgress).toBe(100);
    });
  });
});
