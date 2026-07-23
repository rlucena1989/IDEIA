import * as crypto from 'node:crypto';

export interface TelemetryEvent {
  eventId: string;
  name: string;
  timestamp: string;
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  source: string;
  requestId: string;
  correlationId?: string;
  tags: string[];
  payload?: Record<string, string | number | boolean>;
}

export interface TelemetryMetric {
  metricId: string;
  name: string;
  value: number;
  unit: string;
  collectedAt: string;
  labels: Record<string, string>;
}

export interface TelemetryAlert {
  alertId: string;
  name: string;
  severity: 'warning' | 'critical';
  reason: string;
  createdAt: string;
  acknowledged: boolean;
}

export function createTelemetryEvent(params: {
  name: string;
  severity: TelemetryEvent['severity'];
  source: string;
  requestId: string;
  correlationId?: string;
  tags?: string[];
  payload?: Record<string, string | number | boolean>;
}): TelemetryEvent {
  return {
    eventId: crypto.randomUUID(),
    name: params.name,
    timestamp: new Date().toISOString(),
    severity: params.severity,
    source: params.source,
    requestId: params.requestId,
    correlationId: params.correlationId,
    tags: params.tags ?? [],
    payload: params.payload,
  };
}
