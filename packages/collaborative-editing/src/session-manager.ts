import { CollaborationSession, Participant } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('session-manager');

type SessionEvent = 'session.created' | 'participant.joined' | 'participant.left' | 'session.ended';
type SessionListener = (session: CollaborationSession, data?: unknown) => void;

export class CollaborationSessionManager {
  private sessions: Map<string, CollaborationSession> = new Map();
  private listeners: Map<SessionEvent, SessionListener[]> = new Map();

  on(event: SessionEvent, listener: SessionListener): void {
    const existing = this.listeners.get(event) ?? [];
    existing.push(listener);
    this.listeners.set(event, existing);
  }

  private emit(event: SessionEvent, session: CollaborationSession, data?: unknown): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        listener(session, data);
      }
    }
  }

  createSession(documentId: string): CollaborationSession {
    const session: CollaborationSession = {
      id: crypto.randomUUID(),
      documentId,
      participants: [],
      status: 'active',
      createdAt: new Date(),
    };
    this.sessions.set(session.id, session);
    this.emit('session.created', session);
    return session;
  }

  joinSession(sessionId: string, participant: Participant): CollaborationSession | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.status === 'archived') return null;
    session.participants.push(participant);
    this.emit('participant.joined', session, participant);
    return session;
  }

  leaveSession(sessionId: string, participantId: string): CollaborationSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const index = session.participants.findIndex((p) => p.id === participantId);
    if (index === -1) return null;
    const [removed] = session.participants.splice(index, 1);
    this.emit('participant.left', session, removed);
    return session;
  }

  getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  listActiveSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.status === 'active');
  }

  endSession(sessionId: string): CollaborationSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    session.status = 'archived';
    this.emit('session.ended', session);
    return session;
  }
}
