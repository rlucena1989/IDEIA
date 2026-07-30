import { ScopeViolationEntry, WebhookConfig, Violation, ViolationSeverity } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('webhook');

export class ViolationWebhook {
  private config: WebhookConfig;
  private retryCount: number;
  private timeoutMs: number;

  constructor(config: WebhookConfig) {
    this.config = config;
    this.retryCount = config.retryCount ?? 3;
    this.timeoutMs = config.timeoutMs ?? 5000;
  }

  async send(entry: ScopeViolationEntry): Promise<boolean> {
    if (!this.config.enabled) return true;

    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(this.config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.secret ? { 'X-Webhook-Secret': this.config.secret } : {}),
          },
          body: JSON.stringify({
            event: 'violation.critical',
            timestamp: new Date().toISOString(),
            payload: entry,
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (response.ok) return true;
      } catch {
        if (attempt === this.retryCount - 1) return false;
      }
    }

    return false;
  }

  async notifyCritical(violation: Violation): Promise<boolean> {
    if (violation.severity !== 'critical') return true;
    const entry: ScopeViolationEntry = {
      violationId: violation.id,
      fromScope: violation.scope ?? 'unknown',
      toScope: violation.module,
      targetPath: violation.details ?? '',
      operation: violation.operation ?? 'unknown',
      severity: violation.severity,
      message: violation.message,
      timestamp: violation.timestamp,
    };
    return this.send(entry);
  }

  getConfig(): WebhookConfig {
    return { ...this.config };
  }
}

export function createViolationWebhook(config: WebhookConfig): ViolationWebhook {
  return new ViolationWebhook(config);
}
