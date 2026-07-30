import * as crypto from 'crypto'
import { createLogger } from '@ideia/logger';
const logger = createLogger('websocket-api-gateway');

export class WebSocketAPIGateway {
  private _connections = new Map<string, { ws: any; userId: string; subscriptions: Set<string>; lastHeartbeat: number }>()
  private _subscriptions = new Map<string, Map<string, { id: string; userId: string; topic: string; filter?: any; createdAt: string }>>()

  constructor(private _topicAuthorizer: (userId: string, topic: string) => boolean) {}

  handleConnection(ws: any, userId: string): string {
    const connId = crypto.randomUUID()
    this._connections.set(connId, { ws, userId, subscriptions: new Set(), lastHeartbeat: Date.now() })
    ws.on('close', () => this._handleDisconnect(connId))
    ws.send(JSON.stringify({ type: 'connected', connectionId: connId }))
    return connId
  }

  subscribe(connectionId: string, topic: string, filter?: any): string {
    const conn = this._connections.get(connectionId)
    if (!conn) throw new Error('Connection not found')
    if (!this._topicAuthorizer(conn.userId, topic)) throw new Error('Not authorized for topic')

    const subId = `sub_${crypto.randomUUID().slice(0, 8)}`
    if (!this._subscriptions.has(topic)) this._subscriptions.set(topic, new Map())
    this._subscriptions.get(topic)!.set(subId, {
      id: subId, userId: conn.userId, topic, filter, createdAt: new Date().toISOString(),
    })
    conn.subscriptions.add(subId)
    return subId
  }

  async publish(topic: string, event: any): Promise<void> {
    const subs = this._subscriptions.get(topic)
    if (!subs) return
    for (const [, sub] of subs) {
      if (sub.filter && !Object.entries(sub.filter).every(([k, v]) => event[k] === v)) continue
      const conn = [...this._connections.values()].find(c => c.userId === sub.userId)
      if (conn?.ws.readyState === 1) {
        try { conn.ws.send(JSON.stringify({ type: 'event', topic, subId: sub.id, data: event })) } catch {}
      }
    }
  }

  unsubscribe(connectionId: string, subId: string): boolean {
    const conn = this._connections.get(connectionId)
    if (!conn) return false
    conn.subscriptions.delete(subId)
    for (const [, subs] of this._subscriptions) subs.delete(subId)
    return true
  }

  getActiveConnections(): number { return this._connections.size }

  private _handleDisconnect(connId: string): void {
    const conn = this._connections.get(connId)
    if (!conn) return
    for (const subId of conn.subscriptions) {
      for (const [, subs] of this._subscriptions) subs.delete(subId)
    }
    this._connections.delete(connId)
  }
}
