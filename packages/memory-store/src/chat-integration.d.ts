import { MemoryStore } from './memory-store';
import type { MemoryRecord, MemoryPattern } from '@ideia/contracts';
import { CagCache } from './cag-cache';
export interface ChatContext {
    sessionId: string;
    relevantDecisions: MemoryRecord[];
    detectedPatterns: MemoryPattern[];
    userPreferences: Record<string, unknown>;
    projectPatterns: MemoryRecord[];
    formattedContext: string;
}
export declare function buildChatContext(userMessage: string, memoryStore: MemoryStore, detectPatterns: (records: MemoryRecord[]) => MemoryPattern[], cagCache?: CagCache): Promise<ChatContext>;
export declare function buildChatContextWithCag(userMessage: string, memoryStore: MemoryStore, detectPatterns: (records: MemoryRecord[]) => MemoryPattern[], cagCache: CagCache): Promise<ChatContext>;
//# sourceMappingURL=chat-integration.d.ts.map