import { OllamaProvider, OpenAIProvider, createProvider } from '../src/index';

describe('createProvider', () => {
  it('creates OllamaProvider for localhost', () => {
    const p = createProvider({ endpoint: 'http://localhost:11434' });
    expect(p.name).toBe('ollama');
  });

  it('creates OpenAIProvider with apiKey', () => {
    const p = createProvider({ endpoint: 'https://api.openai.com/v1', apiKey: 'sk-placeholder-test-key' });
    expect(p.name).toBe('openai');
  });

  it('throws for OpenAI without key', () => {
    expect(() => createProvider({ endpoint: 'https://api.openai.com/v1' })).toThrow('API key');
  });
});

describe('OllamaProvider', () => {
  it('constructs correctly', () => {
    const p = new OllamaProvider({ endpoint: 'http://localhost:11434' });
    expect(p.name).toBe('ollama');
  });

  it('accepts custom model', () => {
    const p = new OllamaProvider({ endpoint: 'http://localhost:11434', defaultModel: 'llama3.1' });
    expect(p).toBeDefined();
  });
});

describe('OpenAIProvider', () => {
  it('constructs correctly', () => {
    const p = new OpenAIProvider({ endpoint: 'https://api.openai.com/v1', apiKey: 'sk-placeholder-test-key' });
    expect(p.name).toBe('openai');
  });

  it('requires apiKey', () => {
    expect(() => new OpenAIProvider({ endpoint: 'https://api.openai.com/v1', apiKey: '' })).toThrow('apiKey');
  });
});
