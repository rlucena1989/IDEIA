import { describe, it, expect } from '@jest/globals';
import {
  validateTaskContext,
  validateTaskScope,
  validateDependencies,
  validateExecutionMode,
} from '../task-validator';
import type { TaskSpec } from '../types';

function makeTask(overrides: Partial<TaskSpec> = {}): TaskSpec {
  return {
    id: 't1',
    title: 'Test',
    description: 'Desc',
    taskType: 'execution',
    sourceDocument: 'doc.md',
    context: ['ctx'],
    inputs: [],
    expectedOutputs: ['out'],
    constraints: ['c1'],
    riskLevel: 'low',
    requiresApproval: false,
    ...overrides,
  };
}

describe('task-validator', () => {
  describe('validateTaskContext', () => {
    it('should be defined', () => {
      expect(validateTaskContext).toBeDefined();
    });

    it('should return valid for task with all context fields', () => {
      const result = validateTaskContext(makeTask());
      expect(result.valid).toBe(true);
      expect(result.reasons).toEqual([]);
    });

    it('should return invalid for missing sourceDocument', () => {
      const result = validateTaskContext(makeTask({ sourceDocument: '' }));
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('Missing source document');
    });

    it('should return invalid for missing context', () => {
      const result = validateTaskContext(makeTask({ context: [] }));
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('Missing context');
    });

    it('should return invalid for missing expectedOutputs', () => {
      const result = validateTaskContext(makeTask({ expectedOutputs: [] }));
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('Missing expected outputs');
    });

    it('should collect all missing fields', () => {
      const result = validateTaskContext(makeTask({
        sourceDocument: '',
        context: [],
        expectedOutputs: [],
      }));
      expect(result.valid).toBe(false);
      expect(result.reasons).toHaveLength(3);
    });
  });

  describe('validateTaskScope', () => {
    it('should be defined', () => {
      expect(validateTaskScope).toBeDefined();
    });

    it('should return valid for low risk task with no constraints', () => {
      const result = validateTaskScope(makeTask({ constraints: [], riskLevel: 'low' }));
      expect(result.valid).toBe(true);
    });

    it('should return valid for critical risk task with constraints', () => {
      const result = validateTaskScope(makeTask({ constraints: ['must be safe'], riskLevel: 'critical' }));
      expect(result.valid).toBe(true);
    });

    it('should return invalid for critical risk task without constraints', () => {
      const result = validateTaskScope(makeTask({ constraints: [], riskLevel: 'critical' }));
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('Critical task requires explicit constraints');
    });

    it('should return valid for medium risk task without constraints', () => {
      const result = validateTaskScope(makeTask({ constraints: [], riskLevel: 'medium' }));
      expect(result.valid).toBe(true);
    });
  });

  describe('validateDependencies', () => {
    it('should be defined', () => {
      expect(validateDependencies).toBeDefined();
    });

    it('should return valid for task with outputs and context', () => {
      const result = validateDependencies(makeTask());
      expect(result.valid).toBe(true);
    });

    it('should return invalid for missing expectedOutputs', () => {
      const result = validateDependencies(makeTask({ expectedOutputs: [] }));
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('No expected outputs defined \u2014 cannot validate completion');
    });

    it('should return invalid for missing context', () => {
      const result = validateDependencies(makeTask({ context: [] }));
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('No context provided \u2014 cannot validate dependencies');
    });

    it('should collect all dependency issues', () => {
      const result = validateDependencies(makeTask({ context: [], expectedOutputs: [] }));
      expect(result.valid).toBe(false);
      expect(result.reasons).toHaveLength(2);
    });
  });

  describe('validateExecutionMode', () => {
    it('should be defined', () => {
      expect(validateExecutionMode).toBeDefined();
    });

    it('should return valid for normal task', () => {
      const result = validateExecutionMode(makeTask());
      expect(result.valid).toBe(true);
    });

    it('should return valid for task requiring approval with sourceDocument', () => {
      const result = validateExecutionMode(makeTask({
        requiresApproval: true,
        sourceDocument: 'doc.md',
      }));
      expect(result.valid).toBe(true);
    });

    it('should return invalid when requiresApproval but no sourceDocument', () => {
      const result = validateExecutionMode(makeTask({
        requiresApproval: true,
        sourceDocument: '',
      }));
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('Task requires approval but has no source document for context');
    });

    it('should return invalid for critical risk without expected outputs', () => {
      const result = validateExecutionMode(makeTask({
        riskLevel: 'critical',
        expectedOutputs: [],
      }));
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('Critical task must define expected outputs before execution');
    });

    it('should collect all execution mode issues', () => {
      const result = validateExecutionMode(makeTask({
        requiresApproval: true,
        sourceDocument: '',
        riskLevel: 'critical',
        expectedOutputs: [],
      }));
      expect(result.valid).toBe(false);
      expect(result.reasons).toHaveLength(2);
    });
  });
});
