import { describe, it, expect, jest } from '@jest/globals';
import { runCommand, runStep, runWithRetry, DEFAULT_QUALITY_GATES } from '../src/command-runner';
import type { CommandConfig } from '../src/command-runner';

jest.mock('node:child_process', () => ({
  execFileSync: jest.fn(),
}));

describe('runCommand', () => {
  it('returns success result when command succeeds', () => {
    const { execFileSync } = require('node:child_process');
    execFileSync.mockReturnValue('success output\n');

    const config: CommandConfig = { command: 'echo', args: ['hello'] };
    const result = runCommand(config);

    expect(result.success).toBe(true);
    expect(result.output).toBe('success output');
    expect(result.code).toBe(0);
  });

  it('returns failure result when command throws', () => {
    const { execFileSync } = require('node:child_process');
    const error = new Error('Command failed');
    (error as any).status = 1;
    (error as any).stderr = 'error message';
    execFileSync.mockImplementation(() => { throw error; });

    const config: CommandConfig = { command: 'false' };
    const result = runCommand(config);

    expect(result.success).toBe(false);
    expect(result.code).toBe(1);
  });
});

describe('runStep', () => {
  it('returns success when fn resolves', async () => {
    const result = await runStep('test-step', async () => 'done');
    expect(result.step).toBe('test-step');
    expect(result.success).toBe(true);
    expect(result.result).toBe('done');
  });

  it('returns failure when fn rejects', async () => {
    const result = await runStep('failing-step', async () => {
      throw new Error('Step failed');
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Step failed');
  });
});

describe('runWithRetry', () => {
  it('succeeds on first attempt', async () => {
    const result = await runWithRetry('test', async () => 'ok', 3, 5000);
    expect(result.success).toBe(true);
    expect(result.result).toBe('ok');
    expect(result.attempts).toBe(1);
  });

  it('retries and eventually succeeds', async () => {
    let attempts = 0;
    const result = await runWithRetry('retry-test', async () => {
      attempts++;
      if (attempts < 3) throw new Error('Not ready');
      return 'finally';
    }, 5, 5000);

    expect(result.success).toBe(true);
    expect(result.result).toBe('finally');
    expect(result.attempts).toBe(3);
  });

  it('fails after exhausting retries', async () => {
    const result = await runWithRetry('always-fail', async () => {
      throw new Error('Always fails');
    }, 2, 1000);

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(2);
    expect(result.error).toBeDefined();
  });

  it('times out when fn takes too long', async () => {
    const result = await runWithRetry('timeout-test', async () => {
      await new Promise(r => setTimeout(r, 5000));
      return 'too late';
    }, 1, 100);

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  });
});

describe('DEFAULT_QUALITY_GATES', () => {
  it('has all expected gates', () => {
    const names = DEFAULT_QUALITY_GATES.map(g => g.name);
    expect(names).toContain('lint');
    expect(names).toContain('test');
    expect(names).toContain('build');
    expect(names).toContain('security');
    expect(names).toContain('architecture');
  });

  it('build gate is required', () => {
    const buildGate = DEFAULT_QUALITY_GATES.find(g => g.name === 'build');
    expect(buildGate?.required).toBe(true);
  });
});
