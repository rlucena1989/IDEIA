import { ChatMessage, ContextItem } from '../types';
import { createLogger } from '@ideia/logger';
import { createHash } from 'crypto';
const logger = createLogger('deduplicate-trimmer');

export class DeduplicateTrimmer {
  trim(messages: ChatMessage[], context: ContextItem[]): { messages: ChatMessage[]; context: ContextItem[] } {
    const seenHashes = new Set<string>();

    const dedupedMessages = messages.filter(m => {
      const hash = this.hashContent(m.content);
      if (seenHashes.has(hash)) return false;
      seenHashes.add(hash);
      return true;
    });

    const dedupedContext = context.filter(c => {
      const hash = this.hashContent(c.content);
      if (seenHashes.has(hash)) return false;
      seenHashes.add(hash);
      return true;
    });

    return { messages: dedupedMessages, context: dedupedContext };
  }

  private hashContent(content: string): string {
    const normalized = content.replace(/\s+/g, ' ').trim().slice(0, 500);
    return createHash('md5').update(normalized).digest('hex');
  }
}
