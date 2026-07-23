import { TelemetryEvent, TelemetryMetric, TelemetryAlert } from './telemetry-types';
import { TraceSpan } from './telemetry-tracer';

export interface TelemetryReport {
  generatedAt: string;
  totalEvents: number;
  metrics: TelemetryMetric[];
  alerts: TelemetryAlert[];
  spans: TraceSpan[];
  summary: string[];
}

export function buildTelemetryReport(params: {
  events: TelemetryEvent[];
  metrics: TelemetryMetric[];
  alerts: TelemetryAlert[];
  spans: TraceSpan[];
}): TelemetryReport {
  const summary: string[] = [
    `${params.events.length} evento(s) coletado(s)`,
    `${params.metrics.length} métrica(s) agregada(s)`,
    `${params.alerts.length} alerta(s) ativo(s)`,
    `${params.spans.length} span(s) rastreado(s)`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    totalEvents: params.events.length,
    metrics: params.metrics,
    alerts: params.alerts,
    spans: params.spans,
    summary,
  };
}
