import * as crypto from 'node:crypto';

export interface OperationalFailure {
  failureId: string;
  type: 'transient' | 'validation' | 'consistency' | 'synchronization' | 'integrity' | 'execution' | 'critical';
  source: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  occurredAt: string;
  requestId?: string;
  correlationId?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface FailureSummary {
  total: number;
  critical: number;
  byType: Record<string, number>;
}

export function createFailure(params: {
  type: OperationalFailure['type'];
  source: string;
  message: string;
  severity: OperationalFailure['severity'];
  requestId?: string;
  correlationId?: string;
  metadata?: Record<string, string | number | boolean>;
}): OperationalFailure {
  return {
    failureId: crypto.randomUUID(),
    type: params.type,
    source: params.source,
    message: params.message,
    severity: params.severity,
    occurredAt: new Date().toISOString(),
    requestId: params.requestId,
    correlationId: params.correlationId,
    metadata: params.metadata,
  };
}
