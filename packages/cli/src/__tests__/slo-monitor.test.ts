import { SLOMonitor, createSLOMonitor } from '../slo-monitor';

describe('SLOMonitor', () => {
  let monitor: SLOMonitor;

  beforeEach(() => {
    monitor = createSLOMonitor();
  });

  it('should have SLI definitions', () => {
    const slis = monitor.getSLIDefinitions();
    expect(slis.length).toBeGreaterThan(0);
    expect(slis[0].name).toBeTruthy();
    expect(slis[0].targetP50).toBeGreaterThan(0);
  });

  it('should have all layer SLIs', () => {
    const names = monitor.getSLINames();
    expect(names).toContain('shell_startup');
    expect(names).toContain('llm_ttft');
    expect(names).toContain('event_delivery');
    expect(names).toContain('agent_decision');
    expect(names).toContain('auth_check');
    expect(names).toContain('memory_query');
  });

  it('should record measurement', () => {
    const m = monitor.recordMeasurement('llm_ttft', 150, 300, 800, 100);
    expect(m.sliName).toBe('llm_ttft');
    expect(m.sampleCount).toBe(100);
  });

  it('should evaluate within_target', () => {
    const m = monitor.recordMeasurement('llm_ttft', 50, 100, 150, 50);
    expect(m.status).toBe('within_target');
  });

  it('should evaluate at_risk when p95 breached', () => {
    const m = monitor.recordMeasurement('llm_ttft', 50, 600, 800, 50);
    expect(m.status).toBe('at_risk');
  });

  it('should evaluate breached when all targets exceeded', () => {
    const m = monitor.recordMeasurement('llm_ttft', 500, 2000, 5000, 50);
    expect(m.status).toBe('breached');
  });

  it('should return no_data for unknown SLI', () => {
    const m = monitor.recordMeasurement('unknown_sli', 0, 0, 0, 0);
    expect(m.status).toBe('no_data');
  });

  it('should get latest measurement', () => {
    monitor.recordMeasurement('llm_ttft', 100, 200, 300, 10);
    monitor.recordMeasurement('llm_ttft', 150, 250, 400, 20);
    const latest = monitor.getLatest('llm_ttft');
    expect(latest).toBeDefined();
    expect(latest!.p50).toBe(150);
  });

  it('should get history', () => {
    for (let i = 0; i < 5; i++) {
      monitor.recordMeasurement('memory_query', 10 + i, 20 + i, 30 + i, 100);
    }
    expect(monitor.getHistory('memory_query')).toHaveLength(5);
  });

  it('should return layer status', () => {
    monitor.recordMeasurement('llm_ttft', 100, 200, 300, 50);
    monitor.recordMeasurement('llm_tps', 60, 45, 20, 50);
    const layerStatus = monitor.getLayerStatus('llm');
    expect(layerStatus.length).toBe(2);
    expect(layerStatus[0].sli).toBe('llm_ttft');
    expect(layerStatus[0].status).toBe('within_target');
  });

  it('should calculate burn rate', () => {
    monitor.recordMeasurement('llm_ttft', 500, 2000, 5000, 10);
    const burn = monitor.getBurnRate('llm_ttft', 60);
    expect(burn.sliName).toBe('llm_ttft');
    expect(burn.totalEvents).toBeGreaterThanOrEqual(1);
  });

  it('should get alert candidates', () => {
    monitor.recordMeasurement('llm_ttft', 500, 2000, 5000, 10);
    monitor.recordMeasurement('memory_query', 5, 10, 15, 10);
    const alerts = monitor.getAlertCandidates();
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts.some(a => a.sli === 'llm_ttft')).toBe(true);
  });

  it('should return all layer status', () => {
    const all = monitor.getAllLayerStatus();
    expect(Object.keys(all).length).toBeGreaterThanOrEqual(8);
    expect(all.shell).toBeDefined();
    expect(all.ui).toBeDefined();
    expect(all.agents).toBeDefined();
  });

  it('should clear measurements', () => {
    monitor.recordMeasurement('llm_ttft', 100, 200, 300, 10);
    monitor.clear();
    expect(monitor.getLatest('llm_ttft')).toBeUndefined();
  });
});
