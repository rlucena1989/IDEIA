import { createLogger } from '@ideia/logger';

const log = createLogger('cli:utils:dry-run');

export interface DryRunResult {
  wouldExecute: boolean;
  operations: DryRunOperation[];
  summary: string;
}

export interface DryRunOperation {
  type: 'file' | 'command' | 'network' | 'database' | 'config';
  action: string;
  target: string;
  details?: Record<string, unknown>;
}

export class DryRunExecutor {
  private enabled: boolean;
  private operations: DryRunOperation[] = [];

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  recordFileOperation(action: 'read' | 'write' | 'delete' | 'create', target: string, details?: Record<string, unknown>): void {
    if (this.enabled) {
      this.operations.push({
        type: 'file',
        action: `${action} ${target}`,
        target,
        details,
      });
    }
  }

  recordCommand(command: string, details?: Record<string, unknown>): void {
    if (this.enabled) {
      this.operations.push({
        type: 'command',
        action: command,
        target: 'shell',
        details,
      });
    }
  }

  recordNetworkRequest(url: string, method: string, details?: Record<string, unknown>): void {
    if (this.enabled) {
      this.operations.push({
        type: 'network',
        action: `${method} ${url}`,
        target: url,
        details,
      });
    }
  }

  recordDatabaseOperation(operation: string, table: string, details?: Record<string, unknown>): void {
    if (this.enabled) {
      this.operations.push({
        type: 'database',
        action: operation,
        target: table,
        details,
      });
    }
  }

  recordConfigChange(key: string, value: unknown, details?: Record<string, unknown>): void {
    if (this.enabled) {
      this.operations.push({
        type: 'config',
        action: `set ${key} = ${JSON.stringify(value)}`,
        target: key,
        details: { ...details, value },
      });
    }
  }

  getResult(): DryRunResult {
    const summary = this.generateSummary();
    return {
      wouldExecute: this.operations.length > 0,
      operations: [...this.operations],
      summary,
    };
  }

  clear(): void {
    this.operations = [];
  }

  private generateSummary(): string {
    if (this.operations.length === 0) {
      return 'No operations would be executed.';

    }

    const byType = this.operations.reduce((acc, op) => {
      acc[op.type] = (acc[op.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const parts = Object.entries(byType).map(([type, count]) => `${count} ${type}`);
    return `Would execute ${this.operations.length} operations: ${parts.join(', ')}.`;
  }

  printResult(): void {
    if (!this.enabled) {
      log.info('Dry-run is disabled. Operations will be executed.');
      return;
    }

    const result = this.getResult();
    log.info('\n=== DRY RUN RESULT ===');
    log.info(result.summary);
    log.info('\nOperations:');
    
    for (const op of result.operations) {
      log.info(`  [${op.type}] ${op.action}`);
      if (op.details && Object.keys(op.details).length > 0) {
        log.info(`    Details: ${JSON.stringify(op.details, null, 2)}`);
      }
    }
    
    log.info('=====================\n');
  }
}

export function createDryRunExecutor(enabled: boolean = false): DryRunExecutor {
  return new DryRunExecutor(enabled);
}
