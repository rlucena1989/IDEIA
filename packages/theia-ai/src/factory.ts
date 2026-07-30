import { Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { DefaultAiManager } from './manager';
import { ChatService } from './chat';
import { AgentRegistry, AgentExecutor } from './agents';
import { DefaultAiPermissionManager, AiAuditService } from './security';

export class AiServiceFactory {
  static create(): {
    aiManager: DefaultAiManager;
    chatService: ChatService;
    agentRegistry: AgentRegistry;
    agentExecutor: AgentExecutor;
    permissionManager: DefaultAiPermissionManager;
    auditService: AiAuditService;
  } {
    const aiManager = new DefaultAiManager();
    const chatService = new ChatService(aiManager);
    const agentRegistry = new AgentRegistry();
    const agentExecutor = new AgentExecutor();
    const permissionManager = new DefaultAiPermissionManager();
    const auditService = new AiAuditService();

    return {
      aiManager,
      chatService,
      agentRegistry,
      agentExecutor,
      permissionManager,
      auditService,
    };
  }
}
