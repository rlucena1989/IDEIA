import { CompressorInput, CompressorOutput, CompressionStrategy } from '../types';
import { createLogger } from '@ideia/logger';
import { SummarizeTrimmer } from './summarize-trimmer';
import { DeduplicateTrimmer } from './deduplicate-trimmer';
import { PriorityRanker } from './priority-ranker';

export class ContextCompressor {
  private summarize = new SummarizeTrimmer();
  private deduplicate = new DeduplicateTrimmer();
  private ranker = new PriorityRanker();

  async compress(input: CompressorInput): Promise<CompressorOutput> {
    const originalTokens = this.countTokens(input.messages, input.contextItems);

    let messages = input.messages;
    let context = input.contextItems;
    const removedIds: string[] = [];

    if (input.strategy === 'full' || input.strategy === 'summarize') {
      const result = this.summarize.trim(messages, context);
      const removedMsgs = messages.filter(m => !result.messages.includes(m));
      const removedCtx = context.filter(c => !result.context.includes(c));
      removedIds.push(...removedMsgs.map(m => m.id ?? '').filter(Boolean));
      removedIds.push(...removedCtx.map(c => c.id));
      messages = result.messages;
      context = result.context;
    }

    if (input.strategy === 'full' || input.strategy === 'deduplicate') {
      const result = this.deduplicate.trim(messages, context);
      messages = result.messages;
      context = result.context;
    }

    if (input.strategy === 'full' || input.strategy === 'priority_rank') {
      this.ranker.rank(messages, context);
    }

    if (input.strategy === 'full' || input.strategy === 'budget_cut') {
      const result = this.ranker.rank(messages, context);
      messages = result.messages;
      context = result.context;
    }

    const compressedTokens = this.countTokens(messages, context);

    return {
      messages,
      contextItems: context,
      originalTokens,
      compressedTokens,
      savings: originalTokens > 0
        ? Math.round((1 - compressedTokens / originalTokens) * 100)
        : 0,
      removedIds,
    };
  }

  private countTokens(messages: unknown[], context: unknown[]): number {
    let total = 0;
    for (const m of messages) {
      const content = (m as { content?: string }).content ?? '';
      total += Math.ceil(content.length / 4);
    }
    for (const c of context) {
      const content = (c as { content?: string }).content ?? '';
      total += Math.ceil(content.length / 4);
    }
    return total;
  }
}
