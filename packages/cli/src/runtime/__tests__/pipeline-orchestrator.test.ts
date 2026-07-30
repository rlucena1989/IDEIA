import {
  selectPipelineMode,
  buildPipeline,
  dryRunPipeline,
  executeStages,
  formatPipelineReport,
  getStagesForMode,
  estimateTokensSaved,
  simulateStages,
  modeLabel,
  PipelineRequest,
  PipelineReport,
  PipelineConfig,
} from '../pipeline-orchestrator';

jest.mock('../classifier', () => ({
  classify: jest.fn().mockReturnValue({
    taskType: 'feature',
    confidence: 90,
    factors: [],
    secondaryTypes: [],
    requiresManualReview: false,
  }),
  extractRouting: jest.fn().mockReturnValue({
    pipeline: ['validate-request', 'generate-patch'],
    context: 'full',
    agents: ['developer'],
    budget: 'feature',
    risk: 'high',
  }),
}));

jest.mock('../budget', () => ({
  checkBudget: jest.fn(),
  formatBudgetReport: jest.fn(),
}));

function makeRequest(overrides: Partial<PipelineRequest> = {}): PipelineRequest {
  return {
    description: 'Add user authentication',
    files: ['src/auth.ts'],
    ...overrides,
  };
}

describe('pipeline-orchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('selectPipelineMode()', () => {
    it('should return forensic for security_review', () => {
      const result = selectPipelineMode('security_review');
      expect(result.mode).toBe('forensic');
      expect(result.reason).toContain('forense');
    });

    it('should return forensic for incident_response', () => {
      const result = selectPipelineMode('incident_response');
      expect(result.mode).toBe('forensic');
    });

    it('should return short for bugfix with low budget', () => {
      const result = selectPipelineMode('bugfix', { max_tokens: 40000 });
      expect(result.mode).toBe('short');
    });

    it('should return short for bugfix by default', () => {
      const result = selectPipelineMode('bugfix');
      expect(result.mode).toBe('short');
    });

    it('should return full for feature', () => {
      const result = selectPipelineMode('feature');
      expect(result.mode).toBe('full');
    });

    it('should return full for refactor', () => {
      const result = selectPipelineMode('refactor');
      expect(result.mode).toBe('full');
    });

    it('should return short for limited budget even with feature', () => {
      const result = selectPipelineMode('feature', { max_tokens: 50000 });
      expect(result.mode).toBe('short');
    });
  });

  describe('getStagesForMode()', () => {
    it('should return all stages for full mode', () => {
      const stages = getStagesForMode('full');
      expect(stages).toContain('classify');
      expect(stages).toContain('patch_generate');
      expect(stages).toContain('report');
      expect(stages).toContain('approval_gate');
    });

    it('should return reduced stages for short mode', () => {
      const stages = getStagesForMode('short');
      expect(stages).toContain('classify');
      expect(stages).toContain('patch_generate');
      expect(stages).toContain('report');
      expect(stages).not.toContain('approval_gate');
      expect(stages).not.toContain('memory_query');
    });
  });

  describe('buildPipeline()', () => {
    it('should build a pipeline config from a request', () => {
      const pipeline = buildPipeline(makeRequest());
      expect(pipeline.mode).toBe('full');
      expect(pipeline.taskType).toBe('feature');
      expect(pipeline.stages.length).toBeGreaterThan(0);
      expect(pipeline.stages[0].status).toBe('pending');
    });

    it('should use modeOverride when provided', () => {
      const pipeline = buildPipeline(makeRequest(), 'short');
      expect(pipeline.mode).toBe('short');
    });
  });

  describe('dryRunPipeline()', () => {
    it('should return a pipeline report without executing', () => {
      const report = dryRunPipeline(makeRequest());
      expect(report.mode).toBe('full');
      expect(report.allPassed).toBe(true);
      expect(report.passed).toBe(0);
      expect(report.failed).toBe(0);
      expect(report.totalDurationMs).toBe(0);
      expect(report.timestamp).toBeTruthy();
    });

    it('should include modeReason in report', () => {
      const report = dryRunPipeline(makeRequest());
      expect(report.modeReason).toBeTruthy();
    });
  });

  describe('executeStages()', () => {
    it('should execute all stages with passed status by default', () => {
      const pipeline: PipelineConfig = {
        mode: 'short',
        taskType: 'bugfix',
        stages: [
          { id: '1-classify', name: 'Classify', description: '', required: true, status: 'pending' },
          { id: '2-patch', name: 'Generate Patch', description: '', required: true, status: 'pending' },
          { id: '3-report', name: 'Report', description: '', required: true, status: 'pending' },
        ],
      };

      const report = executeStages(pipeline);
      expect(report.passed).toBe(3);
      expect(report.failed).toBe(0);
      expect(report.allPassed).toBe(true);
    });

    it('should use simulateFn when provided', () => {
      const pipeline: PipelineConfig = {
        mode: 'short',
        taskType: 'bugfix',
        stages: [
          { id: '1-test', name: 'Test', description: '', required: true, status: 'pending' },
        ],
      };

      const report = executeStages(pipeline, () => ({ id: '1-test', status: 'failed', durationMs: 50 }));
      expect(report.failed).toBe(1);
      expect(report.allPassed).toBe(false);
    });
  });

  describe('formatPipelineReport()', () => {
    it('should format a report as a markdown-like string', () => {
      const report: PipelineReport = {
        timestamp: '2026-01-01T00:00:00.000Z',
        mode: 'full',
        taskType: 'feature',
        stages: [
          { id: '1-x', name: 'Classify', description: '', required: true, status: 'passed', durationMs: 100 },
        ],
        totalDurationMs: 100,
        passed: 1,
        failed: 0,
        skipped: 0,
        allPassed: true,
        modeReason: 'Standard pipeline',
      };

      const formatted = formatPipelineReport(report);
      expect(formatted).toContain('Pipeline Report');
      expect(formatted).toContain('feature');
      expect(formatted).toContain('1 passed');
      expect(formatted).toContain('All passed');
    });
  });

  describe('simulateStages()', () => {
    it('should simulate correct number of stages', () => {
      const results = simulateStages(5);
      expect(results).toHaveLength(5);
    });

    it('should fail the specified stage', () => {
      const results = simulateStages(3, 2);
      expect(results[1].status).toBe('failed');
    });

    it('should pass all stages when no failStage', () => {
      const results = simulateStages(3);
      expect(results.every(r => r.status === 'passed')).toBe(true);
    });
  });

  describe('estimateTokensSaved()', () => {
    it('should estimate tokens saved for short mode', () => {
      const saved = estimateTokensSaved('short', 12, 5);
      expect(saved).toBe(105000); // (12 - 5) * 15000
    });

    it('should return 0 for full mode', () => {
      const saved = estimateTokensSaved('full', 12, 12);
      expect(saved).toBe(0);
    });
  });

  describe('modeLabel()', () => {
    it('should return descriptive labels', () => {
      expect(modeLabel('short')).toContain('Curto');
      expect(modeLabel('full')).toContain('Completo');
      expect(modeLabel('forensic')).toContain('Forense');
    });
  });
});
