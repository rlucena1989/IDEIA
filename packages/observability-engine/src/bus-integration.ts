import { createLogger } from '@ideia/logger';
import { IEventBus } from '@ideia/event-bus';
import { SessionObserver } from './session-observer';

const log = createLogger('observability:bus-integration');

export function wireSessionObservability(bus: IEventBus, sessionObserver: SessionObserver): () => void {
  const subs: string[] = [];

  bus.subscribe('session:created', async (event: any) => {
    const payload = event.payload as Record<string, unknown> | undefined;
    const code = payload?.code as Record<string, unknown> | undefined;
    const sessionId = (code?.sessionId as string) ?? (payload?.id as string) ?? 'unknown';
    const metadata = payload as Record<string, unknown> | undefined;
    sessionObserver.onSessionCreated(sessionId, metadata);
    await bus.emit({
      type: 'observability:track',
      source: 'observability-engine',
      payload: { type: 'session_start', sessionId, timestamp: new Date().toISOString() },
    });
    log.info('Session event wired: session:created -> observability', { sessionId });
  }).then((id: any) => subs.push(id));

  return () => {
    for (const id of subs) {
      bus.unsubscribe(id).catch(() => {});
    }
  };
}
