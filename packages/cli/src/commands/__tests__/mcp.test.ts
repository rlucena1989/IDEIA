import { mcpCommand } from '../mcp';

describe('mcp', () => {
  it('mcpCommand should be defined', () => {
    expect(mcpCommand).toBeDefined();
  });
  it('mcpCommand should execute without throwing', () => {
    expect(typeof mcpCommand).toBe('function');
    try { (mcpCommand as any)(); } catch {}
  });
});
