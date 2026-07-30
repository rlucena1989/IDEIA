import { createLogger } from '@ideia/logger'
import { RemoteConnection, DevContainer, TunnelEndpoint, WorkspaceSession, WebIDEConfig } from './types'

const logger = createLogger('remote-ide')

export class RemoteIDEManager {
  private sessions = new Map<string, WorkspaceSession>()
  private connections = new Map<string, RemoteConnection>()
  private config: WebIDEConfig

  constructor(config?: Partial<WebIDEConfig>) {
    this.config = { maxSessions: 5, defaultTimeout: 3600000, allowedImages: ['node:20', 'python:3.12'], resourceLimits: { cpu: 2, memory: 4096 }, ...config }
  }

  createSession(userId: string, container: DevContainer): WorkspaceSession {
    if (this.sessions.size >= this.config.maxSessions) throw new Error('Max sessions reached')
    const now = new Date()
    const session: WorkspaceSession = { id: `ws-${Date.now()}`, userId, container, startedAt: now.toISOString(), expiresAt: new Date(now.getTime() + this.config.defaultTimeout).toISOString(), active: true }
    this.sessions.set(session.id, session)
    logger.info(`Session created`, { sessionId: session.id, userId })
    return session
  }

  createConnection(type: RemoteConnection['type'], host: string): RemoteConnection {
    const conn: RemoteConnection = { id: `conn-${Date.now()}`, type, host, status: 'connected', lastActivity: new Date().toISOString() }
    this.connections.set(conn.id, conn)
    return conn
  }

  createTunnel(localPort: number, remoteHost: string, remotePort: number): TunnelEndpoint {
    return { localPort, remoteHost, remotePort, protocol: 'tcp' }
  }

  getActiveSessions(): WorkspaceSession[] { return [...this.sessions.values()].filter(s => s.active) }
  getConnections(): RemoteConnection[] { return [...this.connections.values()] }
  endSession(id: string): void { const s = this.sessions.get(id); if (s) { s.active = false; logger.info(`Session ended`, { id }) } }
}
