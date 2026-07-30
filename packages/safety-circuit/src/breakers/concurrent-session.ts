const DEFAULT_MAX_SESSIONS = 10;

export class ConcurrentSessionBreaker {
  private static activeSessions: Set<string> = new Set();
  private static maxSessions: number = DEFAULT_MAX_SESSIONS;

  static setMaxSessions(max: number): void {
    ConcurrentSessionBreaker.maxSessions = max;
  }

  static acquireSession(sessionId: string): boolean {
    if (ConcurrentSessionBreaker.activeSessions.size >= ConcurrentSessionBreaker.maxSessions) {
      return false;
    }
    ConcurrentSessionBreaker.activeSessions.add(sessionId);
    return true;
  }

  static releaseSession(sessionId: string): void {
    ConcurrentSessionBreaker.activeSessions.delete(sessionId);
  }

  static evaluate(): number {
    return ConcurrentSessionBreaker.activeSessions.size;
  }

  static getMaxSessions(): number {
    return ConcurrentSessionBreaker.maxSessions;
  }

  static reset(): void {
    ConcurrentSessionBreaker.activeSessions.clear();
    ConcurrentSessionBreaker.maxSessions = DEFAULT_MAX_SESSIONS;
  }
}
