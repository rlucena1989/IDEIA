import { describe, it, expect } from '@jest/globals';

describe('hardening - output-contract', () => {
  it('createEnvelope cria envelope completo', () => {
    const { createEnvelope } = require('../hardening/output-contract');
    const envelope = createEnvelope({
      ok: true,
      command: 'test-command',
      version: '1.0.0',
      data: { result: 'success' },
      warnings: ['warning-1'],
      metadata: { key: 'value' },
    });

    expect(envelope.ok).toBe(true);
    expect(envelope.command).toBe('test-command');
    expect(envelope.version).toBe('1.0.0');
    expect(envelope.data).toEqual({ result: 'success' });
    expect(envelope.warnings).toEqual(['warning-1']);
    expect(envelope.metadata).toEqual({ key: 'value' });
    expect(envelope.generatedAt).toBeTruthy();
    expect(envelope.requestId).toBeTruthy();
  });

  it('createEnvelope usa defaults para campos opcionais', () => {
    const { createEnvelope } = require('../hardening/output-contract');
    const envelope = createEnvelope({
      ok: true,
      command: 'cmd',
      version: '1.0',
    });

    expect(envelope.warnings).toEqual([]);
    expect(envelope.errors).toEqual([]);
    expect(envelope.metadata).toEqual({});
    expect(envelope.data).toBeUndefined();
  });

  it('createOkOutput cria envelope de sucesso', () => {
    const { createOkOutput } = require('../hardening/output-contract');
    const envelope = createOkOutput('cmd', '1.0', { id: 1 }, ['warn']);
    expect(envelope.ok).toBe(true);
    expect(envelope.data).toEqual({ id: 1 });
    expect(envelope.warnings).toEqual(['warn']);
  });

  it('createOkOutput sem warnings', () => {
    const { createOkOutput } = require('../hardening/output-contract');
    const envelope = createOkOutput('cmd', '1.0', { id: 1 });
    expect(envelope.ok).toBe(true);
    expect(envelope.warnings).toEqual([]);
  });

  it('createErrorOutput cria envelope de erro', () => {
    const { createErrorOutput } = require('../hardening/output-contract');
    const envelope = createErrorOutput('cmd', '1.0', ['error-1', 'error-2'], ['warn']);
    expect(envelope.ok).toBe(false);
    expect(envelope.errors).toEqual(['error-1', 'error-2']);
    expect(envelope.warnings).toEqual(['warn']);
  });

  it('createErrorOutput sem warnings', () => {
    const { createErrorOutput } = require('../hardening/output-contract');
    const envelope = createErrorOutput('cmd', '1.0', ['err']);
    expect(envelope.ok).toBe(false);
    expect(envelope.errors).toEqual(['err']);
    expect(envelope.warnings).toEqual([]);
  });

  it('requestId e um UUID valido', () => {
    const { createEnvelope } = require('../hardening/output-contract');
    const envelope = createEnvelope({ ok: true, command: 'c', version: '1' });
    expect(envelope.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('generatedAt e ISO string valida', () => {
    const { createEnvelope } = require('../hardening/output-contract');
    const envelope = createEnvelope({ ok: true, command: 'c', version: '1' });
    const date = new Date(envelope.generatedAt);
    expect(date.toISOString()).toBe(envelope.generatedAt);
  });
});
