import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { NotificationManager, NotificationSeverity, ChannelType } from '@ideia/notification-system';
import { success, failure, CliCommandResult } from '../types/cli-result';
const logger = createLogger('notifications');

export function notificationsCommand(): Command {
  const cmd = new Command('notification')
    .description('Manage notifications: list, dismiss, clear');

  cmd
    .command('list')
    .description('List notification history')
    .option('-s, --severity <severity>', 'Filter by severity (info, warning, error, success)')
    .option('--limit <number>', 'Number of entries to show', '10')
    .option('--json', 'Output as JSON')
    .action(async (opts): Promise<CliCommandResult> => {
      try {
        const manager = new NotificationManager(undefined, undefined, { defaultChannels: [ChannelType.Cli] });
        const limit = parseInt(opts.limit, 10);
        let history = manager.getHistory(limit);

        if (opts.severity) {
          const severityMap: Record<string, NotificationSeverity> = {
            info: NotificationSeverity.Info,
            warning: NotificationSeverity.Warning,
            error: NotificationSeverity.Error,
            success: NotificationSeverity.Success,
          };
          const sev = severityMap[opts.severity.toLowerCase()];
          if (sev) {
            history = manager.getHistoryBySeverity(sev);
          }
        }

        const status = manager.getRateLimitStatus();

        if (opts.json) {
          return success('Notifications retrieved', {
            notifications: history,
            rateLimit: status,
          });
        }

        if (history.length === 0) {
          return success('No notifications found');
        }

        const lines = history.map(n =>
          `[${n.severity.toUpperCase().padEnd(7)}] ${n.title}: ${n.message} (${n.timestamp.toISOString()})`
        );
        return success(`Notifications (${history.length}):\n${lines.join('\n')}`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return failure(`List failed: ${msg}`);
      }
    });

  cmd
    .command('dismiss')
    .argument('<id>', 'Notification ID to dismiss')
    .description('Dismiss a notification by ID')
    .option('--json', 'Output as JSON')
    .action(async (id, _opts): Promise<CliCommandResult> => {
      try {
        const manager = new NotificationManager();
        const result = manager.dismiss(id);
        if (result) {
          return success(`Notification ${id} dismissed`);
        }
        return failure(`Notification ${id} not found`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return failure(`Dismiss failed: ${msg}`);
      }
    });

  cmd
    .command('clear')
    .description('Clear all notifications')
    .option('--json', 'Output as JSON')
    .action(async (_opts): Promise<CliCommandResult> => {
      try {
        const manager = new NotificationManager();
        manager.clear();
        return success('All notifications cleared');
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return failure(`Clear failed: ${msg}`);
      }
    });

  cmd
    .command('status')
    .description('Show rate limit status')
    .option('--json', 'Output as JSON')
    .action(async (opts): Promise<CliCommandResult> => {
      try {
        const manager = new NotificationManager();
        const status = manager.getRateLimitStatus();
        if (opts.json) {
          return success('Rate limit status', status);
        }
        return success(`Remaining: ${status.remaining}, Reset: ${status.resetTime.toISOString()}`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return failure(`Status failed: ${msg}`);
      }
    });

  return cmd;
}


