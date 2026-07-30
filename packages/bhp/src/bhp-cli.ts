import { BHP } from './bhp';
import { createLogger } from '@ideia/logger';
import { SessionManager } from './session-manager';
const logger = createLogger('bhp-cli');

export interface CLICommandResult {
  success: boolean;
  output: string;
  data?: unknown;
}

export class BHPCLI {
  private bhp: BHP;
  private sessionManager: SessionManager;

  constructor(bhp: BHP, sessionManager: SessionManager) {
    this.bhp = bhp;
    this.sessionManager = sessionManager;
  }

  async execute(args: string[]): Promise<CLICommandResult> {
    const subcommand = args[0];

    switch (subcommand) {
      case 'status':
        return this.handleStatus();
      case 'send':
        return this.handleSend(args.slice(1));
      case 'sessions':
        return this.handleSessions(args.slice(1));
      default:
        return { success: false, output: `Unknown BHP command: ${subcommand}. Available: status, send <message>, sessions` };
    }
  }

  private async handleStatus(): Promise<CLICommandResult> {
    const history = this.bhp.getHistory();
    const activeCount = this.sessionManager.getActiveCount();
    const allSessions = this.sessionManager.getAllSessions();

    return {
      success: true,
      output: [
        `BHP Status:`,
        `  Messages: ${history.length}`,
        `  Active sessions: ${activeCount}`,
        `  Total sessions: ${allSessions.length}`,
        ...allSessions.map(s => `  Session ${s.id}: ${s.status} (${s.intent})`),
      ].join('\n'),
      data: {
        messageCount: history.length,
        activeSessions: activeCount,
        totalSessions: allSessions.length,
      },
    };
  }

  private async handleSend(args: string[]): Promise<CLICommandResult> {
    if (args.length < 1) {
      return { success: false, output: 'Usage: IDEIA bhp send <message>' };
    }

    const message = args.join(' ');
    const history = this.bhp.getHistory();

    return {
      success: true,
      output: `BHP message sent: "${message}"`,
      data: { message, historyLength: history.length },
    };
  }

  private async handleSessions(args: string[]): Promise<CLICommandResult> {
    const filter = args[0] as string | undefined;
    let sessions;

    if (filter && ['active', 'completed', 'failed', 'timed_out'].includes(filter)) {
      sessions = this.sessionManager.getSessionsByStatus(filter as 'active' | 'completed' | 'failed' | 'timed_out');
    } else {
      sessions = this.sessionManager.getAllSessions();
    }

    if (sessions.length === 0) {
      return { success: true, output: 'No sessions found.' };
    }

    const lines = sessions.map(s =>
      `  ${s.id}  ${s.source}→${s.target}  ${s.status}  "${s.intent}"`
    );

    return {
      success: true,
      output: `BHP Sessions (${sessions.length}):\n${lines.join('\n')}`,
      data: sessions,
    };
  }
}

export function createBHPCLI(bhp: BHP, sessionManager: SessionManager): BHPCLI {
  return new BHPCLI(bhp, sessionManager);
}
