import { AiServiceFactory } from './factory';
import { DefaultAiManager } from './manager';
import { ChatService } from './chat';
import { AgentRegistry, AgentExecutor } from './agents';
import { DefaultAiPermissionManager, AiAuditService } from './security';
import { AiProvider, AiResponse} from './types';

jest.mock('@ideia/core-contributions', () => ({
  Emitter: jest.fn().mockImplementation(() => ({
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn(),
  })),
  Disposable: { undefined },
}));

describe('AiServiceFactory', () => {
  let services: ReturnType<typeof AiServiceFactory.create>;

  beforeEach(() => {
    services = AiServiceFactory.create();
  });

  it('create returns all expected service instances', () => {
    expect(services.aiManager).toBeInstanceOf(DefaultAiManager);
    expect(services.chatService).toBeInstanceOf(ChatService);
    expect(services.agentRegistry).toBeInstanceOf(AgentRegistry);
    expect(services.agentExecutor).toBeInstanceOf(AgentExecutor);
    expect(services.permissionManager).toBeInstanceOf(DefaultAiPermissionManager);
    expect(services.auditService).toBeInstanceOf(AiAuditService);
  });

  it('chatService is wired with the same aiManager instance', async () => {
    const provider: AiProvider = {
      id: 'factory-test',
      name: 'Factory Test',
      chat: jest.fn().mockResolvedValue({
        content: 'factory-ok',
        finishReason: 'stop',
        latencyMs: 0,
        cached: false,
      } as AiResponse),
      streamChat: jest.fn().mockImplementation(async function* () {}),
      isAvailable: jest.fn().mockResolvedValue(true),
    };
    services.aiManager.registerProvider(provider);
    const response = await services.chatService.sendMessage('from factory');
    expect(response.content).toBe('factory-ok');
  });

  it('services are independent instances each time create is called', () => {
    const services2 = AiServiceFactory.create();
    services.aiManager.registerProvider({
      id: 'p1', name: 'P1',
      chat: jest.fn(), streamChat: jest.fn(async function* () {}), isAvailable: jest.fn(),
    });
    expect(services2.aiManager.getProviders()).toHaveLength(0);
  });
});
