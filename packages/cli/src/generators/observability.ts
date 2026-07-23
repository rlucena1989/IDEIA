import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

/**
 * Processa observability.
 * @param module - Valor module.
 * @param options - Valor options.
 */
export function observability(module: string, options: GeneratorOptions): void {
  const vars = buildVars(module);
  const base = 'src/{{name_kebab}}/observability';
  const files: FileEntry[] = [
    {
      path: `${base}/{{Name}}Metrics.ts`,
      content: `export interface Metric {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

export class {{Name}}Metrics {
  private metrics: Metric[] = [];

  increment(name: string, labels?: Record<string, string>): void {
    this.metrics.push({ name, value: 1, labels, timestamp: Date.now() });
  }

  gauge(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics.push({ name, value, labels, timestamp: Date.now() });
  }

  histogram(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics.push({ name, value, labels, timestamp: Date.now() });
  }

  flush(): Metric[] {
    const snapshot = [...this.metrics];
    this.metrics = [];
    return snapshot;
  }
}
`,
    },
    {
      path: `${base}/{{Name}}Logger.ts`,
      content: `export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  module: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  traceId?: string;
}

export class {{Name}}Logger {
  private traceId?: string;

  withTrace(traceId: string): this {
    this.traceId = traceId;
    return this;
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.log('error', message, metadata);
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      module: '{{Name}}',
      timestamp: new Date().toISOString(),
      metadata,
      traceId: this.traceId,
    };
    console[level === 'error' ? 'error' : 'log'](JSON.stringify(entry));
  }
}
`,
    },
    {
      path: `${base}/{{Name}}Tracer.ts`,
      content: `export interface Span {
  name: string;
  startTime: number;
  endTime?: number;
  attributes?: Record<string, string>;
  children: Span[];
}

export class {{Name}}Tracer {
  private spans: Span[] = [];
  private currentSpan?: Span;

  startSpan(name: string, attributes?: Record<string, string>): Span {
    const span: Span = { name, startTime: Date.now(), attributes, children: [] };
    this.spans.push(span);
    this.currentSpan = span;
    return span;
  }

  endSpan(): void {
    if (this.currentSpan) {
      this.currentSpan.endTime = Date.now();
      this.currentSpan = undefined;
    }
  }

  getSpans(): Span[] {
    return this.spans;
  }
}
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Observability: ${module}`, result, options.dryRun);
}
