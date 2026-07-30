import { createLogger } from '@ideia/logger';
import { NatsMetrics, SLOStatus, Alert, MetricSnapshot } from './types';
import { MetricsCollector } from './metrics-collector';
import { SloMonitor } from './slo-monitor';
import { PrometheusExporter } from './prometheus-exporter';
import { AlertManager } from './alert-manager';

export class ObservabilityEngine {
  private metricsCollector: MetricsCollector;
  private sloMonitor: SloMonitor;
  private prometheusExporter: PrometheusExporter;
  private alertManager: AlertManager;
  private logger = createLogger('observability:engine');

  constructor(
    options?: {
      metricsCollector?: MetricsCollector;
      sloMonitor?: SloMonitor;
      prometheusExporter?: PrometheusExporter;
      alertManager?: AlertManager;
    }
  ) {
    this.metricsCollector = options?.metricsCollector ?? new MetricsCollector();
    this.sloMonitor = options?.sloMonitor ?? new SloMonitor();
    this.prometheusExporter = options?.prometheusExporter ?? new PrometheusExporter();
    this.alertManager = options?.alertManager ?? new AlertManager();
  }

  collectMetrics(): NatsMetrics {
    this.logger.info('collecting metrics');
    return this.metricsCollector.collect();
  }

  checkSLOs(metrics: NatsMetrics): SLOStatus[] {
    this.logger.debug('checking SLOs');
    return this.sloMonitor.checkSLOs(metrics);
  }

  getAlerts(): Alert[] {
    return this.alertManager.getAlerts();
  }

  evaluateAlerts(metrics: NatsMetrics): Alert[] {
    this.logger.debug('evaluating alert rules');
    return this.alertManager.evaluateRules(metrics);
  }

  exportPrometheus(metrics: NatsMetrics): string {
    this.logger.debug('exporting prometheus metrics');
    return this.prometheusExporter.formatMetrics(metrics);
  }

  snapshot(): MetricSnapshot {
    const metrics = this.collectMetrics();
    const slos = this.checkSLOs(metrics);

    return {
      timestamp: Date.now(),
      metrics,
      slos,
    };
  }
}

export function createObservabilityEngine(options?: {
  metricsCollector?: MetricsCollector;
  sloMonitor?: SloMonitor;
  prometheusExporter?: PrometheusExporter;
  alertManager?: AlertManager;
}): ObservabilityEngine {
  return new ObservabilityEngine(options);
}
