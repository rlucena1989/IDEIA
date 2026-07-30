import { describe, it, expect } from '@jest/globals';

describe('hardening - hardening-checker', () => {
  it('runHardeningCheck retorna ok quando estado e consistencia sao validos', () => {
    const { runHardeningCheck } = require('../hardening/hardening-checker');
    const state = {
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      summary: 'OK',
      blocks: [],
      metrics: [],
      artifacts: [],
      commands: [],
      blockers: [],
      nextSteps: [],
    };
    const consistency = {
      generatedAt: '2024-01-01',
      items: [],
      summary: ['All good'],
    };

    const result = runHardeningCheck(state, consistency);
    expect(result.ok).toBe(true);
    expect(result.score).toBe(100);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('runHardeningCheck detecta falta de versao', () => {
    const { runHardeningCheck } = require('../hardening/hardening-checker');
    const state = {
      version: '',
      lastUpdated: '2024-01-01',
      summary: 'OK',
      blocks: [],
      metrics: [],
      artifacts: [],
      commands: [],
      blockers: [],
      nextSteps: [],
    };
    const consistency = { generatedAt: '2024-01-01', items: [], summary: ['OK'] };

    const result = runHardeningCheck(state, consistency);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e: { code: string }) => e.code === 'STATE_NO_VERSION')).toBe(true);
  });

  it('runHardeningCheck detecta blockers no estado', () => {
    const { runHardeningCheck } = require('../hardening/hardening-checker');
    const state = {
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      summary: 'With blockers',
      blocks: [],
      metrics: [],
      artifacts: [],
      commands: [],
      blockers: ['blocker1', 'blocker2'],
      nextSteps: [],
    };
    const consistency = { generatedAt: '2024-01-01', items: [], summary: ['OK'] };

    const result = runHardeningCheck(state, consistency);
    expect(result.warnings.some((w: { code: string }) => w.code === 'STATE_BLOCKERS')).toBe(true);
  });

  it('runHardeningCheck detecta itens blocked na consistencia', () => {
    const { runHardeningCheck } = require('../hardening/hardening-checker');
    const state = {
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      summary: 'OK',
      blocks: [],
      metrics: [],
      artifacts: [],
      commands: [],
      blockers: [],
      nextSteps: [],
    };
    const consistency = {
      generatedAt: '2024-01-01',
      items: [
        { area: 'test area', docs: 'ok', code: 'ok', tests: 'ok', cli: 'ok', extension: 'ok', status: 'blocked' as const, notes: ['Critical issue'] },
      ],
      summary: ['Has blocked items'],
    };

    const result = runHardeningCheck(state, consistency);
    expect(result.errors.some((e: { code: string }) => e.code.includes('CONSISTENCY_BLOCKED'))).toBe(true);
  });

  it('runHardeningCheck detecta itens attention na consistencia', () => {
    const { runHardeningCheck } = require('../hardening/hardening-checker');
    const state = {
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      summary: 'OK',
      blocks: [],
      metrics: [],
      artifacts: [],
      commands: [],
      blockers: [],
      nextSteps: [],
    };
    const consistency = {
      generatedAt: '2024-01-01',
      items: [
        { area: 'attention area', docs: 'ok', code: 'partial', tests: 'ok', cli: 'ok', extension: 'ok', status: 'attention' as const, notes: ['Needs review'] },
      ],
      summary: ['Has attention items'],
    };

    const result = runHardeningCheck(state, consistency);
    expect(result.warnings.some((w: { code: string }) => w.code.includes('CONSISTENCY_ATTENTION'))).toBe(true);
  });

  it('score diminui com mais issues', () => {
    const { runHardeningCheck } = require('../hardening/hardening-checker');
    const state = {
      version: '',
      lastUpdated: '2024-01-01',
      summary: 'Bad',
      blocks: [],
      metrics: [],
      artifacts: [],
      commands: [],
      blockers: ['b1', 'b2', 'b3'],
      nextSteps: [],
    };
    const consistency = {
      generatedAt: '2024-01-01',
      items: [
        { area: 'a1', docs: 'ok', code: 'ok', tests: 'ok', cli: 'ok', extension: 'ok', status: 'blocked' as const, notes: ['x'] },
        { area: 'a2', docs: 'ok', code: 'ok', tests: 'ok', cli: 'ok', extension: 'ok', status: 'attention' as const, notes: ['y'] },
      ],
      summary: ['Issues'],
    };

    const result = runHardeningCheck(state, consistency);
    expect(result.score).toBeLessThan(100);
    expect(result.ok).toBe(false);
  });
});
