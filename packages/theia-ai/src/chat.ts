import { Emitter, Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { AiChatParticipant, AiMessage, AiChatContext, AiResponse, AiAgent, AiStreamChunk, ChatStreamOptions } from './types';
import { DefaultAiManager } from './manager';

export class ChatService {
  private participants = new Map<string, AiChatParticipant>();
  private messages: AiMessage[] = [];
  private activeController: AbortController | null = null;

  constructor(private aiManager: DefaultAiManager) {}

  get isStreaming(): boolean {
    return this.activeController !== null;
  }

  getActiveStream(): AbortController | null {
    return this.activeController;
  }

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

  async *sendMessageStream(content: string, options?: ChatStreamOptions): AsyncIterable<AiStreamChunk> {
    const userMessage: AiMessage = { role: 'user', content };
    this.messages.push(userMessage);

    const controller = new AbortController();
    this.activeController = controller;

    if (options?.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const stream = this.aiManager.streamChat({
        messages: this.messages,
        stream: true,
        signal: controller.signal,
      });

      let fullContent = '';
      for await (const chunk of stream) {
        if (controller.signal.aborted) {
          yield { content: '', done: true, finishReason: 'cancelled' };
          return;
        }
        fullContent += chunk.content;
        yield { ...chunk, done: false };
      }

      if (fullContent) {
        this.messages.push({ role: 'assistant', content: fullContent });
      }

      yield { content: '', done: true, finishReason: 'completed' };
    } finally {
      this.activeController = null;
    }
  }

  cancelStream(): void {
    if (this.activeController) {
      this.activeController.abort();
      this.activeController = null;
    }
  }

  clearHistory(): void {
    this.messages = [];
    this.cancelStream();
  }

  getHistory(): AiMessage[] {
    return [...this.messages];
  }
}
