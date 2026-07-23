import { LlmGuard, createLlmGuard } from '../src/llm-guard';

describe('LlmGuard — regex fallback', () => {
  it('should block API keys via regex fallback', async () => {
    const guard = new LlmGuard({ fallbackToRegex: true, timeoutMs: 1000 });
    const result = await guard.classify('My key is sk-abcdef1234567890abcdefgh');
    expect(result.method).toBe('regex');
    expect(result.safe).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should pass clean input via regex fallback', async () => {
    const guard = new LlmGuard({ fallbackToRegex: true, timeoutMs: 1000 });
    const result = await guard.classify('What is the capital of France?');
    expect(result.safe).toBe(true);
    expect(result.method).toBe('regex');
  });

  it('should detect destructive commands via regex', async () => {
    const guard = new LlmGuard({ fallbackToRegex: true, timeoutMs: 1000 });
    const result = await guard.classify('Run rm -rf / to clean up');
    expect(result.safe).toBe(false);
    expect(result.method).toBe('regex');
  });

  it('should return unavailable when LLM is down and no fallback', async () => {
    const guard = new LlmGuard({ fallbackToRegex: false, timeoutMs: 100, baseUrl: 'http://localhost:99999' });
    const result = await guard.classify('Hello world');
    expect(result.method).toBe('unavailable');
    expect(result.safe).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('should use configured regex fallback threshold', async () => {
    const guard = new LlmGuard({ fallbackToRegex: true, timeoutMs: 1000 });
    const result = await guard.classify('What is TypeScript?');
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe('LlmGuard — isAvailable', () => {
  it('should return false when Ollama is not running', async () => {
    const guard = new LlmGuard({ baseUrl: 'http://localhost:99999', timeoutMs: 500 });
    const available = await guard.isAvailable();
    expect(available).toBe(false);
  });
});

describe('createLlmGuard', () => {
  it('should create an instance with default config', () => {
    const guard = createLlmGuard();
    expect(guard).toBeInstanceOf(LlmGuard);
  });

  it('should accept custom config', () => {
    const guard = createLlmGuard({ model: 'llama3', timeoutMs: 10000 });
    expect(guard).toBeInstanceOf(LlmGuard);
  });
});

describe('LlmGuard — updateConfig', () => {
  it('should update configuration', () => {
    const guard = new LlmGuard();
    guard.updateConfig({ model: 'llama3', threshold: 0.9 });
    const resultPromise = guard.classify('test');
    expect(resultPromise).toBeInstanceOf(Promise);
  });
});
