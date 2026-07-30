import { EventEmitter } from 'events'
import { ConfigManager } from '@ideia/config-engine';
import { createLogger } from '@ideia/logger'
import { Channel, NotificationRecord, NotificationMessage, NotificationChannel } from './types'

const config = ConfigManager.getInstance();
const logger = createLogger('human-gate:notifier')

const DEFAULT_CHANNELS: NotificationChannel[] = [
  {
    name: 'theia_widget', priority: 10,
    send: async (m) => {
      const g = globalThis as Record<string, unknown>
      const cb = g.theiaApprovalCallback
      if (typeof cb === 'function') {
        cb(m)
        return true
      }
      return false
    },
    isAvailable: async () => true,
  },
  {
    name: 'theia_toast', priority: 9,
    send: async (m) => {
      const g = globalThis as Record<string, unknown>
      const cb = g.theiaToastCallback
      if (typeof cb === 'function') {
        cb(m)
        return true
      }
      return false
    },
    isAvailable: async () => true,
  },
  {
    name: 'theia_tray', priority: 8,
    send: async (m) => {
      const g = globalThis as Record<string, unknown>
      const cb = g.theiaTrayCallback
      if (typeof cb === 'function') {
        cb(m)
        return true
      }
      return false
    },
    isAvailable: async () => typeof process !== 'undefined',
  },
  {
    name: 'slack', priority: 7,
    send: async (m) => {
      const webhookUrl = typeof process !== 'undefined' ? config.get('SLACK_WEBHOOK_URL') : undefined
      if (!webhookUrl) return false
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: m.title,
            blocks: [
              { type: 'header', text: { type: 'plain_text', text: m.title } },
              { type: 'section', text: { type: 'mrkdwn', text: m.body } },
              {
                type: 'actions',
                elements: m.actions.map(a => ({
                  type: 'button',
                  text: { type: 'plain_text', text: a },
                  value: `${m.requestId}:${a}`,
                  style: a === 'approve' ? 'primary' : a === 'reject' ? 'danger' : undefined,
                })),
              },
              {
                type: 'context',
                elements: [
                  { type: 'mrkdwn', text: `Request ID: \`${m.requestId}\` | Priority: ${m.priority}` },
                ],
              },
            ],
          }),
        })
        return response.ok
      } catch {
        return false
      }
    },
    isAvailable: async () => typeof process !== 'undefined' && !!config.get('SLACK_WEBHOOK_URL'),
  },
  {
    name: 'email', priority: 4,
    send: async (m) => {
      const emailTo = typeof process !== 'undefined' ? config.get('HITL_EMAIL_TO') : undefined
      logger.info(`[EMAIL] To: ${emailTo || 'hitl@ideia.dev'}`, { subject: m.title, requestId: m.requestId })
      return true
    },
    isAvailable: async () => true,
  },
  {
    name: 'webhook', priority: 5,
    send: async (m) => {
      const url = typeof process !== 'undefined' ? config.get('HITL_WEBHOOK_URL') : undefined
      if (!url) return false
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...m, timestamp: Date.now(), source: 'ideia-hitl' }),
        })
        return response.ok
      } catch {
        return false
      }
    },
    isAvailable: async () => typeof process !== 'undefined' && !!config.get('HITL_WEBHOOK_URL'),
  },
  {
    name: 'sms', priority: 2,
    send: async (m) => {
      const smsTo = typeof process !== 'undefined' ? config.get('HITL_SMS_TO') : undefined
      logger.info(`[SMS] To: ${smsTo || '+5511999999999'}`, { title: m.title, body: m.body.substring(0, 100) })
      return true
    },
    isAvailable: async () => typeof process !== 'undefined' && !!config.get('TWILIO_ACCOUNT_SID'),
  },
  {
    name: 'pager', priority: 1,
    send: async (m) => {
      const apiKey = typeof process !== 'undefined' ? config.get('PAGERDUTY_API_KEY') : undefined
      if (!apiKey) return false
      try {
        const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Token token=${apiKey}` },
          body: JSON.stringify({
            routing_key: typeof process !== 'undefined' ? config.get('PAGERDUTY_ROUTING_KEY') : undefined,
            event_action: 'trigger',
            payload: {
              summary: m.title,
              severity: m.priority === 'critical' ? 'critical' : 'error',
              source: 'ideia-hitl',
              custom_details: m.metadata,
            },
          }),
        })
        return response.ok
      } catch {
        return false
      }
    },
    isAvailable: async () => typeof process !== 'undefined' && !!config.get('PAGERDUTY_API_KEY'),
  },
]

export class NotificationRouter {
  private channels: Map<Channel, NotificationChannel> = new Map()
  private channelPriority: Map<Channel, number> = new Map()
  private eventBus: EventEmitter

  constructor(channels?: NotificationChannel[], eventBus?: EventEmitter) {
    this.eventBus = eventBus || new EventEmitter()
    const channelsToRegister = channels && channels.length > 0 ? channels : DEFAULT_CHANNELS
    for (const ch of channelsToRegister) {
      this.registerChannel(ch)
    }
  }

  registerChannel(channel: NotificationChannel): void {
    this.channels.set(channel.name, channel)
    this.channelPriority.set(channel.name, channel.priority)
  }

  async send(message: NotificationMessage): Promise<boolean> {
    const channel = this.channels.get(message.channel)
    if (!channel) return false
    if (!(await channel.isAvailable())) return false
    const sent = await channel.send(message)
    if (sent) {
      this.eventBus.emit('hitl.notification.sent', {
        type: 'hitl.notification.sent', requestId: message.requestId,
        timestamp: Date.now(), actor: 'system', payload: { channel: message.channel },
      })
    }
    return sent
  }

  async sendToAll(message: Omit<NotificationMessage, 'channel'>, minPriority = 1): Promise<boolean> {
    const sorted = Array.from(this.channels.values())
      .filter(ch => (this.channelPriority.get(ch.name) || 0) >= minPriority)
      .sort((a, b) => (this.channelPriority.get(a.name) || 0) - (this.channelPriority.get(b.name) || 0))
    for (const channel of sorted) {
      try {
        if (await channel.isAvailable()) {
          const sent = await channel.send({ ...message, channel: channel.name })
          if (sent) return true
        }
      } catch { continue }
    }
    return false
  }
}
