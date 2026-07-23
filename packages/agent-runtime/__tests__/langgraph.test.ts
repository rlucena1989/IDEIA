import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  LangGraphAgent,
  LangGraphStateAnnotation,
  createLangGraphAgent,
  createAnalystNode,
  createArchitectNode,
  createProgrammerNode,
  createReviewerNode,
  createTesterNode,
  createDevOpsNode,
  createSupervisorNode,
  createDefaultEdgeConditions,
  createReviewerTesterParallelNode,
  CheckpointManager,
  InMemoryCheckpointStorage,
  createCheckpointManager,
} from '../src';

describe('LangGraph Agent Runtime', () => {
  let agent: LangGraphAgent;
  let checkpointManager: CheckpointManager;

  beforeEach(() => {
    agent = createLangGraphAgent({
      maxIterations: 10,
      nodeTimeout: 30000,
      maxRetries: 3,
    });
    checkpointManager = createCheckpointManager(new InMemoryCheckpointStorage());
  });

  describe('LangGraphAgent', () => {
    it('should create agent with default config', () => {
      expect(agent).toBeDefined();
      const config = agent.getConfig();
      expect(config.maxIterations).toBe(10);
      expect(config.nodeTimeout).toBe(30000);
      expect(config.maxRetries).toBe(3);
    });

    it('should allow config updates', () => {
      agent.setConfig({ maxIterations: 20 });
      const config = agent.getConfig();
      expect(config.maxIterations).toBe(20);
    });

    it('should add nodes', () => {
      agent.addNode('analyst', createAnalystNode());
      agent.addNode('architect', createArchitectNode());
      agent.addNode('programmer', createProgrammerNode());
      
      const timings = agent.getTimings();
      expect(timings.length).toBe(0); // No execution yet
    });

    it('should invoke with input', async () => {
      agent.addNode('analyst', createAnalystNode());
      
      const result = await agent.invoke('Test input');
      
      expect(result).toBeDefined();
      expect(result.finalState).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.finalState.input).toBe('Test input');
    });

    it('should reset timings', () => {
      agent.addNode('analyst', createAnalystNode());
      agent.reset();
      
      const timings = agent.getTimings();
      expect(timings.length).toBe(0);
    });
  });

  describe('Node Functions', () => {
    it('should create analyst node', async () => {
      const node = createAnalystNode();
      const state: LangGraphStateAnnotation = {
        input: 'Test requirement',
        context: {},
        currentRole: 'analyst',
        outputs: {},
        decisions: [],
        artifacts: [],
        errors: [],
        completed: false,
        messages: [],
      };

      const result = await node(state);
      
      expect(result.outputs?.analyst).toContain('Analisando requisitos');
      expect(result.decisions).toHaveLength(1);
      expect(result.artifacts).toHaveLength(1);
      expect(result.artifacts?.[0].role).toBe('analyst');
    });

    it('should create architect node', async () => {
      const node = createArchitectNode();
      const state: LangGraphStateAnnotation = {
        input: 'Test requirement',
        context: {},
        currentRole: 'architect',
        outputs: { analyst: 'Analysis result' },
        decisions: [],
        artifacts: [],
        errors: [],
        completed: false,
        messages: [],
      };

      const result = await node(state);
      
      expect(result.outputs?.architect).toContain('Arquitetura definida');
      expect(result.artifacts?.[0].role).toBe('architect');
    });

    it('should create programmer node', async () => {
      const node = createProgrammerNode();
      const state: LangGraphStateAnnotation = {
        input: 'Test requirement',
        context: {},
        currentRole: 'programmer',
        outputs: { architect: 'Architecture design' },
        decisions: [],
        artifacts: [],
        errors: [],
        completed: false,
        messages: [],
      };

      const result = await node(state);
      
      expect(result.outputs?.programmer).toContain('Implementação gerada');
      expect(result.artifacts?.[0].role).toBe('programmer');
    });

    it('should create reviewer node', async () => {
      const node = createReviewerNode();
      const state: LangGraphStateAnnotation = {
        input: 'Test requirement',
        context: {},
        currentRole: 'reviewer',
        outputs: { programmer: 'Code implementation' },
        decisions: [],
        artifacts: [],
        errors: [],
        completed: false,
        messages: [],
      };

      const result = await node(state);
      
      expect(result.outputs?.reviewer).toContain('Revisão concluída');
      expect(result.artifacts?.[0].role).toBe('reviewer');
    });

    it('should create tester node', async () => {
      const node = createTesterNode();
      const state: LangGraphStateAnnotation = {
        input: 'Test requirement',
        context: {},
        currentRole: 'tester',
        outputs: { programmer: 'Code implementation' },
        decisions: [],
        artifacts: [],
        errors: [],
        completed: false,
        messages: [],
      };

      const result = await node(state);
      
      expect(result.outputs?.tester).toContain('Testes gerados');
      expect(result.artifacts?.[0].role).toBe('tester');
    });

    it('should create devops node', async () => {
      const node = createDevOpsNode();
      const state: LangGraphStateAnnotation = {
        input: 'Test requirement',
        context: {},
        currentRole: 'devops',
        outputs: {},
        decisions: [],
        artifacts: [],
        errors: [],
        completed: false,
        messages: [],
      };

      const result = await node(state);
      
      expect(result.outputs?.devops).toContain('Pipeline configurado');
      expect(result.artifacts?.[0].role).toBe('devops');
    });

    it('should create supervisor node', async () => {
      const node = createSupervisorNode();
      const state: LangGraphStateAnnotation = {
        input: 'Test requirement',
        context: {},
        currentRole: 'supervisor',
        outputs: {},
        decisions: [],
        artifacts: [],
        errors: [],
        completed: false,
        messages: [],
      };

      const result = await node(state);
      
      expect(result.decisions).toContain('Fluxo normal, sem erros');
      expect(result.completed).toBe(true);
    });

    it('should detect errors in supervisor node', async () => {
      const node = createSupervisorNode();
      const state: LangGraphStateAnnotation = {
        input: 'Test requirement',
        context: {},
        currentRole: 'supervisor',
        outputs: {},
        decisions: [],
        artifacts: [],
        errors: ['Error 1', 'Error 2'],
        completed: false,
        messages: [],
      };

      const result = await node(state);
      
      expect(result.decisions).toContain('Erros detectados: 2');
    });
  });

  describe('Edge Conditions', () => {
    it('should create default edge conditions', () => {
      const conditions = createDefaultEdgeConditions();
      
      expect(conditions).toBeDefined();
      expect(Object.keys(conditions)).toContain('analyst');
      expect(Object.keys(conditions)).toContain('architect');
      expect(Object.keys(conditions)).toContain('programmer');
      expect(Object.keys(conditions)).toContain('reviewer');
      expect(Object.keys(conditions)).toContain('tester');
      expect(Object.keys(conditions)).toContain('devops');
      expect(Object.keys(conditions)).toContain('supervisor');
    });

    it('should route reviewer to programmer on errors', () => {
      const conditions = createDefaultEdgeConditions();
      const state: LangGraphStateAnnotation = {
        input: 'Test',
        context: {},
        currentRole: 'reviewer',
        outputs: {},
        decisions: [],
        artifacts: [],
        errors: ['Test error'],
        completed: false,
        messages: [],
      };

      const next = conditions.reviewer(state);
      expect(next).toBe('programmer');
    });

    it('should route reviewer to tester without errors', () => {
      const conditions = createDefaultEdgeConditions();
      const state: LangGraphStateAnnotation = {
        input: 'Test',
        context: {},
        currentRole: 'reviewer',
        outputs: {},
        decisions: [],
        artifacts: [],
        errors: [],
        completed: false,
        messages: [],
      };

      const next = conditions.reviewer(state);
      expect(next).toBe('tester');
    });
  });

  describe('Parallel Execution', () => {
    it('should create reviewer-tester parallel node', async () => {
      const parallelNode = createReviewerTesterParallelNode();
      const state: LangGraphStateAnnotation = {
        input: 'Test requirement',
        context: {},
        currentRole: 'programmer',
        outputs: { programmer: 'Code implementation' },
        decisions: [],
        artifacts: [],
        errors: [],
        completed: false,
        messages: [],
      };

      const result = await parallelNode(state);
      
      expect(result.outputs?.reviewer).toBeDefined();
      expect(result.outputs?.tester).toBeDefined();
      expect(result.artifacts).toHaveLength(2);
    });
  });

  describe('Checkpoint Manager', () => {
    it('should save and load checkpoints', async () => {
      const state: LangGraphStateAnnotation = {
        input: 'Test',
        context: { test: 'data' },
        currentRole: 'analyst',
        outputs: {},
        decisions: [],
        artifacts: [],
        errors: [],
        completed: false,
        messages: [],
      };

      await checkpointManager.saveCheckpoint('thread-1', state);
      const loaded = await checkpointManager.loadCheckpoint('thread-1');
      
      expect(loaded).toBeDefined();
      expect(loaded?.input).toBe('Test');
      expect(loaded?.context).toEqual({ test: 'data' });
    });

    it('should return null for non-existent checkpoint', async () => {
      const loaded = await checkpointManager.loadCheckpoint('non-existent');
      expect(loaded).toBeNull();
    });

    it('should delete checkpoints', async () => {
      const state: LangGraphStateAnnotation = {
        input: 'Test',
        context: {},
        currentRole: 'analyst',
        outputs: {},
        decisions: [],
        artifacts: [],
        errors: [],
        completed: false,
        messages: [],
      };

      await checkpointManager.saveCheckpoint('thread-1', state);
      await checkpointManager.deleteCheckpoint('thread-1');
      
      const loaded = await checkpointManager.loadCheckpoint('thread-1');
      expect(loaded).toBeNull();
    });

    it('should list checkpoints', async () => {
      const state: LangGraphStateAnnotation = {
        input: 'Test',
        context: {},
        currentRole: 'analyst',
        outputs: {},
        decisions: [],
        artifacts: [],
        errors: [],
        completed: false,
        messages: [],
      };

      await checkpointManager.saveCheckpoint('thread-1', state);
      await checkpointManager.saveCheckpoint('thread-2', state);
      
      const checkpoints = await checkpointManager.listCheckpoints();
      expect(checkpoints).toHaveLength(2);
    });
  });

  describe('Integration: Full Workflow', () => {
    it('should execute complete agent workflow', async () => {
      agent.addNode('analyst', createAnalystNode());
      agent.addNode('architect', createArchitectNode());
      agent.addNode('programmer', createProgrammerNode());
      agent.addNode('reviewer', createReviewerNode());
      agent.addNode('tester', createTesterNode());
      agent.addNode('devops', createDevOpsNode());
      agent.addNode('supervisor', createSupervisorNode());

      const result = await agent.invoke('Implement a REST API for user management');
      
      expect(result.finalState).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.finalState.input).toBe('Implement a REST API for user management');
    });
  });
});
