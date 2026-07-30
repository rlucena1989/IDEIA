import * as crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
import type { CliCommandResult } from '../types/cli-result';
import { success, failure } from '../types/cli-result';
import { getIO } from '../io';
import type { IOContainer } from '../io/interfaces';
const logger = createLogger('audit-use-case');

export interface AuditEvent {
  id: string;
  eventType: string;
  actor: 'user' | 'system' | 'ai';
  target: string;
  result: 'success' | 'failure' | 'blocked';
  timestamp: string;
  metadata?: Record<string, unknown>;
  previousHash: string;
  hash: string;
}

export interface AuditQueryResult {
  events: AuditEvent[];
  total: number;
  chainValid: boolean;
}

export interface AuditVerifyOutput {
  valid: boolean;
  totalEvents: number;
  breakAtIndex?: number;
  breakReason?: string;
  currentTipHash: string;
}

export class AuditUseCase {
  private io: IOContainer;
  private readonly auditDir: string;

  constructor(auditDir?: string) {
    this.io = getIO();
    this.auditDir = auditDir ?? '.ai/audit';
  }

  private generateHash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  private getAuditFilePath(): string {
    return this.auditDir + '/audit-trail.jsonl';
  }

  execute(eventType: string, actor: 'user' | 'system' | 'ai', target: string, metadata?: Record<string, unknown>): CliCommandResult<AuditEvent> {
    try {
      const events = this.loadEvents();
      const previousHash = events.length > 0 ? events[events.length - 1].hash : '0'.repeat(64);
      const timestamp = new Date().toISOString();

      const event: AuditEvent = {
        id: crypto.randomUUID(),
        eventType,
        actor,
        target,
        result: 'success',
        timestamp,
        metadata,
        previousHash,
        hash: '',
      };

      const payload = `${event.id}|${event.eventType}|${event.actor}|${event.target}|${event.timestamp}|${event.previousHash}`;
      event.hash = this.generateHash(payload);

      this.io.fs.ensureDir(this.auditDir);
      this.io.fs.append(this.getAuditFilePath(), JSON.stringify(event) + '\n');

      return success(`Audit event recorded: ${eventType} by ${actor}`, event);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return failure(`Audit failed: ${message}`, 1) as CliCommandResult<AuditEvent>;
    }
  }

  private loadEvents(): AuditEvent[] {
    const filePath = this.getAuditFilePath();
    try {
      if (!this.io.fs.exists(filePath)) return [];
      const raw = this.io.fs.read(filePath, 'utf-8');
      return raw.split('\n').filter(Boolean).map(line => JSON.parse(line) as AuditEvent);
    } catch {
      return [];
    }
  }

  show(limit: number = 50): CliCommandResult<AuditQueryResult> {
    try {
      const events = this.loadEvents();
      const sliced = events.slice(-limit);
      const chainValid = this.verifyChain().valid;
      return success(`Audit trail: ${events.length} events (showing last ${sliced.length})`, {
        events: sliced,
        total: events.length,
        chainValid,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return failure(`Audit show failed: ${message}`, 1) as CliCommandResult<AuditQueryResult>;
    }
  }

  verifyChain(): AuditVerifyOutput {
    try {
      const events = this.loadEvents();
      if (events.length === 0) {
        return { valid: true, totalEvents: 0, currentTipHash: '0'.repeat(64) };
      }

      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const expectedPreviousHash = i === 0 ? '0'.repeat(64) : events[i - 1].hash;
        if (event.previousHash !== expectedPreviousHash) {
          return {
            valid: false,
            totalEvents: events.length,
            breakAtIndex: i,
            breakReason: `Hash mismatch at event ${i}: expected previous ${expectedPreviousHash}, got ${event.previousHash}`,
            currentTipHash: events[events.length - 1].hash,
          };
        }
        const payload = `${event.id}|${event.eventType}|${event.actor}|${event.target}|${event.timestamp}|${event.previousHash}`;
        const expectedHash = this.generateHash(payload);
        if (event.hash !== expectedHash) {
          return {
            valid: false,
            totalEvents: events.length,
            breakAtIndex: i,
            breakReason: `Event ${i} hash mismatch: calculated ${expectedHash}, stored ${event.hash}`,
            currentTipHash: events[events.length - 1].hash,
          };
        }
      }

      return { valid: true, totalEvents: events.length, currentTipHash: events[events.length - 1].hash };
    } catch (err) {
      return { valid: false, totalEvents: 0, breakReason: 'Failed to verify chain', currentTipHash: '' };
    }
  }

  prove(eventId: string): CliCommandResult<AuditEvent | null> {
    try {
      const events = this.loadEvents();
      const event = events.find(e => e.id === eventId);
      if (!event) {
        return failure(`Event not found: ${eventId}`, 1, null) as CliCommandResult<AuditEvent | null>;
      }
      return success(`Event proven: ${event.eventType} at ${event.timestamp}`, event);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return failure(`Audit prove failed: ${message}`, 1) as CliCommandResult<AuditEvent | null>;
    }
  }
}
