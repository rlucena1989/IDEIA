import { ChatMessage, ContextItem } from '../types';

export interface PriorityRankerConfig {
  maxTokens: number;
  systemWeight: number;
  assistantWeight: number;
  userWeight: number;
  toolWeight: number;
}

const DEFAULT_CONFIG: PriorityRankerConfig = {
  maxTokens: 4000,
  systemWeight: 10,
  assistantWeight: 3,
  userWeight: 5,
  toolWeight: 1,
};

interface HasContent {
  content: string;
}

export class PriorityRanker {
  private config: PriorityRankerConfig;

  constructor(config: Partial<PriorityRankerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  rank(messages: ChatMessage[], context: ContextItem[]): { messages: ChatMessage[]; context: ContextItem[] } {
    const scoredMessages = messages.map(m => ({
      item: m,
      score: this.scoreMessage(m),
    }));

    const scoredContext = context.map(c => ({
      item: c,
      score: c.priority,
    }));

    scoredMessages.sort((a, b) => b.score - a.score);
    scoredContext.sort((a, b) => b.score - a.score);

    const selectedMessages = this.selectWithinBudget(scoredMessages, this.config.maxTokens * 0.7);
    const selectedContext = this.selectWithinBudget(scoredContext, this.config.maxTokens * 0.3);

    return {
      messages: selectedMessages.map(s => s.item as ChatMessage),
      context: selectedContext.map(s => s.item as ContextItem),
    };
  }

  private scoreMessage(m: ChatMessage): number {
    const weightMap: Record<string, number> = {
      system: this.config.systemWeight,
      assistant: this.config.assistantWeight,
      user: this.config.userWeight,
      tool: this.config.toolWeight,
    };
    const base = weightMap[m.role] ?? 1;

    const recency = m.id ? this.getRecencyScore(m.id) : 1;

    const lengthPenalty = Math.max(1, 1 - (m.content.length / 10000));

    return base * recency * lengthPenalty;
  }

  private getRecencyScore(id: string): number {
    const ts = Number(id.replace(/^summary:/, '').replace(/\D/g, ''));
    if (!Number.isFinite(ts)) return 1;
    const ageMs = Date.now() - ts;
    return Math.max(0.1, 1 - (ageMs / 3600000));
  }

  private selectWithinBudget<T extends HasContent>(
    scored: Array<{ item: T; score: number }>,
    budget: number,
  ): Array<{ item: T; score: number }> {
    const result: Array<{ item: T; score: number }> = [];
    let used = 0;

    for (const s of scored) {
      const cost = Math.ceil(s.item.content.length / 4);
      if (used + cost > budget) break;
      result.push(s);
      used += cost;
    }

    return result;
  }
}
