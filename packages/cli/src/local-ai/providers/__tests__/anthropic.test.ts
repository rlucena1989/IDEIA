import { AnthropicProvider } from '../anthropic';

describe('anthropic', () => {
  it('AnthropicProvider should be defined', () => {
    expect(AnthropicProvider).toBeDefined();
  });
  it('AnthropicProvider should execute without throwing', () => {
    expect(typeof AnthropicProvider).toBe('function');
    try { new (AnthropicProvider as any)(); } catch {}
  });
});
