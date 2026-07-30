import { createLogger } from '@ideia/logger';
import { IEventBus } from '@ideia/event-bus';
import { SelfChatProtocol } from './self-chat-protocol';
import { KnowledgeIndexer } from './knowledge-indexer';
import {
  SelfChatMessage, SelfChatResponse,
  SelfChatConfig, SelfChatStats,
} from './types';

const log = createLogger('self-chat-service');

export class SelfChatService {
  private protocol: SelfChatProtocol;
  private indexer: KnowledgeIndexer;

  constructor(
    private eventBus?: IEventBus,
    config?: Partial<SelfChatConfig>,
  ) {
    this.protocol = new SelfChatProtocol(config, eventBus as never);
    this.indexer = new KnowledgeIndexer();
  }

  async initialize(): Promise<void> {
    await this.indexer.buildIndex();
    log.info('SelfChatService initialized', { docCount: this.indexer.documentCount });
  }

  async sendMessage(content: string): Promise<SelfChatResponse> {
    const results = await this.indexer.search(content, 5);
    const contextStr = results.length > 0
      ? `\n\nRelevant context:\n${results.map(r => `- [${r.source}] ${r.content.slice(0, 300)}`).join('\n')}`
      : '';

    const enrichedContent = content + contextStr;
    return this.protocol.sendMessage(enrichedContent);
  }

  async retrieveKnowledge(query: string, scope: 'all' | 'docs' | 'packages' = 'all', limit = 10): Promise<Array<{ content: string; source: string; score: number }>> {
    if (scope === 'docs') {
      return this.indexer.searchDocs(query, limit);
    }
    if (scope === 'packages') {
      return this.indexer.searchPackages(query, limit);
    }
    return this.indexer.search(query, limit);
  }

  async queryArchitecture(): Promise<string> {
    const resp = await this.protocol.sendMessage('Show me the architecture');
    return resp.message.content;
  }

  async queryPackages(): Promise<string> {
    const resp = await this.protocol.sendMessage('What packages exist?');
    return resp.message.content;
  }

  async queryEventBus(): Promise<string> {
    const docs = await this.retrieveKnowledge('EventBus event bus', 'docs', 3);
    const baseResponse = 'The EventBus is the backbone of IDEIA messaging, enabling pub/sub communication between all modules.';
    const contextInfo = docs.length > 0
      ? `\n\nFrom documentation:\n${docs.map(d => `- ${d.content.slice(0, 250)}`).join('\n')}`
      : '';
    return baseResponse + contextInfo;
  }

  getHistory(): SelfChatMessage[] {
    return this.protocol.getHistory();
  }

  clearHistory(): void {
    this.protocol.clearHistory();
  }

  getStats(): SelfChatStats {
    return this.protocol.getStats();
  }

  searchDocs(query: string, limit?: number): Array<{ content: string; source: string; score: number }> {
    return this.indexer.search(query, limit);
  }

  get indexedDocCount(): number {
    return this.indexer.documentCount;
  }
}

export function createSelfChatService(
  eventBus?: IEventBus,
  config?: Partial<SelfChatConfig>,
): SelfChatService {
  return new SelfChatService(eventBus, config);
}
