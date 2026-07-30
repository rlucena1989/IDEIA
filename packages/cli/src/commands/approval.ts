import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';
import { ApprovalLevel, ApprovalStatus, createApprovalFlow } from '@ideia/policy-engine';
import path from 'path';
import os from 'os';
const logger = createLogger('approval');

const approvalFlow = createApprovalFlow();

export function approvalCommand(): Command {
  const cmd = new Command('approval')
    .description('3-level approval flow management');

  cmd
    .command('request')
    .description('Request approval for an action')
    .argument('<resource-type>', 'Type of resource (policy, autonomy, safety)')
    .argument('<resource-id>', 'ID of the resource')
    .argument('<action>', 'Action to approve')
    .option('--level <level>', 'Required approval level (self, team, organization)', 'organization')
    .option('--approvers <approvers>', 'Comma-separated approver IDs')
    .option('--reason <reason>', 'Reason for the request')
    .option('--json', 'Output in JSON format')
    .action((resourceType: string, resourceId: string, action: string, opts): void => {
      try {
        const level = opts.level as ApprovalLevel;
        const approvers = opts.approvers ? opts.approvers.split(',') : ['admin'];
        const request = approvalFlow.createRequest(
          resourceType, resourceId, action, 'cli-user', level, approvers,
          { reason: opts.reason }
        );

        if (opts.json) {
          printLine(JSON.stringify({ ok: true, data: request }));
          return;
        }

        printHeader('Approval Request');
        printLine(`  ID: ${request.id}`);
        printLine(`  Action: ${action}`);
        printLine(`  Resource: ${resourceType}/${resourceId}`);
        printLine(`  Required Level: ${level}`);
        printLine(`  Status: ${request.status}`);
      } catch (error: unknown) {
        printLine(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

  cmd
    .command('list')
    .description('List pending approval requests')
    .option('--level <level>', 'Filter by approval level')
    .option('--json', 'Output in JSON format')
    .action((opts): void => {
      try {
        const level = opts.level as ApprovalLevel | undefined;
        const pending = approvalFlow.getPendingRequests(level);

        if (opts.json) {
          printLine(JSON.stringify({ ok: true, count: pending.length, data: pending }));
          return;
        }

        printHeader(`Pending Approval Requests (${pending.length})`);
        for (const req of pending) {
          printLine(`  ${req.id.substring(0, 12)}... | ${req.action} | ${req.resourceType}/${req.resourceId} | Level: ${req.currentLevel}`);
        }
      } catch (error: unknown) {
        printLine(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

  cmd
    .command('handle')
    .description('Approve or reject a request')
    .argument('<request-id>', 'ID of the request')
    .argument('<action>', 'Action: approve or reject')
    .option('--by <by>', 'Approver ID', 'admin')
    .option('--reason <reason>', 'Reason for rejection')
    .option('--json', 'Output in JSON format')
    .action((requestId: string, action: string, opts): void => {
      try {
        if (action === 'approve') {
          const result = approvalFlow.approve(requestId, opts.by, opts.reason);
          if (opts.json) {
            printLine(JSON.stringify({ ok: true, data: result }));
            return;
          }
          printResult('Approved', true, `Request ${requestId} approved by ${opts.by}`);
        } else if (action === 'reject') {
          const reason = opts.reason ?? 'No reason provided';
          const result = approvalFlow.reject(requestId, opts.by, reason);
          if (opts.json) {
            printLine(JSON.stringify({ ok: true, data: result }));
            return;
          }
          printResult('Rejected', false, `Request ${requestId} rejected by ${opts.by}`);
        } else {
          printLine(`Unknown action: ${action}. Use 'approve' or 'reject'.`);
        }
      } catch (error: unknown) {
        printLine(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

  return cmd;
}
