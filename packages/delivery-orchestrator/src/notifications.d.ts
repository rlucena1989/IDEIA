import { WebhookManager } from './webhook';
import { DeployEnvironment } from './types';
export type NotificationEvent = 'deploy.started' | 'deploy.completed' | 'deploy.failed' | 'deploy.rolled_back' | 'review.required' | 'review.approved' | 'review.rejected' | 'review.timeout' | 'canary.step_passed' | 'canary.step_failed' | 'canary.promoted' | 'canary.rolled_back' | 'health.check_failed';
export interface NotificationChannel {
    name: string;
    type: 'webhook' | 'log';
    events: NotificationEvent[];
}
export interface NotificationMessage {
    event: NotificationEvent;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    version: string;
    environment: DeployEnvironment;
    deployId?: string;
    metadata?: Record<string, unknown>;
}
export declare class NotificationManager {
    private channels;
    private webhookManager?;
    private history;
    private maxHistory;
    constructor(webhookManager?: WebhookManager);
    registerChannel(channel: NotificationChannel): void;
    removeChannel(name: string): void;
    listChannels(): NotificationChannel[];
    getHistory(event?: NotificationEvent): NotificationMessage[];
    notify(params: {
        event: NotificationEvent;
        version: string;
        environment: DeployEnvironment;
        deployId?: string;
        error?: string;
        metadata?: Record<string, unknown>;
    }): Promise<void>;
    private buildMessage;
    private sendToChannel;
}
export declare function createNotificationManager(webhookManager?: WebhookManager): NotificationManager;
//# sourceMappingURL=notifications.d.ts.map