export interface OTelExporterConfig {
    endpoint?: string;
    serviceName?: string;
    serviceVersion?: string;
    environment?: string;
}
export interface SpanData {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    name: string;
    startTime: number;
    endTime?: number;
    durationMs?: number;
    status: 'ok' | 'error' | 'warning';
    attributes: Record<string, unknown>;
    events: Array<{
        name: string;
        timestamp: number;
        attributes?: Record<string, unknown>;
    }>;
}
export interface MetricData {
    name: string;
    value: number;
    type: 'counter' | 'gauge' | 'histogram';
    timestamp: number;
    attributes?: Record<string, string>;
}
export interface OTelExporter {
    exportSpans(spans: SpanData[]): Promise<void>;
    exportMetrics(metrics: MetricData[]): Promise<void>;
    shutdown(): Promise<void>;
}
export declare class ConsoleExporter implements OTelExporter {
    exportSpans(spans: SpanData[]): Promise<void>;
    exportMetrics(metrics: MetricData[]): Promise<void>;
    shutdown(): Promise<void>;
}
export declare class HTTPExporter implements OTelExporter {
    private endpoint;
    constructor(config: OTelExporterConfig);
    exportSpans(spans: SpanData[]): Promise<void>;
    exportMetrics(metrics: MetricData[]): Promise<void>;
    shutdown(): Promise<void>;
}
export declare class OTelBridge {
    private exporters;
    private spanBuffer;
    private metricBuffer;
    private maxBufferSize;
    private flushInterval;
    private serviceName;
    private serviceVersion;
    private environment;
    constructor(config?: OTelExporterConfig);
    addExporter(exporter: OTelExporter): void;
    start(flushIntervalMs?: number): void;
    stop(): Promise<void>;
    recordSpan(span: SpanData): void;
    recordMetric(metric: MetricData): void;
    private flush;
    createSpanExporter(): {
        export: (span: import('./types').TracerSpan) => void;
    };
}
export declare function createOTelBridge(config?: OTelExporterConfig): OTelBridge;
//# sourceMappingURL=opentelemetry.d.ts.map