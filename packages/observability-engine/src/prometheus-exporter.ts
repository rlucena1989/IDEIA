import { createServer } from 'http';
import { createLogger } from '@ideia/logger';
import { TracerSpan, MetricPoint } from './types';
const logger = createLogger('prometheus-exporter');

export class PrometheusExporter {
  private server;
  private port: number;
  private spans: () => TracerSpan[];
  private metrics: () => MetricPoint[];

  constructor(spansFn: () => TracerSpan[], metricsFn: () => MetricPoint[], port = 9464) {
    this.spans = spansFn;
    this.metrics = metricsFn;
    this.port = port;
    this.server = createServer((req, res) => {
      if (req.url === '/metrics' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(this.render());
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
  }

  start(): void {
    this.server.listen(this.port);
  }

  stop(): void {
    this.server.close();
  }

  private render(): string {
    const lines: string[] = [];
    const spans = this.spans();
    const metrics = this.metrics();

    lines.push('# HELP ideia_span_total Total spans recorded');
    lines.push('# TYPE ideia_span_total counter');
    lines.push(`ideia_span_total ${spans.length}`);

    lines.push('# HELP ideia_span_duration_ms Span duration');
    lines.push('# TYPE ideia_span_duration_ms gauge');
    for (const s of spans.slice(-100)) {
      const d = s.durationMs ?? (s.endTime ? s.endTime - s.startTime : 0);
      lines.push(`ideia_span_duration_ms{name="${s.name}",status="${s.status}"} ${d}`);
    }

    lines.push('# HELP ideia_span_errors_total Error spans');
    lines.push('# TYPE ideia_span_errors_total counter');
    lines.push(`ideia_span_errors_total ${spans.filter(s => s.status === 'error').length}`);

    for (const m of metrics.slice(-200)) {
      const tags = m.tags ? Object.entries(m.tags).map(([k, v]) => `${k}="${v}"`).join(',') : '';
      const labelStr = tags ? `{${tags}}` : '';
      lines.push(`# HELP ideia_metric_${m.name} IDEIA metric`);
      lines.push(`# TYPE ideia_metric_${m.name} gauge`);
      lines.push(`ideia_metric_${m.name}${labelStr} ${m.value}`);
    }

    return lines.join('\n') + '\n';
  }
}
