import { describe, it, expect } from '@jest/globals';
import { createAnalyzeSubgraph, createPlanSubgraph, createExecuteSubgraph, createReviewSubgraph, createDeploySubgraph, createSubgraphPipeline, createSubgraph, getAvailableSubgraphs, SubgraphType } from '../src/subgraphs';

describe('Subgraphs', () => {
  describe('createAnalyzeSubgraph', () => {
    it('should create analyze subgraph with analyst and architect', async () => {
      const agent = createAnalyzeSubgraph();
      const result = await agent.invoke('Build a REST API');
      expect(result.finalState.input).toBe('Build a REST API');
      expect(result.summary.totalNodes).toBeGreaterThanOrEqual(1);
    });
  });

  describe('createPlanSubgraph', () => {
    it('should create plan subgraph with architect and programmer', async () => {
      const agent = createPlanSubgraph();
      const result = await agent.invoke('Plan microservices architecture');
      expect(result.finalState.outputs.architect).toContain('Arquitetura definida');
    });
  });

  describe('createExecuteSubgraph', () => {
    it('should create execute subgraph with programmer, reviewer, tester, devops', async () => {
      const agent = createExecuteSubgraph();
      const result = await agent.invoke('Implement login feature');
      expect(result.finalState.outputs.programmer).toContain('Implementação gerada');
    });

    it('should route back to programmer on errors', async () => {
      const agent = createExecuteSubgraph();
      agent.addNode('programmer', async () => ({
        errors: ['Simulated error'],
      }));
      const result = await agent.invoke('Test error routing');
      expect(result.summary.completedNodes).toBeGreaterThan(0);
    });
  });

  describe('createReviewSubgraph', () => {
    it('should create review subgraph', async () => {
      const agent = createReviewSubgraph();
      const result = await agent.invoke('Review this code');
      expect(result.finalState).toBeDefined();
    });
  });

  describe('createDeploySubgraph', () => {
    it('should create deploy subgraph with devops and supervisor', async () => {
      const agent = createDeploySubgraph();
      const result = await agent.invoke('Deploy to production');
      expect(result.finalState.completed).toBe(true);
    });
  });

  describe('createSubgraphPipeline', () => {
    it('should create full pipeline with all subgraphs', async () => {
      const pipeline = createSubgraphPipeline();
      const result = await pipeline.invoke('Build a full SaaS platform');
      expect(result.finalState).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('createSubgraph', () => {
    it('should create analyze subgraph by type', () => {
      const agent = createSubgraph('analyze');
      expect(agent).toBeDefined();
    });

    it('should create plan subgraph by type', () => {
      const agent = createSubgraph('plan');
      expect(agent).toBeDefined();
    });

    it('should create execute subgraph by type', () => {
      const agent = createSubgraph('execute');
      expect(agent).toBeDefined();
    });

    it('should create review subgraph by type', () => {
      const agent = createSubgraph('review');
      expect(agent).toBeDefined();
    });

    it('should create deploy subgraph by type', () => {
      const agent = createSubgraph('deploy');
      expect(agent).toBeDefined();
    });
  });

  describe('getAvailableSubgraphs', () => {
    it('should return 5 subgraph definitions', () => {
      const subgraphs = getAvailableSubgraphs();
      expect(subgraphs).toHaveLength(5);
      const types = subgraphs.map(s => s.type);
      expect(types).toContain('analyze');
      expect(types).toContain('plan');
      expect(types).toContain('execute');
      expect(types).toContain('review');
      expect(types).toContain('deploy');
    });
  });
});
