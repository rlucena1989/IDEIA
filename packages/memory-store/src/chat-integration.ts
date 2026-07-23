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

export async function buildChatContext(
  userMessage: string,
  memoryStore: MemoryStore,
  detectPatterns: (records: MemoryRecord[]) => MemoryPattern[],
  cagCache?: CagCache,
): Promise<ChatContext> {
  let cagHint = '';

  if (cagCache) {
    const cached = await cagCache.semanticGet(userMessage);
    if (cached && cached.confidence > 0.85) {
      cagHint = `[CAG HINT: Similar query found in cache. Consider: ${cached.response}]`;
    }
  }

  const state = memoryStore.load();

  const relevantDecisions = memoryStore
    .list()
    .filter(r => {
      const q = userMessage.toLowerCase();
      return (
        r.summary.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q)) ||
        r.category === 'decision'
      );
    })
    .slice(0, 10);

  const projectPatterns = memoryStore
    .list()
    .filter(r => r.category === 'pattern' || r.category === 'trend')
    .slice(0, 5);

  const detectedPatterns = memoryStore.list().length > 0
    ? detectPatterns(memoryStore.list())
    : [];

  const userPreferences = state.preferences ?? {};

  const contextLines: string[] = [
    `Session: ${state.sessionId}`,
    `Active Task: ${state.activeTask ?? 'none'}`,
    '',
    ...(cagHint ? [cagHint, ''] : []),
    `--- Relevant Decisions (${relevantDecisions.length}) ---`,
    ...relevantDecisions.map(d =>
      `  [${d.category}] ${d.summary} (${d.createdAt})`,
    ),
    '',
    `--- Detected Patterns (${detectedPatterns.length}) ---`,
    ...detectedPatterns.map(p =>
      `  [${p.name}] freq=${p.frequency} conf=${p.confidence} — ${p.description}`,
    ),
    '',
    `--- Project Patterns (${projectPatterns.length}) ---`,
    ...projectPatterns.map(p =>
      `  [${p.category}] ${p.summary}`,
    ),
    '',
    `--- User Preferences ---`,
    ...Object.entries(userPreferences).map(([k, v]) =>
      `  ${k}: ${JSON.stringify(v)}`,
    ),
  ];

  return {
    sessionId: state.sessionId,
    relevantDecisions,
    detectedPatterns,
    userPreferences,
    projectPatterns,
    formattedContext: contextLines.join('\n'),
  };
}

export async function buildChatContextWithCag(
  userMessage: string,
  memoryStore: MemoryStore,
  detectPatterns: (records: MemoryRecord[]) => MemoryPattern[],
  cagCache: CagCache,
): Promise<ChatContext> {
  return buildChatContext(userMessage, memoryStore, detectPatterns, cagCache);
}
