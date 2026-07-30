import { ConnectorConfig, ConnectorResult, ConnectorType, JiraIssue, SlackMessage, WebhookPayload } from './types';
import { createLogger } from '@ideia/logger';

export class ExternalConnectors {
  private connectors: Map<string, ConnectorConfig> = new Map();

  register(config: ConnectorConfig): void {
    this.connectors.set(config.name, config);
  }

  unregister(name: string): boolean {
    return this.connectors.delete(name);
  }

  getConnector(name: string): ConnectorConfig | undefined {
    return this.connectors.get(name);
  }

  listConnectors(type?: ConnectorType): ConnectorConfig[] {
    const all = Array.from(this.connectors.values());
    return type ? all.filter(c => c.type === type && c.enabled) : all.filter(c => c.enabled);
  }

  async sendSlack(webhookUrl: string, message: SlackMessage): Promise<ConnectorResult> {
    try {
      const body = {
        text: message.text,
        channel: message.channel,
        username: message.username || 'AI-Devkit',
        icon_emoji: message.icon_emoji || ':robot_face:',
        blocks: message.blocks,
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      return {
        success: response.ok,
        message: response.ok ? 'Slack message sent' : `Slack error: ${response.statusText}`,
        response: response.ok ? undefined : await response.text(),
      };
    } catch (_error) {
      return { success: false, message: `Slack send failed: ${_error instanceof Error ? _error.message : String(_error)}` };
    }
  }

  async sendWebhook(url: string, payload: WebhookPayload, method: 'POST' | 'PUT' = 'POST'): Promise<ConnectorResult> {
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return {
        success: response.ok,
        message: response.ok ? 'Webhook sent' : `Webhook error: ${response.statusText}`,
      };
    } catch (_error) {
      return { success: false, message: `Webhook failed: ${_error instanceof Error ? _error.message : String(_error)}` };
    }
  }

  async createJiraIssue(jiraUrl: string, token: string, issue: JiraIssue): Promise<ConnectorResult> {
    try {
      const body = {
        fields: {
          project: { key: issue.project },
          summary: issue.summary,
          description: issue.description,
          issuetype: { name: issue.issueType },
          priority: { name: issue.priority },
          labels: issue.labels || [],
          assignee: issue.assignee ? { name: issue.assignee } : undefined,
        },
      };

      const response = await fetch(`${jiraUrl.replace(/\/$/, '')}/rest/api/2/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return {
        success: response.ok,
        message: response.ok ? `Jira issue created: ${data.key}` : `Jira error: ${response.statusText}`,
        response: data,
      };
    } catch (_error) {
      return { success: false, message: `Jira create failed: ${_error instanceof Error ? _error.message : String(_error)}` };
    }
  }

  async sendAlert(webhookUrl: string | undefined, payload: WebhookPayload): Promise<ConnectorResult> {
    if (!webhookUrl) {
      return { success: false, message: 'No webhook URL configured' };
    }
    return this.sendWebhook(webhookUrl, payload);
  }

  async notifyAll(payload: WebhookPayload): Promise<ConnectorResult[]> {
    const results: ConnectorResult[] = [];

    for (const conn of this.listConnectors()) {
      if (conn.type === 'slack' && conn.config.url) {
        results.push(await this.sendSlack(conn.config.url, { text: payload.message }));
      } else if (conn.type === 'webhook' && conn.config.url) {
        results.push(await this.sendWebhook(conn.config.url, payload));
      }
    }

    return results;
  }
}

export function createExternalConnectors(): ExternalConnectors {
  return new ExternalConnectors();
}
