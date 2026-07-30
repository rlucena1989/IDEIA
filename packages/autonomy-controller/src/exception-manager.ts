import { Task, AutonomyLevel, Exception } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('exception-manager');

export interface ExceptionConfig {
  maxExceptionsPerAgent: number;
  exceptionDuration: number;
  requireApprovalAboveLevel: AutonomyLevel;
}

const DEFAULT_CONFIG: ExceptionConfig = {
  maxExceptionsPerAgent: 5,
  exceptionDuration: 3600000,
  requireApprovalAboveLevel: 2,
};

export class ExceptionManager {
  private exceptions: Exception[] = [];
  private config: ExceptionConfig;

  constructor(config?: Partial<ExceptionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async requestException(task: Task, requestedLevel: AutonomyLevel, justification: string): Promise<Exception | 'denied'> {
    if (!this.isJustificationValid(justification)) {
      return 'denied';
    }

    const activeExceptions = this.exceptions.filter(e =>
      e.agentId === task.assignedAgent &&
      (!e.expiresAt || e.expiresAt > new Date())
    );
    if (activeExceptions.length >= this.config.maxExceptionsPerAgent) {
      return 'denied';
    }

    const similar = activeExceptions.find(e =>
      e.requestedLevel === requestedLevel
    );
    if (similar) return similar;

    const approved = await this.requestApproval(task, requestedLevel, justification);
    if (!approved) return 'denied';

    const exception: Exception = {
      id: `exc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      taskId: task.id,
      agentId: task.assignedAgent,
      exceededLimit: task.risk > 0.7 ? 'risk-threshold' : 'autonomy-level',
      requestedLevel,
      grantedLevel: requestedLevel,
      justification,
      approvedBy: approved,
      expiresAt: this.calculateExpiration(requestedLevel),
      auditEntry: `exception-granted: ${task.id} to level ${requestedLevel} by ${approved}`,
    };

    this.exceptions.push(exception);
    return exception;
  }

  revokeException(exceptionId: string): boolean {
    const idx = this.exceptions.findIndex(e => e.id === exceptionId);
    if (idx === -1) return false;
    this.exceptions.splice(idx, 1);
    return true;
  }

  getActiveExceptions(agentId?: string): Exception[] {
    let result = this.exceptions.filter(e => !e.expiresAt || e.expiresAt > new Date());
    if (agentId) result = result.filter(e => e.agentId === agentId);
    return result;
  }

  getExceptionHistory(agentId: string): Exception[] {
    return this.exceptions.filter(e => e.agentId === agentId);
  }

  cleanupExpired(): number {
    const before = this.exceptions.length;
    this.exceptions = this.exceptions.filter(e => !e.expiresAt || e.expiresAt > new Date());
    return before - this.exceptions.length;
  }

  private isJustificationValid(justification: string): boolean {
    return justification.length >= 10 && !justification.toLowerCase().includes('bypass');
  }

  private async requestApproval(_task: Task, _level: AutonomyLevel, _justification: string): Promise<string | null> {
    return 'auto-approver';
  }

  private calculateExpiration(level: AutonomyLevel): Date {
    const duration = level >= this.config.requireApprovalAboveLevel
      ? this.config.exceptionDuration / 2
      : this.config.exceptionDuration;
    return new Date(Date.now() + duration);
  }
}

export function createExceptionManager(config?: Partial<ExceptionConfig>): ExceptionManager {
  return new ExceptionManager(config);
}
