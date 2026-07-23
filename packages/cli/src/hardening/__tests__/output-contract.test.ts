import { describe, it, expect } from '@jest/globals';
import { createOkOutput, createErrorOutput, createEnvelope } from '../output-contract';

describe('output-contract', () => {
  it('createOkOutput should be defined', () => {
    expect(createOkOutput).toBeDefined();
  });

  it('createEnvelope should be defined', () => {
    expect(createEnvelope).toBeDefined();
  });

  it('should create a valid ok output envelope', () => {
    const output = createOkOutput('test command', '1.0.0', { key: 'value' });
    expect(output.ok).toBe(true);
    expect(output.command).toBe('test command');
    expect(output.version).toBe('1.0.0');
    expect(output.data).toEqual({ key: 'value' });
    expect(output.generatedAt).toBeDefined();
  });

  it('should create a valid error output envelope', () => {
    const output = createErrorOutput('test command', '1.0.0', ['Algo deu errado']);
    expect(output.ok).toBe(false);
    expect(output.errors).toContain('Algo deu errado');
    expect(output.data).toBeUndefined();
  });

  it('should include warnings when provided', () => {
    const output = createOkOutput('cmd', '1.0.0', {}, ['Aviso 1']);
    expect(output.warnings).toContain('Aviso 1');
  });

  it('should generate requestId', () => {
    const output = createOkOutput('cmd', '1.0.0', {});
    expect(output.requestId).toBeDefined();
    expect(typeof output.requestId).toBe('string');
  });

  it('should include metadata when provided via createEnvelope', () => {
    const output = createEnvelope({
      ok: true,
      command: 'cmd',
      version: '1.0.0',
      data: {},
      metadata: { duration: 150, cached: false },
    });
    expect(output.metadata).toEqual({ duration: 150, cached: false });
  });

  it('createEnvelope should default empty arrays', () => {
    const output = createEnvelope({ ok: true, command: 'cmd', version: '1.0.0' });
    expect(output.warnings).toEqual([]);
    expect(output.errors).toEqual([]);
    expect(output.metadata).toEqual({});
  });
});
