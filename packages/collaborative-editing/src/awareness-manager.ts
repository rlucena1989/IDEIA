import { AwarenessInfo } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('awareness-manager');

type AwarenessListener = (sessionId: string, awareness: AwarenessInfo[]) => void;

export class AwarenessManager {
  private awarenessMap: Map<string, Map<string, AwarenessInfo>> = new Map();
  private listeners: AwarenessListener[] = [];
  private activityTimers: Map<string, NodeJS.Timeout> = new Map();

  onBroadcast(listener: AwarenessListener): void {
    this.listeners.push(listener);
  }

  private emit(sessionId: string): void {
    const all = this.getAwareness(sessionId);
    for (const listener of this.listeners) {
      listener(sessionId, all);
    }
  }

  updateAwareness(sessionId: string, info: AwarenessInfo): void {
    let session = this.awarenessMap.get(sessionId);
    if (!session) {
      session = new Map();
      this.awarenessMap.set(sessionId, session);
    }
    session.set(info.participantId, info);
  }

  broadcastAwareness(sessionId: string): void {
    this.emit(sessionId);
  }

  getAwareness(sessionId: string): AwarenessInfo[] {
    const session = this.awarenessMap.get(sessionId);
    return session ? Array.from(session.values()) : [];
  }

  trackActivity(sessionId: string, participantId: string): void {
    const existing = this.awarenessMap.get(sessionId)?.get(participantId);
    if (!existing) return;

    const timerKey = `${sessionId}:${participantId}`;
    const existingTimer = this.activityTimers.get(timerKey);
    if (existingTimer) clearTimeout(existingTimer);

    existing.activity = 'editing';
    this.emit(sessionId);

    const idleTimer = setTimeout(() => {
      const info = this.awarenessMap.get(sessionId)?.get(participantId);
      if (!info) return;
      info.activity = 'idle';
      this.emit(sessionId);
    }, 30_000);

    const awayTimer = setTimeout(() => {
      const info = this.awarenessMap.get(sessionId)?.get(participantId);
      if (!info) return;
      info.activity = 'away';
      this.emit(sessionId);
    }, 5 * 60_000);

    this.activityTimers.set(timerKey, idleTimer);
    this.activityTimers.set(`${timerKey}:away`, awayTimer);
  }
}
