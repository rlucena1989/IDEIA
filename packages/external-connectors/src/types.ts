export type ConnectorType = 'slack' | 'jira' | 'webhook' | 'discord' | 'email';
export type WebhookMethod = 'POST' | 'PUT' | 'PATCH';

export interface ConnectorConfig {
  type: ConnectorType;
  name: string;
  enabled: boolean;
  config: Record<string, string>;
}

export interface WebhookPayload {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SlackMessage {
  channel?: string;
  text: string;
  blocks?: unknown[];
  username?: string;
  icon_emoji?: string;
}

export interface JiraIssue {
  project: string;
  summary: string;
  description: string;
  issueType: 'Bug' | 'Task' | 'Story' | 'Epic';
  priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  labels?: string[];
  assignee?: string;
}

export type ConnectorResult = { success: boolean; message: string; response?: unknown };
