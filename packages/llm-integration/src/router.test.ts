import { DefaultRouterEngine, DefaultFallbackChain } from './router';
import { LlmProvider, LlmProviderConfig } from './types';
import { AiMessage } from '@ideia/theia-ai';

function createMockProvider(overrides: Partial<LlmProvider> = {}): LlmProvider {
  const id = overrides.id || 'test';
  const defaultConfig: LlmProviderConfig = {
    id,
    name: overrides.name || 'Test Provider',
    capabilities: {
      maxConcurrentRequests: 1,
      requiresApiKey: false,
      supportsStreaming: false,
      supportsFunctions: false,
      supportsTools: false,
      supportsVision: false,
      supportsEmbeddings: false,
      supportsFineTuned: false,
      rateLimit: { requestsPerMinute: 10, tokensPerMinute: 1000 },
    },
  };
  return {
    id,
    name: overrides.name || 'Test Provider',
    config: defaultConfig,
    chat: jest.fn().mockResolvedValue({ id: '1', model: 'test-model', provider: id, content: 'ok', finishReason: 'stop', latencyMs: 10, cached: false, createdAt: new Date().toISOString() }),
    streamChat: jest.fn(),
    embed: jest.fn(),
    listModels: jest.fn(),
    healthCheck: jest.fn(),
    ...overrides,
  };
}

describe('DefaultRouterEngine', () => {
  let engine: DefaultRouterEngine;

  beforeEach(() => {
    engine = new DefaultRouterEngine();
  });

  it('should register a provider and emit onProviderAdded', () => {
    const addedHandler = jest.fn();
    engine.onProviderAdded(addedHandler);
    const provider = createMockProvider({ id: 'p1', name: 'P1' });
    const disposable = engine.registerProvider(provider);
    expect(engine.getProviders()).toHaveLength(1);
    expect(engine.getProviders()[0].id).toBe('p1');
    expect(addedHandler).toHaveBeenCalledWith(provider);
    disposable.dispose();
  });

  it('should remove provider when disposable is disposed', () => {
    const removedHandler = jest.fn();
    engine.onProviderRemoved(removedHandler);
    const provider = createMockProvider({ id: 'p1' });
    const disposable = engine.registerProvider(provider);
    disposable.dispose();
    expect(engine.getProviders()).toHaveLength(0);
    expect(removedHandler).toHaveBeenCalledWith('p1');
  });

  it('should return the first provider when no constraints are given', async () => {
    const p1 = createMockProvider({ id: 'p1', name: 'First' });
    const p2 = createMockProvider({ id: 'p2', name: 'Second' });
    engine.registerProvider(p1);
    engine.registerProvider(p2);
    const selected = await engine.selectProvider('any task');
    expect(selected.id).toBe('p1');
  });

  it('should select a vision-capable provider when requireVision is set', async () => {
    const noVision = createMockProvider({ id: 'p1', config: { id: 'p1', name: 'No Vision', capabilities: { maxConcurrentRequests: 1, requiresApiKey: false, supportsStreaming: false, supportsFunctions: false, supportsTools: false, supportsVision: false, supportsEmbeddings: false, supportsFineTuned: false, rateLimit: { requestsPerMinute: 10, tokensPerMinute: 1000 } } } });
    const withVision = createMockProvider({ id: 'p2', config: { id: 'p2', name: 'Has Vision', capabilities: { maxConcurrentRequests: 1, requiresApiKey: false, supportsStreaming: false, supportsFunctions: false, supportsTools: false, supportsVision: true, supportsEmbeddings: false, supportsFineTuned: false, rateLimit: { requestsPerMinute: 10, tokensPerMinute: 1000 } } } });
    engine.registerProvider(noVision);
    engine.registerProvider(withVision);
    const selected = await engine.selectProvider('task', { requireVision: true });
    expect(selected.id).toBe('p2');
  });

  it('should select a functions-capable provider when requireFunctions is set', async () => {
    const noFn = createMockProvider({ id: 'p1', config: { id: 'p1', name: 'No Functions', capabilities: { maxConcurrentRequests: 1, requiresApiKey: false, supportsStreaming: false, supportsFunctions: false, supportsTools: false, supportsVision: false, supportsEmbeddings: false, supportsFineTuned: false, rateLimit: { requestsPerMinute: 10, tokensPerMinute: 1000 } } } });
    const withFn = createMockProvider({ id: 'p2', config: { id: 'p2', name: 'Has Functions', capabilities: { maxConcurrentRequests: 1, requiresApiKey: false, supportsStreaming: false, supportsFunctions: true, supportsTools: false, supportsVision: false, supportsEmbeddings: false, supportsFineTuned: false, rateLimit: { requestsPerMinute: 10, tokensPerMinute: 1000 } } } });
    engine.registerProvider(noFn);
    engine.registerProvider(withFn);
    const selected = await engine.selectProvider('task', { requireFunctions: true });
    expect(selected.id).toBe('p2');
  });

  it('should throw when no providers are registered', async () => {
    await expect(engine.selectProvider('task')).rejects.toThrow('No providers registered');
  });
});

describe('DefaultFallbackChain', () => {
  let providerMap: Map<string, LlmProvider>;

  beforeEach(() => {
    providerMap = new Map();
  });

  it('should execute on the first provider in fallback order', async () => {
    const p1 = createMockProvider({ id: 'p1' });
    providerMap.set('p1', p1);
    const messages: AiMessage[] = [{ role: 'user', content: 'hello' }];
    const chain = new DefaultFallbackChain(providerMap);
    chain.setFallbackOrder(['p1']);
    const result = await chain.execute('test-model', messages);
    expect(result.content).toBe('ok');
    expect(p1.chat).toHaveBeenCalledWith('test-model', messages, undefined);
  });

  it('should fall back to the next provider on failure', async () => {
    const p1 = createMockProvider({ id: 'p1' });
    const p2 = createMockProvider({ id: 'p2' });
    (p1.chat as jest.Mock).mockRejectedValue(new Error('p1 failed'));
    providerMap.set('p1', p1);
    providerMap.set('p2', p2);
    const chain = new DefaultFallbackChain(providerMap);
    chain.setFallbackOrder(['p1', 'p2']);
    const result = await chain.execute('test-model', [{ role: 'user', content: 'hello' }]);
    expect(result.provider).toBe('p2');
  });

  it('should throw when all providers fail', async () => {
    const p1 = createMockProvider({ id: 'p1' });
    const p2 = createMockProvider({ id: 'p2' });
    (p1.chat as jest.Mock).mockRejectedValue(new Error('p1 failed'));
    (p2.chat as jest.Mock).mockRejectedValue(new Error('p2 failed'));
    providerMap.set('p1', p1);
    providerMap.set('p2', p2);
    const chain = new DefaultFallbackChain(providerMap);
    chain.setFallbackOrder(['p1', 'p2']);
    await expect(chain.execute('test-model', [{ role: 'user', content: 'hello' }])).rejects.toThrow('p2 failed');
  });

  it('should skip unregistered providers in fallback order', async () => {
    const p2 = createMockProvider({ id: 'p2' });
    providerMap.set('p2', p2);
    const chain = new DefaultFallbackChain(providerMap);
    chain.setFallbackOrder(['p1', 'p2']);
    const result = await chain.execute('test-model', [{ role: 'user', content: 'hello' }]);
    expect(result.provider).toBe('p2');
  });
});
