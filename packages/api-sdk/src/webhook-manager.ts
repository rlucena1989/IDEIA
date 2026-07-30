import * as crypto from 'crypto'
import { createLogger } from '@ideia/logger'
import { WebhookConfig, IdeiaEvent } from './types'

const log = createLogger('webhook-manager')

export class WebhookManager {
  private _webhooks: Map<string, WebhookConfig> = new Map()
  private _deliveryHistory: Array<{ webhookId: string; eventId: string; status: string; attempts: number; timestamp: string }> = []

  register(config: WebhookConfig): string {
    const id = `wh_${crypto.randomUUID().slice(0, 8)}`
    this._webhooks.set(id, config)
    log.info(`Webhook registered: ${id} -> ${config.url}`)
    return id
  }

  unregister(id: string): boolean {
    return this._webhooks.delete(id)
  }

  list(): Array<{ id: string; config: WebhookConfig }> {
    return Array.from(this._webhooks.entries()).map(([id, config]) => ({ id, config }))
  }

  async dispatch(event: IdeiaEvent): Promise<void> {
    for (const [id, config] of this._webhooks) {
      if (!config.events.includes(event.type)) continue
      if (config.filters?.projectId && event.extensions?.projectId !== config.filters.projectId) continue

      const payload = JSON.stringify(event)
      const signature = this._signPayload(payload, config.secret)

      try {
        const response = await fetch(config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Ideia-Event-Id': event.id,
            'X-Ideia-Event-Type': event.type,
            'X-Ideia-Signature': `sha256=${signature}`,
            'X-Ideia-Delivery-Attempt': '1',
          },
          body: payload,
        })
        this._deliveryHistory.push({ webhookId: id, eventId: event.id, status: response.ok ? 'delivered' : 'failed', attempts: 1, timestamp: new Date().toISOString() })
        log.info(`Webhook ${id} dispatched: ${response.status}`)
      } catch (error: any) {
        this._deliveryHistory.push({ webhookId: id, eventId: event.id, status: 'failed', attempts: 1, timestamp: new Date().toISOString() })
        log.error(`Webhook ${id} failed: ${error.message}`)
      }
    }
  }

  getDeliveryHistory(webhookId?: string): Array<{ webhookId: string; eventId: string; status: string; attempts: number; timestamp: string }> {
    if (webhookId) return this._deliveryHistory.filter(h => h.webhookId === webhookId)
    return [...this._deliveryHistory]
  }

  private _signPayload(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex')
  }
}
