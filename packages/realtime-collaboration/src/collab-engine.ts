import { createLogger } from '@ideia/logger'
import { Collaborator, CursorPosition, Operation, DocumentState, PresenceEvent } from './types'

const logger = createLogger('collab-engine')

export class CollaborationEngine {
  private collaborators = new Map<string, Collaborator>()
  private documents = new Map<string, DocumentState>()
  private operationLog: Operation[] = []

  join(user: Collaborator): void {
    this.collaborators.set(user.id, { ...user, connected: true })
    this.broadcast({ userId: user.id, type: 'join', timestamp: new Date().toISOString() })
    logger.info(`User joined`, { userId: user.id })
  }

  leave(userId: string): void {
    const user = this.collaborators.get(userId)
    if (user) { user.connected = false }
    this.broadcast({ userId, type: 'leave', timestamp: new Date().toISOString() })
  }

  updateCursor(userId: string, cursor: CursorPosition): void {
    const user = this.collaborators.get(userId)
    if (user) user.cursor = cursor
    this.broadcast({ userId, type: 'cursor', data: cursor, timestamp: new Date().toISOString() })
  }

  applyOperation(docId: string, op: Operation): DocumentState {
    let doc = this.documents.get(docId)
    if (!doc) { doc = { content: '', version: 0, lastModified: '', operations: [] }; this.documents.set(docId, doc) }
    doc.operations.push(op)
    doc.version++
    doc.lastModified = new Date().toISOString()
    this.operationLog.push(op)
    return doc
  }

  getDocument(docId: string): DocumentState | undefined { return this.documents.get(docId) }
  getCollaborators(): Collaborator[] { return [...this.collaborators.values()] }
  getActiveCollaborators(): Collaborator[] { return [...this.collaborators.values()].filter(c => c.connected) }

  private broadcast(event: PresenceEvent): void {
    logger.info(`Presence event`, { type: event.type, userId: event.userId })
  }
}
