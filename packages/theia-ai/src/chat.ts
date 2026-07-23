import { Emitter, Disposable } from '@ideia/core-contributions';
import { AiChatParticipant, AiMessage, AiChatContext, AiResponse, AiAgent } from './types';
import { DefaultAiManager } from './manager';

export class ChatService {
  private participants = new Map<string, AiChatParticipant>();
  private messages: AiMessage[] = [];

  constructor(private aiManager: DefaultAiManager) {}

  registerParticipant(participant: AiChatParticipant): Disposable {
    this.participants.set(participant.id, participant);
    return { dispose: () => this.participants.delete(participant.id) };
  }

  async sendMessage(content: string, context?: AiChatContext): Promise<AiResponse> {
    const userMessage: AiMessage = { role: 'user', content };
    this.messages.push(userMessage);

    const response = await this.aiManager.chat({
      messages: this.messages,
      stream: false,
    });

    this.messages.push({ role: 'assistant', content: response.content });
    return response;
  }

  async sendMessageToAgent(agentId: string, content: string, context?: AiChatContext): Promise<AiResponse> {
    const participant = this.participants.get(agentId);
    if (!participant) throw new Error(`Agent not found: ${agentId}`);

    const message: AiMessage = { role: 'user', content };
    return participant.handleMessage(message, context);
  }

  clearHistory(): void {
    this.messages = [];
  }

  getHistory(): AiMessage[] {
    return [...this.messages];
  }
}
