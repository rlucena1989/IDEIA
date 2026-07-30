import * as fs from 'fs';
import * as path from 'path';
import { UxMetricsCollector } from '../ux-metrics-collector';

describe('UxMetricsCollector', () => {
  it('should record NPS and generate report', () => {
    const c = new UxMetricsCollector();
    c.recordNps(10, 'Great!');
    c.recordNps(9);
    c.recordNps(7);
    c.recordNps(5);
    const report = c.getNpsReport();
    expect(report.totalResponses).toBe(4);
    expect(report.promoters).toBe(2);
    expect(report.passives).toBe(1);
    expect(report.detractors).toBe(1);
    expect(report.score).toBe(25);
  });

  it('should provide normalized NPS score', () => {
    const c = new UxMetricsCollector();
    c.recordNps(10);
    c.recordNps(9);
    c.recordNps(6);
    const report = c.getNpsReport();
    expect(report.normalizedScore).toBeDefined();
    expect(report.score).toBe(33);
    expect(report.normalizedScore).toBe(67);
  });

  it('should normalize individual NPS scores to 0-100 scale', () => {
    const c = new UxMetricsCollector();
    expect(c.normalizeNpsScore(10)).toBe(100);
    expect(c.normalizeNpsScore(9)).toBe(100);
    expect(c.normalizeNpsScore(7)).toBe(50);
    expect(c.normalizeNpsScore(6)).toBe(0);
  });

  it('should persist and reload metrics to/from JSON', () => {
    const tmpFile = path.join(fs.mkdtempSync('ux-test-'), 'metrics.json');
    const c = new UxMetricsCollector();
    c.recordNps(9, 'Good');
    c.recordCes('t1', 'search: find', 2, 5000);
    c.recordPageLoad('/home', 1200);
    c.save(tmpFile);
    expect(fs.existsSync(tmpFile)).toBe(true);

    const d = new UxMetricsCollector();
    const loaded = d.load(tmpFile);
    expect(loaded).toBe(true);
    expect(d.getNpsReport().totalResponses).toBe(1);
    expect(d.getCesReport().totalResponses).toBe(1);
    expect(d.getPageLoadReport().totalLoads).toBe(1);
    fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true });
  });

  it('should load from file via static factory', () => {
    const tmpFile = path.join(fs.mkdtempSync('ux-test-'), 'metrics.json');
    const c = new UxMetricsCollector();
    c.recordNps(8);
    c.save(tmpFile);

    const d = UxMetricsCollector.fromFile(tmpFile);
    expect(d.getNpsReport().totalResponses).toBe(1);
    fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true });
  });

  it('should return false for non-existent load file', () => {
    const c = new UxMetricsCollector();
    expect(c.load('./nonexistent.json')).toBe(false);
  });

  it('should track page load times', () => {
    const c = new UxMetricsCollector();
    c.recordPageLoad('/', 1500);
    c.recordPageLoad('/search', 3200);
    c.recordPageLoad('/settings', 800);
    const report = c.getPageLoadReport();
    expect(report.totalLoads).toBe(3);
    expect(report.avgLoadTimeMs).toBeGreaterThan(1000);
    expect(report.maxLoadTimeMs).toBe(3200);
  });

  it('should record errors and compute error rate', () => {
    const c = new UxMetricsCollector();
    c.recordNps(9);
    c.recordCes('t1', 'search', 2, 100);
    c.recordPageLoad('/', 500);
    c.recordError('network', 'Failed to fetch');
    c.recordError('network', 'Failed to fetch');
    c.recordError('render', 'Cannot read property');
    const report = c.getErrorReport();
    expect(report.totalErrors).toBe(3);
    expect(report.byType['network']).toBe(2);
    expect(report.byType['render']).toBe(1);
    const rate = c.getErrorRate();
    expect(rate).toBeGreaterThan(0);
  });

  it('should track user satisfaction', () => {
    const c = new UxMetricsCollector();
    c.recordSatisfaction(5, 'Excellent experience');
    c.recordSatisfaction(4);
    c.recordSatisfaction(3, 'Could be better');
    const report = c.getSatisfactionReport();
    expect(report.totalResponses).toBe(3);
    expect(report.avgScore).toBe(4);
    expect(report.distribution[5]).toBe(1);
    expect(report.distribution[4]).toBe(1);
    expect(report.distribution[3]).toBe(1);
  });

  it('should produce dashboard with all 7 dimensions', async () => {
    const c = new UxMetricsCollector();
    c.recordNps(9);
    c.recordSus([4, 2, 5, 1, 3, 4, 2, 5, 3, 4]);
    c.recordCes('t1', 'test: run', 2, 5000);
    c.startTask('t1', 'test: run');
    await new Promise(r => setTimeout(r, 5));
    c.endTask('t1');
    c.recordPageLoad('/home', 2000);
    c.recordError('timeout', 'Request timed out');
    c.recordSatisfaction(4, 'Works well');
    const dash = c.getDashboard();
    expect(dash.pageLoad).toBeDefined();
    expect(dash.errors).toBeDefined();
    expect(dash.satisfaction).toBeDefined();
    expect(dash.nps).toBeDefined();
    expect(dash.sus).toBeDefined();
    expect(dash.ces).toBeDefined();
    expect(dash.timeToTask).toBeDefined();
    expect(dash.overallScore).toBeGreaterThanOrEqual(0);
    expect(dash.overallScore).toBeLessThanOrEqual(100);
  });

  it('should clear all data', () => {
    const c = new UxMetricsCollector();
    c.recordNps(9);
    c.recordPageLoad('/', 100);
    c.recordError('test', 'err');
    c.recordSatisfaction(5);
    c.clear();
    expect(c.getNpsReport().totalResponses).toBe(0);
    expect(c.getPageLoadReport().totalLoads).toBe(0);
    expect(c.getErrorReport().totalErrors).toBe(0);
    expect(c.getSatisfactionReport().totalResponses).toBe(0);
  });

  it('should respect maxHistory limit', () => {
    const c = new UxMetricsCollector({ maxHistory: 5 });
    for (let i = 0; i < 10; i++) c.recordNps(7);
    expect(c.getNpsReport().totalResponses).toBe(5);
  });

  it('should track error rate by type', () => {
    const c = new UxMetricsCollector();
    c.recordNps(9);
    c.recordCes('t1', 'search', 2, 100);
    c.recordPageLoad('/', 500);
    c.recordError('network', 'fail');
    c.recordError('network', 'fail');
    c.recordError('render', 'crash');
    expect(c.getErrorRate('network')).toBeCloseTo(66.67, 0);
    expect(c.getErrorRate('render')).toBeCloseTo(33.33, 0);
  });
});
