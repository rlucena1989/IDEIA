import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { RightToBeForgotten } from '@ideia/privacy';
import type { DataStore } from '@ideia/privacy';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';
const logger = createLogger('forget');

const rtb = new RightToBeForgotten();

export function registerForgetStore(storeName: string, store: DataStore): void {
  rtb.registerStore({ ...store, name: storeName });
}

export function forgetCommand(): Command {
  const cmd = new Command('forget').description('Right to be forgotten — RGPD Art. 17 / LGPD Art. 15');

  cmd
    .command('user')
    .description('Deletes all data for a user')
    .argument('<userId>', 'User ID')
    .option('--reason <reason>', 'Reason for the request', 'User request')
    .option('--dry-run', 'Simulate without deleting')
    .action(async (userId: string, opts: Record<string, unknown>) => {
      try {
        const reason = typeof opts.reason === 'string' ? opts.reason : 'User request';
        const dryRun = opts.dryRun === true;

        if (dryRun) {
          const data = await rtb.findByUserId(userId);
          const envelope = createEnvelope({
            ok: true,
            command: 'forget user',
            version: getCliVersion(),
            data: { userId, recordsFound: data.length, stores: [...new Set(data.map((d) => d.store))] },
            warnings: ['DRY-RUN: no data was deleted'],
          });

          printHeader('Forget — Dry Run');
          printLine(`  User: ${userId}`);
          printLine(`  Records found: ${data.length}`);
          for (const record of data) {
            printLine(`    [${record.store}] ${record.id}`);
          }
          if (opts.json) {
            printLine(JSON.stringify(envelope, null, 2));
          }
          return;
        }

        const result = await rtb.forget(userId, reason);
        const envelope = createEnvelope({
          ok: result.status !== 'failed',
          command: 'forget user',
          version: getCliVersion(),
          data: result,
        });

        printHeader('Right to Be Forgotten — Result');
        printLine(`  Request ID: ${result.requestId}`);
        printLine(`  Status: ${result.status}`);
        printLine(`  Stores affected: ${result.storesAffected.length}`);
        printLine(`  Records deleted: ${result.totalRecordsDeleted}`);
        if (result.errors.length > 0) {
          printLine(`  Errors: ${result.errors.length}`);
          for (const err of result.errors) printLine(`    ${err}`);
        }

        if (opts.json) {
          printLine(JSON.stringify(envelope, null, 2));
        }
        printResult(`Forget request ${result.requestId} — ${result.status}`, result.status !== 'failed');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const envelope = createEnvelope({
          ok: false,
          command: 'forget user',
          version: getCliVersion(),
          errors: [message],
        });
        if (opts.json) {
          printLine(JSON.stringify(envelope, null, 2));
        }
        printResult(`Error: ${message}`, false);
      }
    });

  cmd
    .command('field')
    .description('Deletes data by field and value')
    .argument('<field>', 'Field name')
    .argument('<value>', 'Field value')
    .option('--reason <reason>', 'Reason for the request', 'Field cleanup')
    .option('--json', 'JSON output')
    .action(async (field: string, value: string, opts: Record<string, unknown>) => {
      try {
        const reason = typeof opts.reason === 'string' ? opts.reason : 'Field cleanup';
        const result = await rtb.forgetByField(field, value, reason);
        const envelope = createEnvelope({
          ok: result.status !== 'failed',
          command: 'forget field',
          version: getCliVersion(),
          data: result,
        });

        printHeader('Forget by Field — Result');
        printLine(`  Field: ${field}`);
        printLine(`  Value: ${value}`);
        printLine(`  Status: ${result.status}`);
        printLine(`  Records deleted: ${result.totalRecordsDeleted}`);
        printLine(`  Stores affected: ${result.storesAffected.length}`);
        if (result.errors.length > 0) {
          for (const err of result.errors) printLine(`  Error: ${err}`);
        }

        if (opts.json) {
          printLine(JSON.stringify(envelope, null, 2));
        }
        printResult(`Request ${result.requestId} — ${result.status}`, result.status !== 'failed');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        printResult(`Error: ${message}`, false);
      }
    });

  cmd
    .command('status')
    .description('Checks status of a forget request')
    .argument('<requestId>', 'Request ID')
    .option('--json', 'JSON output')
    .action((requestId: string, opts: Record<string, unknown>) => {
      try {
        const request = rtb.getRequest(requestId);
        if (!request) {
          printResult(`Request ${requestId} not found`, false);
          return;
        }

        const envelope = createEnvelope({
          ok: true,
          command: 'forget status',
          version: getCliVersion(),
          data: request,
        });

        printHeader('Forget Request Status');
        printLine(`  ID: ${request.id}`);
        printLine(`  User: ${request.userId}`);
        printLine(`  Status: ${request.status}`);
        printLine(`  Reason: ${request.reason}`);
        printLine(`  Requested: ${request.requestedAt}`);
        printLine(`  Completed: ${request.completedAt ?? 'N/A'}`);
        printLine(`  Records deleted: ${request.recordsDeleted}`);

        if (opts.json) {
          printLine(JSON.stringify(envelope, null, 2));
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        printResult(`Error: ${message}`, false);
      }
    });

  cmd
    .command('history')
    .description('Shows forget request history for a user')
    .argument('<userId>', 'User ID')
    .option('--json', 'JSON output')
    .action((userId: string, opts: Record<string, unknown>) => {
      try {
        const requests = rtb.getRequestsByUser(userId);
        const envelope = createEnvelope({
          ok: true,
          command: 'forget history',
          version: getCliVersion(),
          data: { userId, requests },
        });

        printHeader(`Forget History — ${userId}`);
        if (requests.length === 0) {
          printLine('  No requests found for this user.');
        } else {
          printLine(`  Total requests: ${requests.length}`);
          for (const req of requests) {
            printLine(`    [${req.status}] ${req.id} — ${req.recordsDeleted} records — ${req.requestedAt}`);
          }
        }

        if (opts.json) {
          printLine(JSON.stringify(envelope, null, 2));
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        printResult(`Error: ${message}`, false);
      }
    });

  cmd
    .command('stores')
    .description('Lists registered data stores')
    .option('--json', 'JSON output')
    .action((opts: Record<string, unknown>) => {
      try {
        const stores = rtb.listStores();
        const envelope = createEnvelope({
          ok: true,
          command: 'forget stores',
          version: getCliVersion(),
          data: { stores },
        });

        printHeader('Registered Data Stores');
        if (stores.length === 0) {
          printLine('  No stores registered.');
        } else {
          for (const store of stores) {
            printLine(`  ${store}`);
          }
        }

        if (opts.json) {
          printLine(JSON.stringify(envelope, null, 2));
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        printResult(`Error: ${message}`, false);
      }
    });

  return cmd;
}
