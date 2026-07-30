import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.webhook');
import { NotificationService, createNotificationService, WebhookConfig, NotificationEvent, NotificationSeverity } from '../notifications';

const ALL_EVENTS: NotificationEvent[] = [
  'deploy.started', 'deploy.completed', 'deploy.failed',
  'agent.task.completed', 'agent.task.failed', 'policy.violated',
  'checkpoint.approved', 'checkpoint.rejected', 'quality.gate.failed',
  'system.error', 'system.maintenance',
];

function _parseEvents(input: string): NotificationEvent[] {
  if (input === 'all') return ALL_EVENTS;
  return input.split(',').map(s => s.trim()).filter((e): e is NotificationEvent =>
    ALL_EVENTS.includes(e as NotificationEvent)
  );
}

export function webhookCommand(): Command {
  const cmd = new Command('webhook')
    .description('Gerenciar webhooks de notificação');

  cmd
    .command('test')
    .description('Testar entrega de webhook')
    .requiredOption('--url <url>', 'URL do webhook')
    .option('--event <event>', 'Evento para testar', 'deploy.completed')
    .option('--secret <secret>', 'Segredo HMAC')
    .action(async (options) => {
      const config: WebhookConfig = {
        url: options.url,
        secret: options.secret,
        events: [options.event as NotificationEvent],
        timeout: 5000,
      };
      logger.info('\n🔗 Testando webhook: ${config.url}');
      logger.info('   Evento: ${config.events[0]}\n');

      const ns = createNotificationService({ webhooks: [config] });
      try {
        await ns.send(config.events[0], '🔔 Teste de Webhook', `Webhook test at ${new Date().toISOString()}`, 'info', { test: true });
        logger.info('✅ Webhook entregue com sucesso\n');
      } catch (err) {
        console.error(`❌ Falha na entrega: ${err}\n`);
      }
    });

  cmd
    .command('list')
    .description('Listar eventos disponíveis para webhook')
    .action(() => {
      logger.info('\n📋 Eventos disponíveis para webhook:\n');
      for (const event of ALL_EVENTS) {
        logger.info('   • ${event}');
      }
      console.log('');
    });

  cmd
    .command('simulate')
    .description('Simular envio de notificação')
    .requiredOption('--event <event>', 'Tipo de evento')
    .option('--title <title>', 'Título', 'Notificação de teste')
    .option('--message <message>', 'Mensagem', 'Esta é uma notificação de teste')
    .option('--severity <severity>', 'Severidade (info|warning|error|critical)', 'info')
    .action(async (options) => {
      const severity = options.severity as NotificationSeverity;
      const ns = createNotificationService();
      const n = await ns.send(options.event as NotificationEvent, options.title, options.message, severity, { simulated: true });
      logger.info('\n📨 Notificação enviada:\n');
      logger.info('   ID:       ${n.id}');
      logger.info('   Evento:   ${n.event}');
      logger.info('   Título:   ${n.title}');
      logger.info('   Severidade: ${n.severity}');
      logger.info('   Timestamp: ${n.timestamp}\n');
    });

  return cmd;
}
