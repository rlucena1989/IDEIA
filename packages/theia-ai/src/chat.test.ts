import { ChatService } from './chat';
import { DefaultAiManager } from './manager';
import { AiChatParticipant, AiResponse, AiProvider, AiRequest } from './types';

jest.mock('@ideia/core-contributions', () => ({
  Emitter: jest.fn().mockImplementation(() => ({
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn(),
  })),
  Disposable: { undefined },
}));

function createMockProvider(): AiProvider {
  return {
    id: 'test-provider',
    name: 'Test Provider',
    chat: jest.fn().mockImplementation((req: AiRequest) =>
      Promise.resolve({
        content: `echo: ${req.messages[req.messages.length - 1].content}`,
        finishReason: 'stop',
        latencyMs: 5,
        cached: false,
      } as AiResponse)
    ),
    streamChat: jest.fn().mockImplementation(async function* () {}),
    isAvailable: jest.fn().mockResolvedValue(true),
  };
}

function createMockParticipant(id: string): AiChatParticipant {
  return {
    id,
    name: `Agent ${id}`,
    description: `Test agent ${id}`,
    handleMessage: jest.fn().mockResolvedValue({
      content: `handled-by-${id}`,
      finishReason: 'stop',
      latencyMs: 3,
      cached: false,
    } as AiResponse),
  };
}

describe('ChatService', () => {
  let aiManager: DefaultAiManager;
  let chatService: ChatService;

  beforeEach(() => {
    aiManager = new DefaultAiManager();
    const provider = createMockProvider();
    aiManager.registerProvider(provider);
    chatService = new ChatService(aiManager);
  });

  it('sendMessage stores user and assistant messages in history', async () => {
    await chatService.sendMessage('hello');
    const history = chatService.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0]).toEqual({ role: 'user', content: 'hello' });
    expect(history[1]).toEqual({ role: 'assistant', content: 'echo: hello' });
  });

  it('sendMessage passes full history to the AI manager', async () => {
    await chatService.sendMessage('first');
    await chatService.sendMessage('second');
    expect(aiManager.getDefaultProvider()!.chat).toHaveBeenCalledTimes(2);
  });

  it('sendMessageToAgent routes message to registered participant', async () => {
    const participant = createMockParticipant('agent-1');
    chatService.registerParticipant(participant);
    const response = await chatService.sendMessageToAgent('agent-1', 'do work');
    expect(participant.handleMessage).toHaveBeenCalledWith(
      { role: 'user', content: 'do work' },
      undefined
    );
    expect(response.content).toBe('handled-by-agent-1');
  });

  it('sendMessageToAgent throws for unknown agent', async () => {
    await expect(chatService.sendMessageToAgent('unknown', 'hi')).rejects.toThrow('Agent not found: unknown');
  });

  it('clearHistory resets message history', async () => {
    await chatService.sendMessage('hello');
    expect(chatService.getHistory().length).toBeGreaterThan(0);
    chatService.clearHistory();
    expect(chatService.getHistory()).toEqual([]);
  });

  it('getHistory returns a copy (immutable)', async () => {
    await chatService.sendMessage('hello');
    const history = chatService.getHistory();
    history.push({ role: 'user', content: 'injected' });
    expect(chatService.getHistory()).toHaveLength(2);
  });
});
