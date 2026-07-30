import { createLogger } from '@ideia/logger';
import { IEventBus } from '@ideia/event-bus';
import { CrossSessionAnalyzer } from './cross-session';
import { PatternSuggester } from './pattern-suggester';
import { PatternStore } from './pattern-store';

const log = createLogger('pattern-detector:bus');

export function wireChatPatternDetector(
  bus: IEventBus,
  analyzer: CrossSessionAnalyzer,
  suggester: PatternSuggester,
  store: PatternStore,
): () => void {
  const subs: string[] = [];

  bus.subscribe('chat:decision', async (event: any) => {
    const payload = event.payload as Record<string, unknown> | undefined;
    const decision = payload?.decision as string ?? '';
    const context = payload?.context as string ?? '';
    if (!decision) return;
    log.info('Chat decision received for pattern analysis', { decision: decision.slice(0, 60) });
  }).then((id: any) => subs.push(id));

  bus.subscribe('pattern:detect', async (event: any) => {
    const payload = event.payload as Record<string, unknown> | undefined;
    const patterns = payload?.patterns as Array<{ type: string; description: string }> | undefined;
    if (!patterns || patterns.length === 0) return;
    const entry = (store as any).getEntry();
    for (const p of patterns) {
      const suggestion = await (suggester as any).suggest(
        p.type === 'code' ? 'code' : 'command',
        p.description,
      );
      if (suggestion) {
        entry.suggestions.push(suggestion);
        log.info('Pattern suggestion stored from event', { type: p.type });
      }
    }
  }).then((id: any) => subs.push(id));

  return () => {
    for (const id of subs) {
      bus.unsubscribe(id).catch(() => {});
    }
  };
}
