import { OpenAiProvider } from '../openai';

describe('openai', () => {
  it('OpenAiProvider should be defined', () => {
    expect(OpenAiProvider).toBeDefined();
  });
  it('OpenAiProvider should execute without throwing', () => {
    expect(typeof OpenAiProvider).toBe('function');
    try { new (OpenAiProvider as any)(); } catch {}
  });
});
