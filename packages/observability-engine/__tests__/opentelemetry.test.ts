import { OTelBridge, ConsoleExporter, createOTelBridge, SpanData, MetricData } from '../src/opentelemetry';

describe('ConsoleExporter', () => {
  it('should export spans', async () => {
    const exporter = new ConsoleExporter();
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await exporter.exportSpans([{ traceId: 't1', spanId: 's1', name: 'test', startTime: 0, status: 'ok', attributes: {}, events: [] }]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should export metrics', async () => {
    const exporter = new ConsoleExporter();
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await exporter.exportMetrics([{ name: 'test_metric', value: 42, type: 'counter', timestamp: Date.now() }]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('OTelBridge', () => {
  let bridge: OTelBridge;

  beforeEach(() => {
    bridge = createOTelBridge({ serviceName: 'test', environment: 'test' });
  });

  afterEach(async () => {
    await bridge.stop();
  });

  it('should create with config', () => {
    expect(bridge).toBeDefined();
  });

  it('should record and flush spans', async () => {
    const exporter = new ConsoleExporter();
    const spy = jest.spyOn(console, 'log').mockImplementation();
    bridge.addExporter(exporter);
    bridge.recordSpan({ traceId: 't1', spanId: 's1', name: 'op1', startTime: 100, endTime: 200, durationMs: 100, status: 'ok', attributes: { key: 'val' }, events: [] });
    await bridge.stop();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should record and flush metrics', async () => {
    const exporter = new ConsoleExporter();
    const spy = jest.spyOn(console, 'log').mockImplementation();
    bridge.addExporter(exporter);
    bridge.recordMetric({ name: 'requests', value: 1, type: 'counter', timestamp: Date.now(), attributes: { method: 'GET' } });
    await bridge.stop();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should flush on buffer threshold', async () => {
    const exporter = new ConsoleExporter();
    const spy = jest.spyOn(console, 'log').mockImplementation();
    bridge.addExporter(exporter);
    for (let i = 0; i < 100; i++) {
      bridge.recordSpan({ traceId: `t${i}`, spanId: `s${i}`, name: `op${i}`, startTime: i, status: 'ok', attributes: {}, events: [] });
    }
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should enrich spans with service info', async () => {
    const exporter = new ConsoleExporter();
    const spy = jest.spyOn(console, 'log').mockImplementation();
    bridge.addExporter(exporter);
    bridge.recordSpan({ traceId: 't1', spanId: 's1', name: 'op1', startTime: 0, status: 'ok', attributes: {}, events: [] });
    await bridge.stop();
    const logged = JSON.parse(spy.mock.calls[0]![0]);
    expect(logged.attributes['service.name']).toBe('test');
    expect(logged.attributes['deployment.environment']).toBe('test');
    spy.mockRestore();
  });

  it('should create span exporter for Tracer', () => {
    const spanExporter = bridge.createSpanExporter();
    expect(spanExporter).toBeDefined();
    expect(typeof spanExporter.export).toBe('function');
  });

  it('should stop without errors when not started', async () => {
    await expect(bridge.stop()).resolves.toBeUndefined();
  });
});

describe('createOTelBridge', () => {
  it('should create bridge', () => {
    const b = createOTelBridge();
    expect(b).toBeInstanceOf(OTelBridge);
  });
});
