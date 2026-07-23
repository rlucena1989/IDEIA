import { ChatMessage, ContextItem } from '../types';

export interface SummarizeTrimmerConfig {
  maxMessageAgeMs: number;
  maxContextItems: number;
  summaryPrompt: string;
}

const DEFAULT_CONFIG: SummarizeTrimmerConfig = {
  maxMessageAgeMs: 300000,
  maxContextItems: 20,
  summaryPrompt: 'Resuma o histórico abaixo em até 3 frases, mantendo apenas decisões, erros e próximos passos:',
};

export class SummarizeTrimmer {
  private config: SummarizeTrimmerConfig;

  constructor(config: Partial<SummarizeTrimmerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  trim(messages: ChatMessage[], context: ContextItem[]): { messages: ChatMessage[]; context: ContextItem[] } {
    const now = Date.now();

    const oldMessages = messages.filter(m => {
      if (!m.id) return false;
      const age = now - this.parseTimestamp(m.id);
      return age > this.config.maxMessageAgeMs;
    });

    const recentMessages = messages.filter(
      m => !oldMessages.includes(m),
    );

    const summarized = oldMessages.length > 0
      ? this.buildSummaryMessage(oldMessages)
      : null;

    const trimmed: ChatMessage[] = summarized
      ? [summarized, ...recentMessages]
      : recentMessages;

    const sortedContext = [...context].sort((a, b) => b.priority - a.priority);
    const selectedContext = sortedContext.slice(0, this.config.maxContextItems);

    return { messages: trimmed, context: selectedContext };
  }

  private buildSummaryMessage(oldMessages: ChatMessage[]): ChatMessage {
    const content = oldMessages
      .filter(m => m.role !== 'system')
      .map(m => `[${m.role}] ${m.content.slice(0, 200)}`)
      .join('\n');

    return {
      role: 'system',
      content: `${this.config.summaryPrompt}\n\n${content}`,
      id: 'summary:' + Date.now(),
    };
  }

  private parseTimestamp(id: string): number {
    const ts = id.replace(/^summary:/, '');
    const num = Number(ts);
    return Number.isFinite(num) ? num : Date.now();
  }
}
