process.env.GTI_TEST_MODE = '1';

import { optimizeCommand } from '../optimize';
import { runOptimizerPipeline, runWithBudgetEnforcement, readJson, readRequestJson, loadBudgetConfig, estimateTokensFromRequest } from '../optimize-pipeline';
import { getIO, resetIO } from '../../io';
import { DEFAULT_BUDGET } from '../../runtime/budget';
import type { MockFileSystem } from '../../io/mock';

jest.mock('node:child_process', () => ({
  spawnSync: jest.fn(() => ({ status: 0, stdout: '', stderr: '' })),
  execSync: jest.fn(() => ({ toString: () => 'mocked' })),
}));

function fs(): MockFileSystem { return (getIO() as any).fs; }

describe('optimize', () => {
  beforeEach(() => { resetIO(); });

  describe('optimizeCommand', () => {
    it('should be defined', () => {
      expect(optimizeCommand).toBeDefined();
    });
    it('should return a Command instance', () => {
      const cmd = optimizeCommand();
      expect(cmd.name()).toBe('optimize');
    });
  });

  describe('estimateTokensFromRequest', () => {
    it('should return 0 for empty request', () => {
      expect(estimateTokensFromRequest({})).toBe(0);
    });
    it('should count description tokens', () => {
      const req = { description: 'Implement login page' };
      expect(estimateTokensFromRequest(req)).toBe(5);
    });
    it('should count files array', () => {
      const req = { files: ['src/login.ts', 'src/login.test.ts'] };
      expect(estimateTokensFromRequest(req)).toBeGreaterThan(0);
    });
    it('should count title tokens', () => {
      const req = { title: 'Add user authentication' };
      expect(estimateTokensFromRequest(req)).toBe(Math.ceil(22 * 0.25));
    });
    it('should count labels as string', () => {
      const req = { labels: 'auth,security,frontend' };
      expect(estimateTokensFromRequest(req)).toBe(Math.ceil(22 * 0.25));
    });
    it('should count labels as array', () => {
      const req = { labels: ['auth', 'security'] };
      expect(estimateTokensFromRequest(req)).toBe(3);
    });
    it('should combine all fields', () => {
      const req = { title: 'Login', description: 'Add login form with validation', files: ['src/login.ts', 'src/utils.ts'], labels: ['auth'] };
      expect(estimateTokensFromRequest(req)).toBeGreaterThan(0);
    });
  });

  describe('readJson', () => {
    it('should return null when file does not exist', () => {
      expect(readJson('/nonexistent.json')).toBeNull();
    });
    it('should parse valid JSON', () => {
      const io = fs();
      io._addFile('/test/data.json', JSON.stringify({ key: 'value', num: 42 }));
      expect(readJson('/test/data.json')).toEqual({ key: 'value', num: 42 });
    });
    it('should return null for malformed JSON', () => {
      const io = fs();
      io._addFile('/test/bad.json', '{invalid}');
      expect(readJson('/test/bad.json')).toBeNull();
    });
  });

  describe('readRequestJson', () => {
    it('should return null when file does not exist', () => {
      expect(readRequestJson('/nonexistent.json')).toBeNull();
    });
    it('should parse valid request JSON', () => {
      const io = fs();
      io._addFile('/test/req.json', JSON.stringify({ task: 'test', priority: 'high' }));
      expect(readRequestJson('/test/req.json')).toEqual({ task: 'test', priority: 'high' });
    });
    it('should return null for malformed JSON', () => {
      const io = fs();
      io._addFile('/test/bad.json', '{bad json');
      expect(readRequestJson('/test/bad.json')).toBeNull();
    });
  });

  describe('loadBudgetConfig', () => {
    it('should return DEFAULT_BUDGET when no budget file exists', () => {
      resetIO();
      const budget = loadBudgetConfig('/nonexistent/project');
      expect(budget).toBeDefined();
      expect(typeof budget.max_tokens).toBe('number');
      expect(typeof budget.max_agents).toBe('number');
    });
    it('should merge budget from file when it exists', () => {
      const io = fs();
      io._addDir('/project/.ai/optimizer');
      io._addFile('/project/.ai/optimizer/budget.yaml', JSON.stringify({ max_tokens: 500000, max_runtime_seconds: 600 }));
      const budget = loadBudgetConfig('/project');
      expect(budget.max_tokens).toBe(500000);
      expect(budget.max_runtime_seconds).toBe(600);
    });
    it('should keep defaults for fields not in budget file', () => {
      const io = fs();
      io._addDir('/project/.ai/optimizer');
      io._addFile('/project/.ai/optimizer/budget.yaml', JSON.stringify({ max_tokens: 99999 }));
      const budget = loadBudgetConfig('/project');
      expect(budget.max_tokens).toBe(99999);
      expect(budget.max_agents).toBeDefined();
    });
  });

  describe('runOptimizerPipeline', () => {
    it('should skip missing steps and pass when all found succeed', () => {
      const io = fs();
      io._addDir('/project/.ai/optimizer/bin');
      io._addFile('/project/.ai/optimizer/bin/validate-request.js', '');
      io._addFile('/project/.ai/optimizer/bin/analyze-impact.js', '');
      const result = runOptimizerPipeline('/test/req.json', '/project');
      expect(result).toBe(true);
    });
    it('should return false when a step fails', () => {
      const cp = require('node:child_process');
      cp.spawnSync.mockReturnValue({ status: 1, stdout: '', stderr: 'error' });
      const io = fs();
      io._addDir('/project/.ai/optimizer/bin');
      io._addFile('/project/.ai/optimizer/bin/validate-request.js', '');
      const result = runOptimizerPipeline('/test/req.json', '/project');
      expect(result).toBe(false);
      cp.spawnSync.mockReturnValue({ status: 0, stdout: '', stderr: '' });
    });
  });

  describe('runWithBudgetEnforcement', () => {
    const defaultBudget: typeof DEFAULT_BUDGET = { ...DEFAULT_BUDGET, max_agents: 10, max_runtime_seconds: 300 };
    const tightBudget: typeof DEFAULT_BUDGET = { ...DEFAULT_BUDGET, max_tokens: 1000, max_runtime_seconds: 1, max_agents: 1 };

    it('should succeed when within budget', () => {
      const io = fs();
      io._addDir('/project/.ai/optimizer/bin');
      io._addFile('/project/.ai/optimizer/bin/validate-request.js', '');
      const result = runWithBudgetEnforcement('/test/req.json', '/project', defaultBudget);
      expect(result).toBe(true);
    });
    it('should return false when agent limit reached', () => {
      const io = fs();
      io._addDir('/project/.ai/optimizer/bin');
      io._addFile('/project/.ai/optimizer/bin/validate-request.js', '');
      io._addFile('/project/.ai/optimizer/bin/analyze-impact.js', '');
      const result = runWithBudgetEnforcement('/test/req.json', '/project', tightBudget);
      expect(result).toBe(false);
    });
    it('should return false when step fails', () => {
      const cp = require('node:child_process');
      cp.spawnSync.mockReturnValue({ status: 1, stdout: '', stderr: '' });
      const io = fs();
      io._addDir('/project/.ai/optimizer/bin');
      io._addFile('/project/.ai/optimizer/bin/validate-request.js', '');
      const result = runWithBudgetEnforcement('/test/req.json', '/project', defaultBudget);
      expect(result).toBe(false);
      cp.spawnSync.mockReturnValue({ status: 0, stdout: '', stderr: '' });
    });
    it('should skip steps that do not exist', () => {
      const io = fs();
      io._addDir('/project/.ai/optimizer/bin');
      const result = runWithBudgetEnforcement('/test/req.json', '/project', tightBudget);
      expect(result).toBe(true);
    });
  });
});
