import { DeployEnvironment } from './types';
export type WebhookEvent = 'deploy.started' | 'deploy.completed' | 'deploy.failed' | 'deploy.rolled_back' | 'canary.step_passed' | 'canary.step_failed' | 'canary.promoted' | 'canary.rolled_back' | 'health.check_failed' | 'review.required' | 'review.approved' | 'review.rejected';
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
export declare class WebhookManager {
    private handlers;
    private configs;
    registerHandler(event: WebhookEvent, handler: WebhookHandler): void;
    registerWebhook(name: string, config: Partial<WebhookConfig>): void;
    removeWebhook(name: string): boolean;
    listWebhooks(): Array<{
        name: string;
        config: WebhookConfig;
    }>;
    dispatch(event: WebhookEvent, payload: Omit<WebhookPayload, 'id' | 'timestamp'>): Promise<void>;
    private sendWithRetry;
    private delay;
}
export declare function createWebhookManager(): WebhookManager;
//# sourceMappingURL=webhook.d.ts.map