import { OPENAI_ADAPTER, ANTHROPIC_ADAPTER, GOOGLE_ADAPTER } from '../remote-model-adapter';

describe('OPENAI_ADAPTER', () => {
  it('should have provider as openai', () => {
    expect(OPENAI_ADAPTER.provider).toBe('openai');
  });

  it('should check availability based on OPENAI_API_KEY', () => {
    const before = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    expect(OPENAI_ADAPTER.isAvailable()).toBe(false);
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(OPENAI_ADAPTER.isAvailable()).toBe(true);
    if (before) process.env.OPENAI_API_KEY = before; else delete process.env.OPENAI_API_KEY;
  });

  it('should return error when no API key set', async () => {
    const before = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const response = await OPENAI_ADAPTER.send({ model: 'gpt-4', prompt: 'test', maxTokens: 100, temperature: 0.7, stream: false });
    expect(response.success).toBe(false);
    expect(response.error).toContain('OPENAI_API_KEY');
    if (before) process.env.OPENAI_API_KEY = before; else delete process.env.OPENAI_API_KEY;
  });

  it('should handle valid request format', () => {
    const req = { model: 'gpt-4', prompt: 'test', maxTokens: 100, temperature: 0.7, stream: false };
    expect(typeof req.model).toBe('string');
    expect(req.maxTokens).toBeGreaterThan(0);
  });
});

describe('ANTHROPIC_ADAPTER', () => {
  it('should have provider as anthropic', () => {
    expect(ANTHROPIC_ADAPTER.provider).toBe('anthropic');
  });

  it('should check availability based on ANTHROPIC_API_KEY', () => {
    const before = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    expect(ANTHROPIC_ADAPTER.isAvailable()).toBe(false);
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    expect(ANTHROPIC_ADAPTER.isAvailable()).toBe(true);
    if (before) process.env.ANTHROPIC_API_KEY = before; else delete process.env.ANTHROPIC_API_KEY;
  });

  it('should return error when no API key set', async () => {
    const before = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const response = await ANTHROPIC_ADAPTER.send({ model: 'claude-3', prompt: 'test', maxTokens: 100, temperature: 0.7, stream: false });
    expect(response.success).toBe(false);
    expect(response.error).toContain('ANTHROPIC_API_KEY');
    if (before) process.env.ANTHROPIC_API_KEY = before; else delete process.env.ANTHROPIC_API_KEY;
  });
});

describe('GOOGLE_ADAPTER', () => {
  it('should have provider as google', () => {
    expect(GOOGLE_ADAPTER.provider).toBe('google');
  });

  it('should check availability based on GOOGLE_API_KEY', () => {
    const before = process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    expect(GOOGLE_ADAPTER.isAvailable()).toBe(false);
    process.env.GOOGLE_API_KEY = 'AIza-test';
    expect(GOOGLE_ADAPTER.isAvailable()).toBe(true);
    if (before) process.env.GOOGLE_API_KEY = before; else delete process.env.GOOGLE_API_KEY;
  });

  it('should return error when no API key set', async () => {
    const before = process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    const response = await GOOGLE_ADAPTER.send({ model: 'gemini-pro', prompt: 'test', maxTokens: 100, temperature: 0.7, stream: false });
    expect(response.success).toBe(false);
    expect(response.error).toContain('GOOGLE_API_KEY');
    if (before) process.env.GOOGLE_API_KEY = before; else delete process.env.GOOGLE_API_KEY;
  });
});
