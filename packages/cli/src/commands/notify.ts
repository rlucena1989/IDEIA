import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { NotificationSystem, NotificationSeverity, NotificationLevel } from '@ideia/notification-system';
import { createBus, EventBus } from '@ideia/event-bus';
import { printHeader, printLine, printResult } from '../utils/output';

export function notifyCommand(): Command {
  const cmd = new Command('notify')
    .description('Notification system: send, configure notifications');

  let _eventBus: EventBus;
  let _ns: NotificationSystem;
  async function getNs(): Promise<NotificationSystem> {
    if (!_ns) {
      _eventBus = await createBus() as unknown as EventBus;
      _ns = new NotificationSystem({ eventBus: _eventBus });
    }
    return _ns;
  }

  cmd
    .command('send')
    .argument('<message>', 'Notification message')
    .description('Send a notification')
    .option('--severity <level>', 'Severity (info, warning, error)')
    .option('--channel <channel>', 'Channel (toast, banner, desktop, cli)')
    .option('--title <title>', 'Notification title')
    .option('--json', 'Output as JSON')
    .action(async (message, opts) => {
      try {
        const ns = await getNs();
        const sevMap: Record<string, NotificationSeverity> = {
          info: NotificationSeverity.Info,
          warning: NotificationSeverity.Warning,
          error: NotificationSeverity.Error,
          critical: NotificationSeverity.Critical,
        };
        await ns.notify({
          title: opts.title || 'IDEIA Notification',
          message,
          severity: sevMap[opts.severity || 'info'] || NotificationSeverity.Info,
          level: NotificationLevel.All,
        }, opts.channel ? [opts.channel] : undefined);
        if (opts.json) { printLine(JSON.stringify({ ok: true, message })); return; }
        printResult(`Notification sent: ${message}`, true);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Notify failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('history')
    .description('Show notification history')
    .option('--limit <number>', 'Number of entries')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const ns = await getNs();
        const limit = parseInt(opts.limit || '10', 10);
        const history = ns.getHistory(limit);
        if (opts.json) { printLine(JSON.stringify(history, null, 2)); return; }
        printHeader('Notification History');
        for (const h of history) {
          const icon = h.severity === 'error' ? '❌' : h.severity === 'warning' ? '⚠️' : 'ℹ️';
          printLine(`  ${icon} [${h.severity}] ${h.title}: ${h.message} (${h.timestamp})`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`History failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('configure')
    .argument('<channel>', 'Channel to configure (desktop, slack, email)')
    .description('Configure notification channel')
    .option('--enabled <bool>', 'Enable/disable channel')
    .action(async (channel, opts) => {
      try {
        const ns = await getNs();
        ns.configureChannel(channel, { enabled: opts.enabled !== 'false' });
        printResult(`Channel "${channel}" configured`, true);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Configure failed: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
