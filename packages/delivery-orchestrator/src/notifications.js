"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationManager = void 0;
exports.createNotificationManager = createNotificationManager;
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('delivery-orchestrator');
class NotificationManager {
    channels = [];
    webhookManager;
    history = [];
    maxHistory = 100;
    constructor(webhookManager) {
        this.webhookManager = webhookManager;
    }
    registerChannel(channel) {
        this.channels.push(channel);
    }
    removeChannel(name) {
        this.channels = this.channels.filter(c => c.name !== name);
    }
    listChannels() {
        return [...this.channels];
    }
    getHistory(event) {
        if (event)
            return this.history.filter(m => m.event === event);
        return [...this.history];
    }
    async notify(params) {
        const message = this.buildMessage(params);
        this.history.push(message);
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }
        const matchedChannels = this.channels.filter(c => c.events.includes(params.event));
        for (const channel of matchedChannels) {
            await this.sendToChannel(channel, message);
        }
        if (this.webhookManager) {
            const webhookEvent = params.event;
            await this.webhookManager.dispatch(webhookEvent, {
                event: webhookEvent,
                version: params.version,
                environment: params.environment,
                deployId: params.deployId,
                metadata: {
                    ...params.metadata,
                    title: message.title,
                    severity: message.severity,
                    error: params.error,
                },
            });
        }
    }
    buildMessage(params) {
        const templates = {
            'deploy.started': {
                title: '🚀 Deploy iniciado',
                message: `Deploy v${params.version} para ${params.environment} foi iniciado`,
                severity: 'info',
            },
            'deploy.completed': {
                title: '✅ Deploy concluído',
                message: `Deploy v${params.version} para ${params.environment} concluído com sucesso`,
                severity: 'success',
            },
            'deploy.failed': {
                title: '❌ Deploy falhou',
                message: `Deploy v${params.version} para ${params.environment} falhou: ${params.error || 'sem detalhes'}`,
                severity: 'error',
            },
            'deploy.rolled_back': {
                title: '⏪ Rollback executado',
                message: `Rollback de v${params.version} em ${params.environment} executado`,
                severity: 'warning',
            },
            'review.required': {
                title: '👀 Revisão necessária',
                message: `Deploy v${params.version} para ${params.environment} aguarda revisão`,
                severity: 'warning',
            },
            'review.approved': {
                title: '✅ Revisão aprovada',
                message: `Deploy v${params.version} para ${params.environment} foi aprovado`,
                severity: 'success',
            },
            'review.rejected': {
                title: '❌ Revisão rejeitada',
                message: `Deploy v${params.version} para ${params.environment} foi rejeitado`,
                severity: 'error',
            },
            'review.timeout': {
                title: '⏰ Review expirou',
                message: `Review do deploy v${params.version} para ${params.environment} expirou — escalando`,
                severity: 'warning',
            },
            'canary.step_passed': {
                title: '✅ Canary step passou',
                message: `Canary step para v${params.version} em ${params.environment} passou`,
                severity: 'success',
            },
            'canary.step_failed': {
                title: '❌ Canary step falhou',
                message: `Canary step para v${params.version} em ${params.environment} falhou: ${params.error || 'sem detalhes'}`,
                severity: 'error',
            },
            'canary.promoted': {
                title: '✅ Canary promovido',
                message: `Canary v${params.version} promovido para 100% em ${params.environment}`,
                severity: 'success',
            },
            'canary.rolled_back': {
                title: '⏪ Canary revertido',
                message: `Canary v${params.version} em ${params.environment} foi revertido`,
                severity: 'warning',
            },
            'health.check_failed': {
                title: '💔 Health check falhou',
                message: `Health check falhou para v${params.version} em ${params.environment}: ${params.error || 'sem resposta'}`,
                severity: 'error',
            },
        };
        const template = templates[params.event] || {
            title: params.event,
            message: `Evento ${params.event} para v${params.version} em ${params.environment}`,
            severity: 'info',
        };
        return {
            event: params.event,
            ...template,
            version: params.version,
            environment: params.environment,
            deployId: params.deployId,
            metadata: params.error ? { error: params.error } : undefined,
        };
    }
    async sendToChannel(channel, message) {
        if (channel.type === 'log') {
            const prefix = `[${message.severity.toUpperCase()}]`;
            logger.info('${prefix} ${message.title}: ${message.message}');
        }
    }
}
exports.NotificationManager = NotificationManager;
function createNotificationManager(webhookManager) {
    const mgr = new NotificationManager(webhookManager);
    mgr.registerChannel({
        name: 'console-log',
        type: 'log',
        events: [
            'deploy.started', 'deploy.completed', 'deploy.failed', 'deploy.rolled_back',
            'review.required', 'review.approved', 'review.rejected',
            'canary.step_passed', 'canary.step_failed', 'canary.promoted', 'canary.rolled_back',
            'health.check_failed',
        ],
    });
    return mgr;
}
//# sourceMappingURL=notifications.js.map