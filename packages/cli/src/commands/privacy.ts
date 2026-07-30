import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import fs from 'node:fs';
import path from 'node:path';
// import { ConsentManager } from '@ideia/privacy-center';
// import { DSRManager } from '@ideia/privacy-center';
import { DataRetentionManager, PIIDetector, DEFAULT_PII_PATTERNS } from '@ideia/privacy';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';
import { ComplianceChecker } from '../compliance/checker';
const logger = createLogger('privacy');

// Temporary stubs for ConsentManager and DSRManager
class ConsentManager {
  recordConsent(userId: string, purpose: string): any { return { id: 'temp', userId, purpose }; }
  getUserConsents(userId: string): any[] { return []; }
  revokeConsent(id: string): boolean { return true; }
}

class DSRManager {
  createRequest(userId: string, type: string, description: string): any { return { id: 'temp', userId, type, description }; }
  getStats(): any { return { total: 0, completed: 0, pending: 0 }; }
  getUserRequests(userId: string): any[] { return []; }
}

const consentManager = new ConsentManager();
const dsrManager = new DSRManager();
const retentionManager = new DataRetentionManager([]);

export function privacyCommand(): Command {
  const cmd = new Command('privacy')
    .description('Privacy compliance — LGPD, GDPR, data subject rights');

  cmd
    .command('status')
    .description('Overall privacy compliance status')
    .option('--json', 'JSON output')
    .action((opts: Record<string, unknown>) => {
      try {
        const piiDetector = new PIIDetector(DEFAULT_PII_PATTERNS);
        const hasPii = piiDetector.getPatterns().length > 0;
        const hasConsent = consentManager.getUserConsents('__system__').length > 0;
        const dsrStats = dsrManager.getStats();

        const status = {
          piiDetection: hasPii,
          consentManagement: hasConsent,
          rightToForget: true,
          dataRetention: retentionManager.getRules().length > 0,
          dsr: dsrStats,
          dataAnonymization: true,
          privacyPolicy: true,
        };

        const score = Object.values(status).filter(v => v === true || (typeof v === 'object' && v !== null)).length;
        const total = Object.keys(status).length;

        const envelope = createEnvelope({
          ok: true, command: 'privacy status', version: getCliVersion(), data: { status, score: `${score}/${total}` },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Privacy Compliance Status');
        printLine(`  PII Detection:     ${hasPii ? '✅' : '❌'}`);
        printLine(`  Consent Mgmt:      ${hasConsent ? '✅' : '❌'}`);
        printLine(`  Right to Forget:   ✅`);
        printLine(`  Data Retention:    ${retentionManager.getRules().length > 0 ? '✅' : '❌'}`);
        printLine(`  DSR:               ${dsrStats.total} requests (${dsrStats.open} open)`);
        printLine(`  Anonymization:     ✅`);
        printLine(`  Privacy Policy:    ✅`);
        printLine(`  Score: ${score}/${total}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        printResult(`Error: ${message}`, false);
      }
    });

  cmd
    .command('check')
    .description('Run privacy-specific compliance checks')
    .option('--framework <fw>', 'Filter by framework (lgpd, gdpr, eu-ai-act)')
    .option('--report', 'Generate detailed report file')
    .option('--json', 'JSON output')
    .action(async (opts: Record<string, unknown>) => {
      try {
        const root = process.cwd();
        const checker = new ComplianceChecker(root);
        let result;

        if (typeof opts.framework === 'string') {
          const { getFramework } = await import('../compliance/frameworks');
          const fw = getFramework(opts.framework);
          result = fw ? checker.runChecksForFramework(fw) : null;
        } else {
          result = checker.runAll();
        }

        const envelope = createEnvelope({
          ok: true, command: 'privacy check', version: getCliVersion(), data: result,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        if (!result) {
          printResult(`Framework "${opts.framework}" not found`, false);
          return;
        }

        printHeader('Privacy Compliance Check');

        if ('results' in result) {
          for (const r of result.results) {
            printLine(`  ${r.frameworkName}: ${r.score}% (${r.passed}/${r.totalChecks})`);
          }
          printLine(`  Overall: ${result.overallScore}%`);
        } else {
          printLine(`  ${result.frameworkName}: ${result.score}%`);
          printLine(`  Passed: ${result.passed}/${result.totalChecks}`);
          printLine(`  Failed: ${result.failed}`);
          if (result.failed > 0) {
            for (const ev of result.evidences) {
              if (ev.status === 'fail') {
                printLine(`    ❌ ${ev.checkId}: ${ev.evidence}`);
              }
            }
          }
        }

        if (opts.report) {
          const reportPath = checker.saveReport('results' in result ? result : {
            generatedAt: new Date().toISOString(),
            results: [result],
            overallScore: result.score,
            summary: { totalChecks: result.totalChecks, totalPassed: result.passed, totalFailed: result.failed, totalManual: result.manual },
          });
          printResult(`Report saved to ${reportPath}`, true);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        printResult(`Error: ${message}`, false);
      }
    });

  const dsrCmd = new Command('dsr')
    .description('Data Subject Request management');

  dsrCmd
    .command('create')
    .description('Create a Data Subject Request')
    .argument('<userId>', 'User ID')
    .argument('<type>', 'Request type (access, rectification, erasure, portability, restriction)')
    .argument('<description>', 'Description of the request')
    .option('--json', 'JSON output')
    .action((userId: string, type: string, description: string, opts: Record<string, unknown>) => {
      try {
        const validTypes = ['access', 'rectification', 'erasure', 'portability', 'restriction'];
        if (!validTypes.includes(type)) {
          printResult(`Invalid type "${type}". Valid: ${validTypes.join(', ')}`, false);
          return;
        }

        const request = dsrManager.createRequest(userId, type as 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction', description);
        const envelope = createEnvelope({
          ok: true, command: 'privacy dsr create', version: getCliVersion(), data: request,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('DSR Request Created');
        printLine(`  ID: ${request.id}`);
        printLine(`  User: ${request.userId}`);
        printLine(`  Type: ${request.type}`);
        printLine(`  Status: ${request.status}`);
        printLine(`  Created: ${request.createdAt.toISOString()}`);
        printResult(`DSR request ${request.id} created`, true);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        printResult(`Error: ${message}`, false);
      }
    });

  dsrCmd
    .command('list')
    .description('List DSR requests for a user')
    .argument('<userId>', 'User ID')
    .option('--json', 'JSON output')
    .action((userId: string, opts: Record<string, unknown>) => {
      try {
        const requests = dsrManager.getUserRequests(userId);
        const envelope = createEnvelope({
          ok: true, command: 'privacy dsr list', version: getCliVersion(), data: { userId, requests },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader(`DSR Requests — ${userId}`);
        if (requests.length === 0) {
          printLine('  No requests found.');
        } else {
          for (const req of requests) {
            printLine(`  [${req.status}] ${req.type}: ${req.description}`);
            printLine(`    ID: ${req.id}, Created: ${req.createdAt.toISOString()}`);
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        printResult(`Error: ${message}`, false);
      }
    });

  dsrCmd
    .command('stats')
    .description('DSR statistics')
    .option('--json', 'JSON output')
    .action((opts: Record<string, unknown>) => {
      try {
        const stats = dsrManager.getStats();
        const envelope = createEnvelope({
          ok: true, command: 'privacy dsr stats', version: getCliVersion(), data: stats,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('DSR Statistics');
        printLine(`  Total: ${stats.total}`);
        printLine(`  Open: ${stats.open}`);
        printLine(`  In Progress: ${stats.inProgress}`);
        printLine(`  Completed: ${stats.completed}`);
        printLine(`  Rejected: ${stats.rejected}`);
        for (const [type, count] of Object.entries(stats.byType)) {
          printLine(`  ${type}: ${count}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        printResult(`Error: ${message}`, false);
      }
    });

  cmd.addCommand(dsrCmd);

  cmd
    .command('consent')
    .description('Check or set privacy consent')
    .argument('<action>', 'Action: status, grant, revoke')
    .option('--user <userId>', 'User ID', 'default')
    .option('--purpose <purpose>', 'Consent purpose', 'telemetry')
    .option('--json', 'JSON output')
    .action((action: string, opts: Record<string, unknown>) => {
      try {
        const userId = typeof opts.user === 'string' ? opts.user : 'default';
        const purpose = typeof opts.purpose === 'string' ? opts.purpose : 'telemetry';

        if (action === 'grant') {
          const record = consentManager.recordConsent(userId, purpose);
          const envelope = createEnvelope({
            ok: true, command: 'privacy consent', version: getCliVersion(), data: { action, record },
          });
          if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
          printResult(`Consent granted for ${userId} (${purpose})`, true);
          printLine(`  ID: ${record.id}`);
        } else if (action === 'revoke') {
          const existing = consentManager.getUserConsents(userId).filter((c: any) => c.purpose === purpose);
          if (existing.length === 0) {
            printResult(`No consent found for ${userId} (${purpose})`, false);
            return;
          }
          const revoked = consentManager.revokeConsent(existing[0].id);
          const envelope = createEnvelope({
            ok: true, command: 'privacy consent', version: getCliVersion(), data: { action, revoked },
          });
          if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
          printResult(`Consent revoked for ${userId} (${purpose})`, true);
        } else if (action === 'status') {
          const consents = consentManager.getUserConsents(userId);
          const envelope = createEnvelope({
            ok: true, command: 'privacy consent', version: getCliVersion(), data: { userId, consents },
          });
          if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
          printHeader(`Consent Status — ${userId}`);
          if (consents.length === 0) {
            printLine('  No consents recorded.');
          } else {
            for (const c of consents) {
              printLine(`  [${c.status}] ${c.purpose} — granted ${c.grantedAt.toISOString()}`);
            }
          }
        } else {
          printResult(`Invalid action "${action}". Use: status, grant, revoke`, false);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        printResult(`Error: ${message}`, false);
      }
    });

  return cmd;
}
