import { describe, it, expect } from '@jest/globals';
import { inferTaskType, createTaskSpec, validateTaskSpec } from '../task-spec';
import type { TaskSpec } from '../types';

describe('task-spec', () => {
  describe('inferTaskType', () => {
    it('should be defined', () => {
      expect(inferTaskType).toBeDefined();
    });

    it('should return tests for test-related input', () => {
      expect(inferTaskType('write unit tests')).toBe('tests');
      expect(inferTaskType('increase coverage')).toBe('tests');
    });

    it('should return refactor for refactor-related input', () => {
      expect(inferTaskType('refactor the service')).toBe('refactor');
      expect(inferTaskType('refatorar o modulo')).toBe('refactor');
    });

    it('should return audit for audit-related input', () => {
      expect(inferTaskType('audit security')).toBe('audit');
      expect(inferTaskType('fazer auditoria')).toBe('audit');
    });

    it('should return documentation for doc-related input', () => {
      expect(inferTaskType('write docs')).toBe('documentation');
      expect(inferTaskType('update documentation')).toBe('documentation');
    });

    it('should return strategy for strategy-related input', () => {
      expect(inferTaskType('define strategy')).toBe('strategy');
      expect(inferTaskType('project roadmap')).toBe('strategy');
    });

    it('should return maintenance for maintenance-related input', () => {
      expect(inferTaskType('maintain dependencies')).toBe('maintenance');
      expect(inferTaskType('manutencao do sistema')).toBe('maintenance');
    });

    it('should return execution as default', () => {
      expect(inferTaskType('random input')).toBe('execution');
      expect(inferTaskType('create something new')).toBe('execution');
    });

    it('should be case insensitive', () => {
      expect(inferTaskType('TEST')).toBe('tests');
      expect(inferTaskType('REFACTOR')).toBe('refactor');
      expect(inferTaskType('Audit')).toBe('audit');
    });
  });

  describe('createTaskSpec', () => {
    it('should be defined', () => {
      expect(createTaskSpec).toBeDefined();
    });

    it('should create a complete TaskSpec with all fields', () => {
      const spec = createTaskSpec({
        id: 'task-42',
        title: 'Add unit tests',
        description: 'Create unit tests for auth module',
        sourceDocument: 'src/auth/index.ts',
      });

      expect(spec.id).toBe('task-42');
      expect(spec.title).toBe('Add unit tests');
      expect(spec.description).toBe('Create unit tests for auth module');
      expect(spec.sourceDocument).toBe('src/auth/index.ts');
    });

    it('should infer taskType from title and description', () => {
      const spec = createTaskSpec({
        id: 't1',
        title: 'Refactor',
        description: 'Clean up the codebase',
        sourceDocument: 'src/',
      });

      expect(spec.taskType).toBe('refactor');
    });

    it('should use defaults for optional fields', () => {
      const spec = createTaskSpec({
        id: 't1',
        title: 'Task',
        description: 'Desc',
        sourceDocument: 'doc.md',
      });

      expect(spec.context).toEqual([]);
      expect(spec.inputs).toEqual([]);
      expect(spec.expectedOutputs).toEqual([]);
      expect(spec.constraints).toEqual([]);
      expect(spec.riskLevel).toBe('medium');
      expect(spec.requiresApproval).toBe(false);
    });

    it('should accept overrides for optional fields', () => {
      const spec = createTaskSpec({
        id: 't2',
        title: 'Critical task',
        description: 'audit database',
        sourceDocument: 'db/schema.sql',
        context: ['db context'],
        inputs: ['schema.sql'],
        expectedOutputs: ['report.md'],
        constraints: ['read-only'],
        riskLevel: 'critical',
        requiresApproval: true,
      });

      expect(spec.context).toEqual(['db context']);
      expect(spec.inputs).toEqual(['schema.sql']);
      expect(spec.expectedOutputs).toEqual(['report.md']);
      expect(spec.constraints).toEqual(['read-only']);
      expect(spec.riskLevel).toBe('critical');
      expect(spec.requiresApproval).toBe(true);
    });
  });

  describe('validateTaskSpec', () => {
    it('should be defined', () => {
      expect(validateTaskSpec).toBeDefined();
    });

    it('should return valid for complete task spec', () => {
      const task: TaskSpec = {
        id: 't1',
        title: 'Test',
        description: 'Desc',
        taskType: 'tests',
        sourceDocument: 'doc.md',
        context: ['ctx'],
        inputs: [],
        expectedOutputs: ['out'],
        constraints: [],
        riskLevel: 'low',
        requiresApproval: false,
      };

      const result = validateTaskSpec(task);
      expect(result.valid).toBe(true);
      expect(result.reasons).toEqual([]);
    });

    it('should return invalid for missing id', () => {
      const task: TaskSpec = {
        id: '',
        title: 'Test',
        description: 'Desc',
        taskType: 'tests',
        sourceDocument: 'doc.md',
        context: ['ctx'],
        inputs: [],
        expectedOutputs: ['out'],
        constraints: [],
        riskLevel: 'low',
        requiresApproval: false,
      };

      const result = validateTaskSpec(task);
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('Missing task id');
    });

    it('should return invalid for missing title', () => {
      const task: TaskSpec = {
        id: 't1',
        title: '',
        description: 'Desc',
        taskType: 'tests',
        sourceDocument: 'doc.md',
        context: ['ctx'],
        inputs: [],
        expectedOutputs: ['out'],
        constraints: [],
        riskLevel: 'low',
        requiresApproval: false,
      };

      const result = validateTaskSpec(task);
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('Missing title');
    });

    it('should return invalid for missing description', () => {
      const task: TaskSpec = {
        id: 't1',
        title: 'Test',
        description: '',
        taskType: 'tests',
        sourceDocument: 'doc.md',
        context: ['ctx'],
        inputs: [],
        expectedOutputs: ['out'],
        constraints: [],
        riskLevel: 'low',
        requiresApproval: false,
      };

      const result = validateTaskSpec(task);
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('Missing description');
    });

    it('should return invalid for missing source document', () => {
      const task: TaskSpec = {
        id: 't1',
        title: 'Test',
        description: 'Desc',
        taskType: 'tests',
        sourceDocument: '',
        context: ['ctx'],
        inputs: [],
        expectedOutputs: ['out'],
        constraints: [],
        riskLevel: 'low',
        requiresApproval: false,
      };

      const result = validateTaskSpec(task);
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('Missing source document');
    });

    it('should return invalid for empty context', () => {
      const task: TaskSpec = {
        id: 't1',
        title: 'Test',
        description: 'Desc',
        taskType: 'tests',
        sourceDocument: 'doc.md',
        context: [],
        inputs: [],
        expectedOutputs: ['out'],
        constraints: [],
        riskLevel: 'low',
        requiresApproval: false,
      };

      const result = validateTaskSpec(task);
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('Empty context');
    });

    it('should return invalid for empty expected outputs', () => {
      const task: TaskSpec = {
        id: 't1',
        title: 'Test',
        description: 'Desc',
        taskType: 'tests',
        sourceDocument: 'doc.md',
        context: ['ctx'],
        inputs: [],
        expectedOutputs: [],
        constraints: [],
        riskLevel: 'low',
        requiresApproval: false,
      };

      const result = validateTaskSpec(task);
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('Empty expected outputs');
    });

    it('should collect all missing fields in reasons', () => {
      const task: TaskSpec = {
        id: '',
        title: '',
        description: '',
        taskType: 'execution',
        sourceDocument: '',
        context: [],
        inputs: [],
        expectedOutputs: [],
        constraints: [],
        riskLevel: 'low',
        requiresApproval: false,
      };

      const result = validateTaskSpec(task);
      expect(result.valid).toBe(false);
      expect(result.reasons.length).toBeGreaterThanOrEqual(4);
      expect(result.reasons).toContain('Missing task id');
      expect(result.reasons).toContain('Missing title');
      expect(result.reasons).toContain('Missing description');
      expect(result.reasons).toContain('Missing source document');
    });
  });
});
