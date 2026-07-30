import { Incident, IncidentSeverity } from './types';
import { createLogger } from '@ideia/logger';
import { ConfigManager } from '@ideia/config-engine';
const config = ConfigManager.getInstance();
const logger = createLogger('incident-notifier');


export interface NotifierConfig {
  slack?: { webhookUrl: string; channel?: string };
  email?: { host: string; port: number; user: string; pass: string; from: string; to: string };
  pager?: { apiKey: string; routingKey: string; serviceId?: string };
  enabled: boolean;
}

const SEVERITY_ROUTING: Record<IncidentSeverity, string[]> = {
  [IncidentSeverity.critical]: ['pager', 'slack', 'email'],
  [IncidentSeverity.high]: ['slack', 'email'],
  [IncidentSeverity.medium]: ['email', 'console'],
  [IncidentSeverity.low]: ['email', 'console'],
};

function severityColor(severity: IncidentSeverity): string {
  switch (severity) {
    case IncidentSeverity.critical: return '#dc3545';
    case IncidentSeverity.high: return '#ff6b6b';
    case IncidentSeverity.medium: return '#ffc107';
    case IncidentSeverity.low: return '#17a2b8';
  }
}

function severityLabel(severity: IncidentSeverity): string {
  switch (severity) {
    case IncidentSeverity.critical: return 'CRITICAL';
    case IncidentSeverity.high: return 'HIGH';
    case IncidentSeverity.medium: return 'MEDIUM';
    case IncidentSeverity.low: return 'LOW';
  }
}

export class IncidentNotifier {
  private config: NotifierConfig;

  constructor(config: NotifierConfig) {
    this.config = config;
  }

  async notifyCreated(incident: Incident): Promise<void> {
    const channels = this.getRoutingBySeverity(incident.severity);
    await this.dispatch(incident, 'created', channels);
  }

  async notifyStatusChanged(incident: Incident, oldStatus: string): Promise<void> {
    const channels = this.getRoutingBySeverity(incident.severity);
    await this.dispatch(incident, `status_change:${oldStatus}->${incident.status}`, channels);
  }

  async notifyEscalated(incident: Incident, level: number): Promise<void> {
    const channels = this.getRoutingBySeverity(incident.severity);
    if (!channels.includes('pager')) {
      channels.unshift('pager');
    }
    await this.dispatch(incident, `escalated:level_${level}`, channels);
  }

  private async dispatch(incident: Incident, event: string, channels: string[]): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const ch of channels) {
      switch (ch) {
        case 'slack':
          promises.push(this.sendSlack(incident, event));
          break;
        case 'email':
          promises.push(this.sendEmail(incident, event));
          break;
        case 'pager':
          promises.push(this.sendPager(incident));
          break;
        case 'console':
          promises.push(this.logToConsole(incident, event));
          break;
      }
    }
    await Promise.allSettled(promises);
  }

  getRoutingBySeverity(severity: IncidentSeverity): string[] {
    return [...(SEVERITY_ROUTING[severity] || SEVERITY_ROUTING[IncidentSeverity.low])];
  }

  private async sendSlack(incident: Incident, event: string): Promise<void> {
    if (!this.config.slack?.webhookUrl) return;
    try {
      const body = this.formatSlackMessage(incident, event);
      await fetch(this.config.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
    }
  }

  private async sendEmail(incident: Incident, event: string): Promise<void> {
    if (!this.config.email) return;
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: this.config.email.host,
        port: this.config.email.port,
        secure: this.config.email.port === 465,
        auth: { user: this.config.email.user, pass: this.config.email.pass },
      });
      await transporter.sendMail({
        from: this.config.email.from,
        to: this.config.email.to,
        subject: `[IDEIA ${severityLabel(incident.severity)}] ${incident.title}`,
        text: this.formatEmailBody(incident, event),
      });
    } catch {
    }
  }

  private async sendPager(incident: Incident): Promise<void> {
    if (!this.config.pager?.apiKey || !this.config.pager?.routingKey) return;
    try {
      const pagerSeverity = incident.severity === IncidentSeverity.critical ? 'critical' : 'error';
      await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token token=${this.config.pager.apiKey}`,
        },
        body: JSON.stringify({
          routing_key: this.config.pager.routingKey,
          event_action: 'trigger',
          payload: {
            summary: `[${severityLabel(incident.severity)}] ${incident.title}`,
            severity: pagerSeverity,
            source: 'ideia-incident-manager',
            timestamp: incident.detectedAt.toISOString(),
            custom_details: {
              incident_id: incident.id,
              description: incident.description,
              status: incident.status,
              assignee: incident.assignee,
              tags: incident.tags,
            },
          },
          dedup_key: incident.id,
        }),
      });
    } catch {
    }
  }

  private async logToConsole(incident: Incident, event: string): Promise<void> {
    const prefix = `[INCIDENT:${event}]`;
    logger.info('${prefix} ${severityLabel(incident.severity)} ${incident.title}');
    logger.info('${prefix} ID: ${incident.id} | Status: ${incident.status} | SLA: ${incident.sla.toISOString()}');
  }

  formatSlackMessage(incident: Incident, event: string): Record<string, unknown> {
    const color = severityColor(incident.severity);
    return {
      attachments: [{
        color,
        title: `${severityLabel(incident.severity)}: ${incident.title}`,
        text: incident.description,
        fields: [
          { title: 'Event', value: event, short: true },
          { title: 'Status', value: incident.status, short: true },
          { title: 'Severity', value: incident.severity, short: true },
          { title: 'SLA', value: incident.sla.toISOString(), short: true },
          ...(incident.assignee ? [{ title: 'Assignee', value: incident.assignee, short: true }] : []),
          ...(incident.tags.length > 0 ? [{ title: 'Tags', value: incident.tags.join(', '), short: true }] : []),
        ],
        footer: 'IDEIA Incident Manager',
        ts: Math.floor(incident.detectedAt.getTime() / 1000),
      }],
    };
  }

  formatEmailBody(incident: Incident, event: string): string {
    const lines = [
      `Incident: ${incident.title}`,
      `Description: ${incident.description}`,
      `Severity: ${incident.severity}`,
      `Status: ${incident.status}`,
      `Event: ${event}`,
      `Detected At: ${incident.detectedAt.toISOString()}`,
      `SLA Deadline: ${incident.sla.toISOString()}`,
      incident.assignee ? `Assignee: ${incident.assignee}` : '',
      incident.tags.length > 0 ? `Tags: ${incident.tags.join(', ')}` : '',
      `ID: ${incident.id}`,
      '',
      '---',
      'IDEIA Incident Manager — Automated Notification',
    ].filter(Boolean).join('\n');
    return lines;
  }
}

export function loadNotifierConfig(): NotifierConfig {
  return {
    slack: config.get('SLACK_WEBHOOK_URL')
      ? { webhookUrl: config.get('SLACK_WEBHOOK_URL'), channel: config.get('SLACK_CHANNEL') }
      : undefined,
    email: (config.get('ALERT_EMAIL_TO') && config.get('SMTP_HOST'))
      ? {
          host: config.get('SMTP_HOST'),
          port: parseInt(config.get('SMTP_PORT') || '587', 10),
          user: config.get('SMTP_USER') || '',
          pass: config.get('SMTP_PASS') || '',
          from: config.get('ALERT_EMAIL_FROM') || 'ideia-incidents@localhost',
          to: config.get('ALERT_EMAIL_TO'),
        }
      : undefined,
    pager: (config.get('PAGERDUTY_API_KEY') && config.get('PAGERDUTY_ROUTING_KEY'))
      ? {
          apiKey: config.get('PAGERDUTY_API_KEY'),
          routingKey: config.get('PAGERDUTY_ROUTING_KEY'),
          serviceId: config.get('PAGERDUTY_SERVICE_ID'),
        }
      : undefined,
    enabled: true,
  };
}
