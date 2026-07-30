import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { DeployEnvironment } from './types';

export type WebhookEvent = 'deploy.started' | 'deploy.completed' | 'deploy.failed'
  | 'deploy.rolled_back' | 'canary.step_passed' | 'canary.step_failed'
  | 'canary.promoted' | 'canary.rolled_back' | 'health.check_failed'
  | 'review.required' | 'review.approved' | 'review.rejected';

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  version: string;
  environment: DeployEnvironment;
  timestamp: string;
  deployId?: string;
  metadata?: Record<string, unknown>;
}

export interface WebhookHandler {
  (payload: WebhookPayload): Promise<unknown>;
}

export interface WebhookConfig {
  url: string;
  events: WebhookEvent[];
  secret?: string;
  retryCount: number;
  retryDelayMs: number;
  timeoutMs: number;
}

const DEFAULT_CONFIG: WebhookConfig = {
  url: '',
  events: ['deploy.completed', 'deploy.failed', 'canary.promoted'],
  retryCount: 3,
  retryDelayMs: 5000,
  timeoutMs: 30000,
};

export class WebhookManager {
  private handlers: Map<WebhookEvent, WebhookHandler[]> = new Map();
  private configs: Map<string, WebhookConfig> = new Map();

  registerHandler(event: WebhookEvent, handler: WebhookHandler): void {
    const handlers = this.handlers.get(event) || [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
  }

  registerWebhook(name: string, config: Partial<WebhookConfig>): void {
    this.configs.set(name, { ...DEFAULT_CONFIG, ...config });
  }

  removeWebhook(name: string): boolean {
    return this.configs.delete(name);
  }

  listWebhooks(): Array<{ name: string; config: WebhookConfig }> {
    return Array.from(this.configs.entries()).map(([name, config]) => ({ name, config }));
  }

  async dispatch(event: WebhookEvent, payload: Omit<WebhookPayload, 'id' | 'timestamp'>): Promise<void> {
    const fullPayload: WebhookPayload = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...payload,
      event,
    };

    const localHandlers = this.handlers.get(event) || [];
    await Promise.allSettled(
      localHandlers.map(h => h(fullPayload).catch(() => {}))
    );

    const matchedConfigs = Array.from(this.configs.values())
      .filter(c => c.events.includes(event) && c.url);

    await Promise.allSettled(
      matchedConfigs.map(c => this.sendWithRetry(c, fullPayload))
    );
  }

  private async sendWithRetry(config: WebhookConfig, payload: WebhookPayload): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.retryCount; attempt++) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Webhook-Event': payload.event,
          'X-Webhook-Id': payload.id,
        };

        if (config.secret) {
          headers['X-Webhook-Signature'] = config.secret;
        }

        const res = await fetch(config.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(config.timeoutMs),
        });

        if (res.ok) return;

        lastError = new Error(`Webhook returned ${res.status}: ${await res.text().catch(() => 'unknown')}`);
      } catch (_err) {
        lastError = _err instanceof Error ? _err : new Error(String(_err));
      }

      if (attempt < config.retryCount) {
        await this.delay(config.retryDelayMs);
      }
    }

    throw lastError || new Error('Webhook delivery failed');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function createWebhookManager(): WebhookManager {
  return new WebhookManager();
}
