import { CollaborationSessionManager } from './session-manager';

describe('CollaborationSessionManager', () => {
  let manager: CollaborationSessionManager;

  beforeEach(() => {
    manager = new CollaborationSessionManager();
  });

  it('createSession creates session with correct state', () => {
    const session = manager.createSession('doc-1');
    expect(session.documentId).toBe('doc-1');
    expect(session.status).toBe('active');
    expect(session.participants).toEqual([]);
    expect(session.id).toBeDefined();
    expect(session.createdAt).toBeInstanceOf(Date);
  });

  it('joinSession adds participant', () => {
    const session = manager.createSession('doc-1');
    const participant = {
      id: 'p1',
      name: 'Alice',
      role: 'human' as const,
      color: '#ff0000',
      cursorPosition: null,
      isConnected: true,
    };
    const result = manager.joinSession(session.id, participant);
    expect(result).not.toBeNull();
    expect(result!.participants).toHaveLength(1);
    expect(result!.participants[0]!.id).toBe('p1');
  });

  it('leaveSession removes participant', () => {
    const session = manager.createSession('doc-1');
    const participant = {
      id: 'p1',
      name: 'Alice',
      role: 'human' as const,
      color: '#ff0000',
      cursorPosition: null,
      isConnected: true,
    };
    manager.joinSession(session.id, participant);
    const result = manager.leaveSession(session.id, 'p1');
    expect(result).not.toBeNull();
    expect(result!.participants).toHaveLength(0);
  });

  it('getSession returns correct session', () => {
    const session = manager.createSession('doc-1');
    const retrieved = manager.getSession(session.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(session.id);
    expect(retrieved!.documentId).toBe('doc-1');
  });

  it('endSession archives session', () => {
    const session = manager.createSession('doc-1');
    const result = manager.endSession(session.id);
    expect(result).not.toBeNull();
    expect(result!.status).toBe('archived');
    expect(manager.listActiveSessions()).toHaveLength(0);
  });

  it('participant.left event emitted on leave', () => {
    const session = manager.createSession('doc-1');
    const participant = {
      id: 'p1',
      name: 'Alice',
      role: 'human' as const,
      color: '#ff0000',
      cursorPosition: null,
      isConnected: true,
    };
    manager.joinSession(session.id, participant);

    const leftSpy = jest.fn();
    manager.on('participant.left', leftSpy);

    manager.leaveSession(session.id, 'p1');
    expect(leftSpy).toHaveBeenCalledTimes(1);
    expect(leftSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: session.id }),
      expect.objectContaining({ id: 'p1' }),
    );
  });
});
