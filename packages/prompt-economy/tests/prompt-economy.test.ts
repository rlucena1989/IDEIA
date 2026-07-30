import { describe, it, expect, beforeEach } from '@jest/globals';
import { PromptEconomy, createPromptEconomy } from '../src/index';
import { ComplexityLevel, TaskType } from '../src/types';

describe('PromptEconomy', () => {
  let economy: PromptEconomy;

  beforeEach(() => {
    economy = new PromptEconomy();
  });

  describe('constructor', () => {
    it('should create economy with default config', () => {
      expect(economy).toBeInstanceOf(PromptEconomy);
      expect(economy.compressor).toBeDefined();
      expect(economy.budgetManager).toBeDefined();
      expect(economy.budgetTracker).toBeDefined();
      expect(economy.earlyExit).toBeDefined();
      expect(economy.router).toBeDefined();
      expect(economy.cache).toBeDefined();
    });

    it('should create economy with custom config', () => {
      const economy = new PromptEconomy({
        defaultBudget: 8000,
        enableCompression: false,
      });
      expect(economy.config.defaultBudget).toBe(8000);
      expect(economy.config.enableCompression).toBe(false);
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost for task', async () => {
      const estimate = await economy.estimateCost(TaskType.Coding, ComplexityLevel.N2);
      expect(estimate).toBeDefined();
      expect(estimate.maxTokens).toBeGreaterThan(0);
      expect(estimate.estimatedTokens).toBeGreaterThan(0);
      expect(estimate.pipelineStages).toBeDefined();
      expect(Array.isArray(estimate.pipelineStages)).toBe(true);
    });

    it('should estimate cost for different complexity levels', async () => {
      const n0 = await economy.estimateCost(TaskType.Coding, ComplexityLevel.N0);
      const n5 = await economy.estimateCost(TaskType.Coding, ComplexityLevel.N5);
      expect(n5.maxTokens).toBeGreaterThan(n0.maxTokens);
    });
  });

  describe('compressor', () => {
    it('should have compressor instance', () => {
      expect(economy.compressor).toBeDefined();
    });
  });

  describe('budgetManager', () => {
    it('should have budget manager instance', () => {
      expect(economy.budgetManager).toBeDefined();
    });
  });

  describe('budgetTracker', () => {
    it('should have budget tracker instance', () => {
      expect(economy.budgetTracker).toBeDefined();
    });
  });

  describe('earlyExit', () => {
    it('should have early exit instance', () => {
      expect(economy.earlyExit).toBeDefined();
    });
  });

  describe('router', () => {
    it('should have router instance', () => {
      expect(economy.router).toBeDefined();
    });
  });

  describe('cache', () => {
    it('should have cache instance', () => {
      expect(economy.cache).toBeDefined();
    });
  });

  describe('config', () => {
    it('should have config with default values', () => {
      expect(economy.config.defaultBudget).toBe(4000);
      expect(economy.config.enableCompression).toBe(true);
      expect(economy.config.enableEarlyExit).toBe(true);
      expect(economy.config.enableCache).toBe(true);
      expect(economy.config.enableRouting).toBe(true);
    });
  });
});

describe('createPromptEconomy', () => {
  it('should create economy instance', () => {
    const economy = createPromptEconomy();
    expect(economy).toBeInstanceOf(PromptEconomy);
  });

  it('should create economy with custom config', () => {
    const economy = createPromptEconomy({
      defaultBudget: 10000,
    });
    expect(economy.config.defaultBudget).toBe(10000);
  });
});
