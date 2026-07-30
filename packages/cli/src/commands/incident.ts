import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { IncidentManager, IncidentSeverity, IncidentStatus, IncidentNotifier, loadNotifierConfig } from '@ideia/incident-manager';
import { printHeader, printLine, printResult } from '../utils/output';
const logger = createLogger('incident');

function formatIncident(i: { id: string; title: string; severity: IncidentSeverity; status: IncidentStatus; detectedAt: Date; sla: Date; assignee?: string; tags: string[] }): string {
  const sevIcon: Record<string, string> = {
    [IncidentSeverity.critical]: 'CRIT',
    [IncidentSeverity.high]: 'HIGH',
    [IncidentSeverity.medium]: 'MED ',
    [IncidentSeverity.low]: 'LOW ',
  };
  const icon = sevIcon[i.severity] ?? '??? ';
  return `  ${icon} [${i.status.padEnd(12)}] ${i.title} (${i.id.slice(0, 8)}…) | SLA: ${i.sla.toISOString()}${i.assignee ? ` | 👤 ${i.assignee}` : ''}`;
}

export function incidentCommand(): Command {
  const cmd = new Command('incident')
    .description('Gerenciamento de incidentes — criar, listar, notificar');

  cmd
    .command('create')
    .argument('<title>', 'Título do incidente')
    .requiredOption('-s, --severity <severity>', 'Severidade: critical, high, medium, low')
    .option('-d, --description <text>', 'Descrição do incidente')
    .option('-a, --assignee <name>', 'Responsável')
    .option('-t, --tags <tags>', 'Tags separadas por vírgula')
    .option('--json', 'Output as JSON')
    .action((title, opts) => {
      try {
        const severity = opts.severity as IncidentSeverity;
        if (!Object.values(IncidentSeverity).includes(severity)) {
          console.error(`Severidade inválida: ${opts.severity}. Use: critical, high, medium, low`);
          process.exit(1);
        }
        const manager = new IncidentManager();
        const incident = manager.create({
          title,
          description: opts.description || '',
          severity,
          assignee: opts.assignee,
          tags: opts.tags ? opts.tags.split(',').map((t: string) => t.trim()) : undefined,
        });

        if (opts.json) {
          printLine(JSON.stringify({ ok: true, incident }, null, 2));
          return;
        }
        printResult('Incidente criado', true, `${incident.id} — ${incident.title}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao criar incidente: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('list')
    .description('Listar incidentes')
    .option('--status <status>', 'Filtrar por status')
    .option('--severity <severity>', 'Filtrar por severidade')
    .option('--assignee <name>', 'Filtrar por responsável')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      try {
        const manager = new IncidentManager();
        const filters: { status?: IncidentStatus; severity?: IncidentSeverity; assignee?: string } = {};
        if (opts.status) filters.status = opts.status as IncidentStatus;
        if (opts.severity) filters.severity = opts.severity as IncidentSeverity;
        if (opts.assignee) filters.assignee = opts.assignee;

        const incidents = manager.list(filters);

        if (opts.json) {
          printLine(JSON.stringify({ ok: true, count: incidents.length, incidents }, null, 2));
          return;
        }

        printHeader(`Incidentes (${incidents.length})`);
        if (incidents.length === 0) {
          printLine('  Nenhum incidente encontrado.');
          return;
        }
        for (const inc of incidents) {
          printLine(formatIncident(inc));
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao listar incidentes: ${message}`);
        process.exit(1);
      }
    });

  const notifierCmd = new Command('notifier')
    .description('Gerenciar notificações de incidentes');

  notifierCmd
    .command('status')
    .description('Verificar configuração do notificador')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      const config = loadNotifierConfig();
      if (opts.json) {
        printLine(JSON.stringify({ ok: true, config: { slack: !!config.slack, email: !!config.email, pager: !!config.pager, enabled: config.enabled } }, null, 2));
        return;
      }
      printHeader('Configuração do Notificador');
      printLine(`  Slack:  ${config.slack ? '✅ Configurado' : '❌ Não configurado'}`);
      printLine(`  Email:  ${config.email ? '✅ Configurado' : '❌ Não configurado'}`);
      printLine(`  Pager:  ${config.pager ? '✅ Configurado' : '❌ Não configurado'}`);
      printLine(`  Status: ${config.enabled ? '✅ Ativo' : '❌ Inativo'}`);
    });

  notifierCmd
    .command('test')
    .description('Testar canais de notificação')
    .option('--channel <channel>', 'Canal específico: slack, email, pager')
    .action(async (opts) => {
      const config = loadNotifierConfig();
      if (!config.enabled) {
        printResult('Notificador desabilitado', false);
        process.exit(1);
      }

      const notifier = new IncidentNotifier(config);
      const testIncident = {
        id: 'test-00000000-0000-0000-0000-000000000000',
        title: 'Teste de Notificação — Incident Manager',
        description: 'Esta é uma notificação de teste do sistema de incidentes IDEIA.',
        severity: IncidentSeverity.low,
        status: IncidentStatus.detected,
        detectedAt: new Date(),
        sla: new Date(Date.now() + 72000000),
        tags: ['test', 'notification'],
        notes: [],
      };

      try {
        if (opts.channel === 'slack' && config.slack) {
          await notifier.notifyCreated(testIncident);
          printResult('Teste Slack enviado', true);
        } else if (opts.channel === 'email' && config.email) {
          await notifier.notifyCreated(testIncident);
          printResult('Teste Email enviado', true);
        } else if (opts.channel === 'pager' && config.pager) {
          await notifier.notifyCreated(testIncident);
          printResult('Teste PagerDuty enviado', true);
        } else if (!opts.channel) {
          await notifier.notifyCreated(testIncident);
          printResult('Teste de notificação enviado para todos os canais configurados', true);
        } else {
          printResult(`Canal "${opts.channel}" não configurado`, false);
          process.exit(1);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        printResult(`Teste falhou: ${message}`, false);
        process.exit(1);
      }
    });

  cmd.addCommand(notifierCmd);
  return cmd;
}
