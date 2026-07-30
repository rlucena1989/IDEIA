import { describe, it, expect, beforeEach } from '@jest/globals';
import { PlanningEngine } from '../src/planner';
import { createPlanningEngine } from '../src/index';
import { DecompositionStrategy } from '../src/types';

describe('PlanningEngine', () => {
  let engine: PlanningEngine;

  beforeEach(() => {
    engine = new PlanningEngine();
  });

  describe('constructor', () => {
    it('should create engine with default config', () => {
      const engine = new PlanningEngine();
      expect(engine).toBeInstanceOf(PlanningEngine);
    });

    it('should create engine with custom config', () => {
      const engine = new PlanningEngine({
        defaultStrategy: 'top_down',
        maxSteps: 20,
      });
      expect(engine).toBeInstanceOf(PlanningEngine);
      expect(engine.config.defaultStrategy).toBe('top_down');
      expect(engine.config.maxSteps).toBe(20);
    });
  });

  describe('createPlanningEngine', () => {
    it('should create engine instance', () => {
      const engine = createPlanningEngine();
      expect(engine).toBeInstanceOf(PlanningEngine);
    });
  });

  describe('decomposer', () => {
    it('should have decomposer instance', () => {
      expect(engine.decomposer).toBeDefined();
    });
  });

  describe('dependencyAnalyzer', () => {
    it('should have dependency analyzer instance', () => {
      expect(engine.dependencyAnalyzer).toBeDefined();
    });
  });

  describe('riskEstimator', () => {
    it('should have risk estimator instance', () => {
      expect(engine.riskEstimator).toBeDefined();
    });
  });

  describe('costEstimator', () => {
    it('should have cost estimator instance', () => {
      expect(engine.costEstimator).toBeDefined();
    });
  });

  describe('fallbackPlanner', () => {
    it('should have fallback planner instance', () => {
      expect(engine.fallbackPlanner).toBeDefined();
    });
  });

  describe('replanner', () => {
    it('should have replanner instance', () => {
      expect(engine.replanner).toBeDefined();
    });
  });
});
