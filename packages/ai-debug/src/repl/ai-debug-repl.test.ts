import { AIDebugRepl } from './ai-debug-repl';
import { ErrorNormalizer } from '../error-normalizer';
import { DebugContext } from '../types';

describe('AIDebugRepl', () => {
  const repl = new AIDebugRepl();
  const normalizer = new ErrorNormalizer();

  it('should respond to /help', async () => {
    const result = await repl.execute('/help', { variables: {}, stackFrames: [] });
    expect(result.type).toBe('text');
    expect(result.content).toContain('/explain');
    expect(result.content).toContain('/rootcause');
    expect(result.content).toContain('/fix');
  });

  it('should explain an error', async () => {
    const error = await normalizer.normalize(new TypeError('test error'));
    const ctx: DebugContext = { error, variables: {}, stackFrames: [] };
    const result = await repl.execute('/explain', ctx);
    expect(result.type).toBe('text');
    expect(result.content).toContain('TypeError');
  });

  it('should analyze root cause', async () => {
    const error = await normalizer.normalize(new ReferenceError('x is not defined'));
    const ctx: DebugContext = { error, variables: {}, stackFrames: [] };
    const result = await repl.execute('/rootcause', ctx);
    expect(result.type).toBe('text');
    expect(result.content).toContain('Root Cause');
    expect(result.content).toContain('Confidence');
  });

  it('should generate fix diff', async () => {
    const error = await normalizer.normalize(new TypeError('Cannot read properties of undefined'));
    const ctx: DebugContext = { error, variables: {}, stackFrames: [] };
    const result = await repl.execute('/fix', ctx);
    expect(result.type).toBe('diff');
    expect(result.content).toContain('FIX:');
  });

  it('should return error for unknown commands', async () => {
    const result = await repl.execute('/unknown', { variables: {}, stackFrames: [] });
    expect(result.type).toBe('error');
  });

  it('should return error for no context', async () => {
    const result = await repl.execute('/explain', { variables: {}, stackFrames: [] });
    expect(result.content).toContain('No error');
  });

  it('should support custom command registration', async () => {
    repl.register({
      name: 'custom', description: 'Custom test command',
      handler: async () => ({ type: 'text' as const, content: 'custom response' }),
    });
    const result = await repl.execute('/custom', { variables: {}, stackFrames: [] });
    expect(result.content).toBe('custom response');
  });

  it('should list registered commands', () => {
    const cmds = repl.getCommands();
    expect(cmds.length).toBeGreaterThanOrEqual(4);
    expect(cmds.find(c => c.name === 'help')).toBeDefined();
  });
});
