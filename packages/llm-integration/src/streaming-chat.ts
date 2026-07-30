export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  model?: string;
  metadata?: Record<string, unknown>;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  error?: string;
}

export interface StreamOptions {
  onChunk?: (chunk: StreamChunk) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

export class StreamingChat {
  private sessions: Map<string, ChatSession> = new Map();
  private activeControllers: Map<string, AbortController> = new Map();

  createSession(model?: string): ChatSession {
    const session: ChatSession = {
      id: this.generateId(),
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values()).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  deleteSession(sessionId: string): boolean {
    this.cancelStream(sessionId);
    return this.sessions.delete(sessionId);
  }

  addMessage(sessionId: string, role: ChatMessage['role'], content: string, metadata?: Record<string, unknown>): ChatMessage {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const message: ChatMessage = {
      id: this.generateId(),
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata,
    };

    session.messages.push(message);
    session.updatedAt = new Date().toISOString();
    return message;
  }

  async streamResponse(
    sessionId: string,
    prompt: string,
    options: StreamOptions = {}
  ): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const controller = new AbortController();
    this.activeControllers.set(sessionId, controller);

    const signal = options.signal || controller.signal;

    this.addMessage(sessionId, 'user', prompt);

    let fullContent = '';

    try {
      const response = await this.mockStreamResponse(prompt, signal);

      for await (const chunk of response) {
        if (signal.aborted) {
          throw new Error('Stream cancelled by user');
        }

        fullContent += chunk;
        
        if (options.onChunk) {
          options.onChunk({ content: chunk, done: false });
        }
      }

      if (options.onChunk) {
        options.onChunk({ content: '', done: true });
      }

      this.addMessage(sessionId, 'assistant', fullContent);

      if (options.onComplete) {
        options.onComplete(fullContent);
      }

      return fullContent;
    } catch (error) {
      if (signal.aborted) {
        const partialMessage = this.addMessage(sessionId, 'assistant', fullContent + ' [CANCELLED]');
        if (options.onError) {
          options.onError(new Error('Stream cancelled'));
        }
        return partialMessage.content;
      }

      if (options.onError) {
        options.onError(error as Error);
      }
      throw error;
    } finally {
      this.activeControllers.delete(sessionId);
    }
  }

  cancelStream(sessionId: string): boolean {
    const controller = this.activeControllers.get(sessionId);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(sessionId);
      return true;
    }
    return false;
  }

  cancelAllStreams(): void {
    for (const controller of this.activeControllers.values()) {
      controller.abort();
    }
    this.activeControllers.clear();
  }

  getActiveStreamCount(): number {
    return this.activeControllers.size;
  }

  getSessionHistory(sessionId: string): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    return session ? [...session.messages] : [];
  }

  searchSessions(query: string): ChatSession[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllSessions().filter(session =>
      session.messages.some(msg =>
        msg.content.toLowerCase().includes(lowerQuery)
      )
    );
  }

  exportSession(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return JSON.stringify(session, null, 2);
  }

  importSession(sessionJson: string): ChatSession {
    const session = JSON.parse(sessionJson) as ChatSession;
    this.sessions.set(session.id, session);
    return session;
  }

  clearOldSessions(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let deleted = 0;

    for (const [id, session] of this.sessions) {
      const age = now - new Date(session.createdAt).getTime();
      if (age > maxAgeMs) {
        this.deleteSession(id);
        deleted++;
      }
    }

    return deleted;
  }

  private async *mockStreamResponse(prompt: string, signal: AbortSignal): AsyncGenerator<string> {
    const words = [
      'Here', 'is', 'a', 'simulated', 'response', 'to', 'your', 'request.',
      'This', 'demonstrates', 'streaming', 'capabilities', 'with',
      'cancellation', 'support', 'via', 'AbortController.'
    ];

    for (const word of words) {
      if (signal.aborted) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
      yield word + ' ';
    }
  }

  private generateId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function createStreamingChat(): StreamingChat {
  return new StreamingChat();
}
