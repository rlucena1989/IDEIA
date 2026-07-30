import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SessionManager, createSessionManager } from '../src/session-manager';
import type { BHPMessage } from '../src/types';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  it('creates a new session', () => {
    const session = manager.createSession('ideia', 'ia', 'Refactor code');
    expect(session.id).toBeDefined();
    expect(session.source).toBe('ideia');
    expect(session.target).toBe('ia');
    expect(session.intent).toBe('Refactor code');
    expect(session.status).toBe('active');
  });

  it('adds message to session', () => {
    const session = manager.createSession('human', 'ideia', 'Help');
    const msg: BHPMessage = {
      id: 'msg-1',
      type: 'HELP!',
      source: 'human',
      target: 'ideia',
      timestamp: new Date().toISOString(),
      payload: { context: 'need help' },
      ttl: 30000,
    };

    const result = manager.addMessage(session.id, msg);
    expect(result).toBe(true);

    const retrieved = manager.getSession(session.id);
    expect(retrieved!.messages.length).toBe(1);
  });

  it('returns false when adding message to non-existent session', () => {
    const msg: BHPMessage = {
      id: 'msg-1', type: 'HELP!', source: 'human', target: 'ideia',
      timestamp: new Date().toISOString(), payload: {}, ttl: 30000,
    };
    expect(manager.addMessage('nonexistent', msg)).toBe(false);
  });

  it('updates session status', () => {
    const session = manager.createSession('ia', 'ideia', 'Plan');
    manager.updateStatus(session.id, 'completed');
    expect(manager.getSession(session.id)!.status).toBe('completed');
  });

  it('filters sessions by status', () => {
    manager.createSession('ia', 'ideia', 'Task A');
    const s2 = manager.createSession('ia', 'ideia', 'Task B');
    manager.updateStatus(s2.id, 'completed');

    const active = manager.getSessionsByStatus('active');
    const completed = manager.getSessionsByStatus('completed');
    expect(active.length).toBe(1);
    expect(completed.length).toBe(1);
  });

  it('filters sessions by source platform', () => {
    manager.createSession('human', 'ideia', 'Help');
    manager.createSession('ia', 'ideia', 'Report');
    manager.createSession('human', 'ia', 'Direct');

    const humanSessions = manager.getSessionsBySource('human');
    expect(humanSessions.length).toBe(2);
  });

  it('getAllSessions returns all sessions', () => {
    manager.createSession('ia', 'ideia', 'A');
    manager.createSession('ia', 'ideia', 'B');
    expect(manager.getAllSessions().length).toBe(2);
  });

  it('getActiveCount counts active and awaiting_response', () => {
    const s1 = manager.createSession('ia', 'ideia', 'A');
    manager.createSession('ia', 'ideia', 'B');
    manager.updateStatus(s1.id, 'awaiting_response');

    expect(manager.getActiveCount()).toBe(2);
  });

  it('removes a session', () => {
    const s = manager.createSession('ia', 'ideia', 'Temp');
    expect(manager.removeSession(s.id)).toBe(true);
    expect(manager.getSession(s.id)).toBeUndefined();
  });

  it('clears completed sessions', () => {
    const s1 = manager.createSession('ia', 'ideia', 'Done');
    const s2 = manager.createSession('ia', 'ideia', 'Active');
    manager.updateStatus(s1.id, 'completed');

    manager.clearCompleted();
    expect(manager.getSession(s1.id)).toBeUndefined();
    expect(manager.getSession(s2.id)).toBeDefined();
  });

  it('evicts oldest session when max reached', () => {
    for (let i = 0; i < 101; i++) {
      manager.createSession('ia', 'ideia', `Session ${i}`);
    }
    // Should still be at or below maxSessions (100)
    expect(manager.getAllSessions().length).toBeLessThanOrEqual(100);
  });

  it('createSessionManager factory works', () => {
    expect(createSessionManager()).toBeInstanceOf(SessionManager);
  });
});
