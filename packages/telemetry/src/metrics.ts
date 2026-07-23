import { getTelemetry } from './opentelemetry';

export interface PrometheusMetric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram';
  values: Array<{ labels: Record<string, string>; value: number }>;
}

interface MetricRegistry {
  [name: string]: {
    help: string;
    type: 'counter' | 'gauge' | 'histogram';
    values: Map<string, { value: number; count: number; sum: number }>;
  };
}

export class MetricsExporter {
  private registry: MetricRegistry = {};

  register(name: string, help: string, type: 'counter' | 'gauge' | 'histogram'): void {
    if (!this.registry[name]) {
      this.registry[name] = { help, type, values: new Map() };
    }
  }

  private labelKey(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }

  record(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.registry[name];
    if (!metric) {
      this.register(name, `auto-registered metric: ${name}`, 'counter');
    }

    const key = this.labelKey(labels ?? {});
    const entry = this.registry[name].values.get(key) ?? { value: 0, count: 0, sum: 0 };

    switch (this.registry[name].type) {
      case 'counter':
        entry.value += value;
        break;
      case 'gauge':
        entry.value = value;
        break;
      case 'histogram':
        entry.count++;
        entry.sum += value;
        entry.value = entry.count > 0 ? entry.sum / entry.count : 0;
        break;
    }

    this.registry[name].values.set(key, entry);

    getTelemetry().recordMetric(name, value, labels, this.registry[name].type);
  }

  exportPrometheus(): string {
    let output = '';

    for (const [name, metric] of Object.entries(this.registry)) {
      output += `# HELP ${name} ${metric.help}\n`;
      output += `# TYPE ${name} ${metric.type}\n`;

      for (const [labelStr, entry] of metric.values) {
        const labels = labelStr ? `{${labelStr}}` : '';
        switch (metric.type) {
          case 'counter':
          case 'gauge':
            output += `${name}${labels} ${entry.value}\n`;
            break;
          case 'histogram':
            output += `${name}_count${labels} ${entry.count}\n`;
            output += `${name}_sum${labels} ${entry.sum}\n`;
            output += `${name}_avg${labels} ${entry.value}\n`;
            break;
        }
      }
    }

    return output;
  }

  getMetrics(): PrometheusMetric[] {
    return Object.entries(this.registry).map(([name, metric]) => ({
      name,
      help: metric.help,
      type: metric.type,
      values: Array.from(metric.values.entries()).map(([labelStr, entry]) => ({
        labels: Object.fromEntries(labelStr.split(',').filter(Boolean).map(s => {
          const [k, v] = s.split('=');
          return [k, v?.replace(/"/g, '') ?? ''];
        })),
        value: entry.value,
      })),
    }));
  }

  clear(): void {
    this.registry = {};
  }
}

let defaultExporter: MetricsExporter | null = null;

export function getMetricsExporter(): MetricsExporter {
  if (!defaultExporter) {
    defaultExporter = new MetricsExporter();
    defaultExporter.register('http_requests_total', 'Total HTTP requests', 'counter');
    defaultExporter.register('http_request_duration_ms', 'HTTP request duration in ms', 'histogram');
    defaultExporter.register('active_connections', 'Number of active connections', 'gauge');
    defaultExporter.register('llm_tokens_total', 'Total LLM tokens used', 'counter');
    defaultExporter.register('llm_request_duration_ms', 'LLM request duration', 'histogram');
    defaultExporter.register('events_processed_total', 'Total events processed', 'counter');
    defaultExporter.register('cache_hit_ratio', 'Cache hit ratio', 'gauge');
    defaultExporter.register('memory_heap_used_bytes', 'Heap memory used', 'gauge');
    defaultExporter.register('agent_execution_duration_ms', 'Agent execution duration', 'histogram');
  }
  return defaultExporter;
}

export function prometheusHandler(): (req: unknown, res: { writeHead: (code: number, headers: Record<string, string>) => void; end: (data: string) => void }) => void {
  return (_req, res) => {
    const exporter = getMetricsExporter();
    const output = exporter.exportPrometheus();
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(output);
  };
}
