import { MOCK_ADAPTER, LLMRequest } from '../llm-adapter';
import { OLLAMA_ADAPTER, LOCAL_MOCK_ADAPTER } from '../local-model-adapter';

const sampleRequest: LLMRequest = {
  model: 'test-model',
  prompt: 'Hello, world!',
  maxTokens: 100,
  temperature: 0.7,
  stream: false,
};

describe('MOCK_ADAPTER', () => {
  it('should have provider as mock', () => {
    expect(MOCK_ADAPTER.provider).toBe('mock');
  });

  it('should be available', () => {
    expect(MOCK_ADAPTER.isAvailable()).toBe(true);
  });

  it('should send request and return response', async () => {
    const response = await MOCK_ADAPTER.send(sampleRequest);
    expect(response.success).toBe(true);
    expect(response.content).toContain('[mock]');
    expect(response.tokensUsed).toBeGreaterThan(0);
    expect(response.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should include prompt length in response', async () => {
    const response = await MOCK_ADAPTER.send(sampleRequest);
    expect(response.content).toContain(String(sampleRequest.prompt.length));
  });

  it('should handle empty prompt', async () => {
    const req: LLMRequest = { ...sampleRequest, prompt: '' };
    const response = await MOCK_ADAPTER.send(req);
    expect(response.success).toBe(true);
  });

  it('should handle large maxTokens', async () => {
    const req: LLMRequest = { ...sampleRequest, maxTokens: 100000 };
    const response = await MOCK_ADAPTER.send(req);
    expect(response.success).toBe(true);
    expect(Number.isFinite(response.latencyMs)).toBe(true);
  });
});

describe('LOCAL_MOCK_ADAPTER', () => {
  it('should have provider as local', () => {
    expect(LOCAL_MOCK_ADAPTER.provider).toBe('local');
  });

  it('should be available', () => {
    expect(LOCAL_MOCK_ADAPTER.isAvailable()).toBe(true);
  });

  it('should send request and return simulated response', async () => {
    const response = await LOCAL_MOCK_ADAPTER.send(sampleRequest);
    expect(response.success).toBe(true);
    expect(response.content).toContain('[local]');
    expect(response.tokensUsed).toBeGreaterThan(0);
  });

  it('should truncate long prompts in content', async () => {
    const longPrompt = 'x'.repeat(200);
    const response = await LOCAL_MOCK_ADAPTER.send({ ...sampleRequest, prompt: longPrompt });
    expect(response.content).toContain('...');
  });
});

describe('OLLAMA_ADAPTER', () => {
  it('should have provider as ollama', () => {
    expect(OLLAMA_ADAPTER.provider).toBe('ollama');
  });

  it('should be available or not based on ollama installation', () => {
    expect(typeof OLLAMA_ADAPTER.isAvailable()).toBe('boolean');
  });

  it('should handle send failure gracefully', async () => {
    const response = await OLLAMA_ADAPTER.send(sampleRequest);
    expect(response.success).toBe(false);
  });
});
