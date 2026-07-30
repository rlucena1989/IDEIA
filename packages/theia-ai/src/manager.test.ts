import { DefaultAiManager } from './manager';
import { AiProvider, AiRequest, AiResponse, AiStreamChunk } from './types';

jest.mock('@ideia/core-contributions', () => ({
  Emitter: jest.fn().mockImplementation(() => ({
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn(),
  })),
  Disposable: { undefined },
}));

function createMockProvider(id: string): AiProvider {
  return {
    id,
    name: `Provider ${id}`,
    chat: jest.fn().mockResolvedValue({
      content: `response-${id}`,
      finishReason: 'stop',
      latencyMs: 10,
      cached: false,
    } as AiResponse),
    streamChat: jest.fn().mockImplementation(async function* () {
      yield { content: `chunk-${id}`, finishReason: undefined };
      yield { content: '', finishReason: 'stop' };
    }),
    isAvailable: jest.fn().mockResolvedValue(true),
  };
}

describe('DefaultAiManager', () => {
  let manager: DefaultAiManager;

  beforeEach(() => {
    manager = new DefaultAiManager();
  });

  it('registerProvider stores provider and sets as default when none exists', () => {
    const provider = createMockProvider('p1');
    const disposable = manager.registerProvider(provider);
    expect(manager.getProvider('p1')).toBe(provider);
    expect(manager.getDefaultProvider()).toBe(provider);
    expect(typeof disposable.dispose).toBe('function');
  });

  it('registerProvider returns Disposable that unregisters the provider', () => {
    const provider = createMockProvider('p1');
    const disposable = manager.registerProvider(provider);
    disposable.dispose();
    expect(manager.getProvider('p1')).toBeUndefined();
  });

  it('chat dispatches to default provider and returns response', async () => {
    const provider = createMockProvider('p1');
    manager.registerProvider(provider);
    const request: AiRequest = { messages: [{ role: 'user', content: 'hello' }] };
    const response = await manager.chat(request);
    expect(provider.chat).toHaveBeenCalledWith(request);
    expect(response.content).toBe('response-p1');
  });

  it('chat throws when no provider is configured', async () => {
    await expect(manager.chat({ messages: [] })).rejects.toThrow('No AI provider configured');
  });

  it('streamChat yields chunks from the default provider', async () => {
    const provider = createMockProvider('p1');
    manager.registerProvider(provider);
    const chunks: AiStreamChunk[] = [];
    for await (const chunk of manager.streamChat({ messages: [] })) {
      chunks.push(chunk);
    }
    expect(chunks).toHaveLength(2);
    expect(chunks[0].content).toBe('chunk-p1');
    expect(chunks[1].finishReason).toBe('stop');
  });

  it('setDefaultProvider changes default and getDefaultProvider returns it', () => {
    const p1 = createMockProvider('p1');
    const p2 = createMockProvider('p2');
    manager.registerProvider(p1);
    manager.registerProvider(p2);
    expect(manager.getDefaultProvider()).toBe(p1);
    manager.setDefaultProvider('p2');
    expect(manager.getDefaultProvider()).toBe(p2);
  });
});
