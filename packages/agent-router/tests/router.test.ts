import { describe, it, expect, beforeEach } from '@jest/globals';
import { AgentRouter, createAgentRouter } from '../src/router';
import { ComplexityCriteria, ComplexityLevel, AgentRole } from '../src/types';

describe('AgentRouter', () => {
  let router: AgentRouter;

  beforeEach(() => {
    router = createAgentRouter();
  });

  describe('constructor', () => {
    it('should create router with default config', () => {
      expect(router).toBeInstanceOf(AgentRouter);
      expect(router.config.defaultLevel).toBe('N2');
    });

    it('should create router with custom config', () => {
      const router = createAgentRouter({ defaultLevel: 'N3' });
      expect(router.config.defaultLevel).toBe('N3');
    });
  });

  describe('classify', () => {
    it('should classify complexity criteria', () => {
      const criteria: ComplexityCriteria = {
        fileCount: 5,
        riskLevel: 'low',
        estimatedSteps: 10,
        requiresHistoricalContext: false,
        environmentSensitivity: 'dev',
        dependencies: 2,
        hasUI: false,
        hasDatabase: false,
        hasExternalAPI: false,
      };
      const result = router.classify(criteria);
      expect(result).toBeDefined();
      expect(result.level).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });

  describe('selectRoute', () => {
    it('should select route for complexity level', () => {
      const pipeline = router.selectRoute('N2');
      expect(pipeline).toBeDefined();
      expect(pipeline.level).toBe('N2');
      expect(pipeline.requiredAgents).toBeDefined();
      expect(Array.isArray(pipeline.requiredAgents)).toBe(true);
    });
  });

  describe('resolveConsensus', () => {
    it('should resolve consensus from opinions', () => {
      const opinions = [
        {
          agentRole: 'analyst' as AgentRole,
          decision: 'approve',
          confidence: 0.9,
          evidence: ['evidence-1'],
        },
        {
          agentRole: 'architect' as AgentRole,
          decision: 'approve',
          confidence: 0.85,
          evidence: ['evidence-2'],
        },
      ];
      const result = router.resolveConsensus(opinions);
      expect(result).toBeDefined();
      expect(result.reached).toBeDefined();
      expect(result.finalDecision).toBeDefined();
    });
  });

  describe('fuseResults', () => {
    it('should fuse agent results', () => {
      const inputs = [
        {
          agentRole: 'programmer' as AgentRole,
          output: 'code output',
          confidence: 0.9,
          artifacts: ['artifact-1'],
        },
      ];
      const result = router.fuseResults(inputs);
      expect(result).toBeDefined();
      expect(result.merged).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });

  describe('getPipelineForCriteria', () => {
    it('should return classification and pipeline', () => {
      const criteria: ComplexityCriteria = {
        fileCount: 5,
        riskLevel: 'low',
        estimatedSteps: 10,
        requiresHistoricalContext: false,
        environmentSensitivity: 'dev',
        dependencies: 2,
        hasUI: false,
        hasDatabase: false,
        hasExternalAPI: false,
      };
      const result = router.getPipelineForCriteria(criteria);
      expect(result).toBeDefined();
      expect(result.classification).toBeDefined();
      expect(result.pipeline).toBeDefined();
      expect(result.pipeline.level).toBe(result.classification.level);
    });
  });

  describe('classifier', () => {
    it('should have classifier instance', () => {
      expect(router.classifier).toBeDefined();
    });
  });

  describe('routeSelector', () => {
    it('should have route selector instance', () => {
      expect(router.routeSelector).toBeDefined();
    });
  });

  describe('consensusEngine', () => {
    it('should have consensus engine instance', () => {
      expect(router.consensusEngine).toBeDefined();
    });
  });

  describe('fusionEngine', () => {
    it('should have fusion engine instance', () => {
      expect(router.fusionEngine).toBeDefined();
    });
  });
});

describe('createAgentRouter', () => {
  it('should create router instance', () => {
    const router = createAgentRouter();
    expect(router).toBeInstanceOf(AgentRouter);
  });

  it('should create router with config', () => {
    const router = createAgentRouter({ defaultLevel: 'N4' });
    expect(router).toBeInstanceOf(AgentRouter);
    expect(router.config.defaultLevel).toBe('N4');
  });
});
