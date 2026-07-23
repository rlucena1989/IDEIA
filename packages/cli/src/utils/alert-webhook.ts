export interface AlertPayload {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  command?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface WebhookConfig {
  slackUrl?: string;
  discordUrl?: string;
  emailTo?: string;
  emailFrom?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
}

function loadConfig(): WebhookConfig {
  return {
    slackUrl: process.env.SLACK_WEBHOOK_URL || undefined,
    discordUrl: process.env.DISCORD_WEBHOOK_URL || undefined,
    emailTo: process.env.ALERT_EMAIL_TO || undefined,
    emailFrom: process.env.ALERT_EMAIL_FROM || 'ai-devkit@localhost',
    smtpHost: process.env.SMTP_HOST || undefined,
    smtpPort: parseInt(process.env.SMTP_PORT || '', 10) || 587,
    smtpUser: process.env.SMTP_USER || undefined,
    smtpPass: process.env.SMTP_PASS || undefined,
  };
}

function colorFromSeverity(severity: AlertPayload['severity']): string {
  switch (severity) {
    case 'critical': return '#dc3545';
    case 'error': return '#ff6b6b';
    case 'warning': return '#ffc107';
    case 'info': return '#17a2b8';
  }
}

function buildSlackPayload(payload: AlertPayload): Record<string, unknown> {
  return {
    attachments: [{
      color: colorFromSeverity(payload.severity),
      title: payload.title,
      text: payload.message,
      fields: [
        { title: 'Severity', value: payload.severity, short: true },
        ...(payload.command ? [{ title: 'Command', value: payload.command, short: true }] : []),
        ...(payload.timestamp ? [{ title: 'Time', value: payload.timestamp, short: true }] : []),
      ],
      footer: 'AI-Devkit Alert',
    }],
  };
}

function buildDiscordPayload(payload: AlertPayload): Record<string, unknown> {
  return {
    embeds: [{
      color: parseInt(colorFromSeverity(payload.severity).replace('#', ''), 16),
      title: payload.title,
      description: payload.message,
      fields: [
        { name: 'Severity', value: payload.severity, inline: true },
        ...(payload.command ? [{ name: 'Command', value: payload.command, inline: true }] : []),
      ],
      timestamp: payload.timestamp || new Date().toISOString(),
      footer: { text: 'AI-Devkit Alert' },
    }],
  };
}

async function sendSlack(webhookUrl: string, payload: AlertPayload): Promise<boolean> {
  try {
    const body = buildSlackPayload(payload);
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

async function sendDiscord(webhookUrl: string, payload: AlertPayload): Promise<boolean> {
  try {
    const body = buildDiscordPayload(payload);
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

async function sendEmail(config: WebhookConfig, payload: AlertPayload): Promise<boolean> {
  if (!config.smtpHost || !config.emailTo) return false;
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: (config.smtpUser && config.smtpPass)
        ? { user: config.smtpUser, pass: config.smtpPass }
        : undefined,
    });
    await transporter.sendMail({
      from: config.emailFrom,
      to: config.emailTo,
      subject: `[AI-Devkit ${payload.severity.toUpperCase()}] ${payload.title}`,
      text: `${payload.message}\n\nCommand: ${payload.command || 'N/A'}\nTimestamp: ${payload.timestamp || new Date().toISOString()}\nSeverity: ${payload.severity}`,
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendWebhookAlert(payload: AlertPayload): Promise<{ slack: boolean; discord: boolean; email: boolean }> {
  const config = loadConfig();
  const results = { slack: false, discord: false, email: false };

  if (config.slackUrl) results.slack = await sendSlack(config.slackUrl, payload);
  if (config.discordUrl) results.discord = await sendDiscord(config.discordUrl, payload);
  if (config.emailTo && config.smtpHost) results.email = await sendEmail(config, payload);

  return results;
}

export function isAlertConfigured(): boolean {
  const config = loadConfig();
  return !!(config.slackUrl || config.discordUrl || (config.emailTo && config.smtpHost));
}
