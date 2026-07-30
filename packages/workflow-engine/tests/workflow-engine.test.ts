import { describe, it, expect, beforeEach } from '@jest/globals';
import { WorkflowEngine, createWorkflowEngine } from '../src/workflow-engine';
import { Workflow, WorkflowStep, WorkflowStatus } from '../src/types';

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    engine = createWorkflowEngine();
  });

  describe('constructor', () => {
    it('should create engine with default config', () => {
      expect(engine).toBeInstanceOf(WorkflowEngine);
    });

    it('should create engine with custom config', () => {
      const engine = createWorkflowEngine({ cwd: '/custom/path' });
      expect(engine).toBeInstanceOf(WorkflowEngine);
    });
  });

  describe('createWorkflow', () => {
    it('should create workflow', () => {
      const workflow = (engine as any).createWorkflow('test-workflow', 'Test Workflow');
      expect(workflow).toBeDefined();
      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe('test-workflow');
      expect(workflow.status).toBe('pending');
    });
  });

  describe('addStep', () => {
    it('should add step to workflow', () => {
      const workflow = (engine as any).createWorkflow('test-workflow', 'Test Workflow');
      const step: WorkflowStep = {
        id: 'step-1',
        name: 'Test Step',
        status: 'pending',
        dependsOn: [],
        tags: [],
      };
      (engine as any).addStep(workflow.id, step);
      const updated = (engine as any).getWorkflow(workflow.id);
      expect(updated.steps).toHaveLength(1);
    });
  });

  describe('getWorkflow', () => {
    it('should return undefined for non-existent workflow', () => {
      const workflow = (engine as any).getWorkflow('non-existent');
      expect(workflow).toBeUndefined();
    });

    it('should return existing workflow', () => {
      const created = (engine as any).createWorkflow('test-workflow', 'Test Workflow');
      const retrieved = (engine as any).getWorkflow(created.id);
      expect(retrieved).toEqual(created);
    });
  });

  describe('listWorkflows', () => {
    it('should return empty list initially', () => {
      const workflows = (engine as any).listWorkflows();
      expect(workflows).toEqual([]);
    });

    it('should return all workflows', () => {
      (engine as any).createWorkflow('workflow-1', 'Workflow 1');
      (engine as any).createWorkflow('workflow-2', 'Workflow 2');
      const workflows = (engine as any).listWorkflows();
      expect(workflows).toHaveLength(2);
    });
  });

  describe('updateStepStatus', () => {
    it('should update step status', () => {
      const workflow = (engine as any).createWorkflow('test-workflow', 'Test Workflow');
      const step: WorkflowStep = {
        id: 'step-1',
        name: 'Test Step',
        status: 'pending',
        dependsOn: [],
        tags: [],
      };
      (engine as any).addStep(workflow.id, step);
      (engine as any).updateStepStatus(workflow.id, 'step-1', 'completed');
      const updated = (engine as any).getWorkflow(workflow.id);
      expect(updated.steps[0].status).toBe('completed');
    });
  });

  describe('getSummary', () => {
    it('should return workflow summary', () => {
      (engine as any).createWorkflow('workflow-1', 'Workflow 1');
      const summary = (engine as any).getSummary();
      expect(summary).toBeDefined();
      expect(summary.total).toBe(1);
    });

    it('should return empty summary when no workflows', () => {
      const summary = (engine as any).getSummary();
      expect(summary.total).toBe(0);
    });
  });

  describe('createWorkflowEngine', () => {
    it('should create engine instance', () => {
      const engine = createWorkflowEngine();
      expect(engine).toBeInstanceOf(WorkflowEngine);
    });
  });
});
