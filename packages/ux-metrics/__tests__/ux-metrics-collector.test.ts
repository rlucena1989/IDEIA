import { UxMetricsCollector } from '../src/ux-metrics-collector';

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

  it('should record SUS and calculate score', () => {
    const c = new UxMetricsCollector();
    c.recordSus([4, 2, 5, 1, 3, 4, 2, 5, 3, 4]);
    const report = c.getSusReport();
    expect(report.totalResponses).toBe(1);
    expect(report.avgScore).toBeGreaterThan(0);
    expect(report.avgScore).toBeLessThanOrEqual(100);
  });

  it('should record CES and group by task type', () => {
    const c = new UxMetricsCollector();
    c.recordCes('t1', 'search: find file', 1, 5000);
    c.recordCes('t2', 'search: find text', 2, 3000);
    c.recordCes('t3', 'generate: create component', 4, 15000);
    const report = c.getCesReport();
    expect(report.totalResponses).toBe(3);
    expect(report.byTaskType['search']).toBeDefined();
    expect(report.byTaskType['search'].count).toBe(2);
    expect(report.byTaskType['generate'].count).toBe(1);
  });

  it('should track time-to-task', async () => {
    const c = new UxMetricsCollector();
    c.startTask('t1', 'search: find file');
    await new Promise(r => setTimeout(r, 5));
    c.startTask('t2', 'generate: create');
    await new Promise(r => setTimeout(r, 5));
    c.endTask('t1');
    c.endTask('t2');
    const report = c.getTimeToTaskReport();
    expect(report.totalTasks).toBe(2);
    expect(report.completedTasks).toBe(2);
    expect(report.avgDurationMs).toBeGreaterThan(0);
  });

  it('should produce unified dashboard', async () => {
    const c = new UxMetricsCollector();
    c.recordNps(9);
    c.recordSus([4, 2, 5, 1, 3, 4, 2, 5, 3, 4]);
    c.recordCes('t1', 'test: run', 2, 5000);
    c.startTask('t1', 'test: run');
    await new Promise(r => setTimeout(r, 5));
    c.endTask('t1');
    const dash = c.getDashboard();
    expect(dash.overallScore).toBeGreaterThanOrEqual(0);
    expect(dash.overallScore).toBeLessThanOrEqual(100);
    expect(dash.nps.totalResponses).toBe(1);
    expect(dash.sus.totalResponses).toBe(1);
    expect(dash.ces.totalResponses).toBe(1);
    expect(dash.timeToTask.totalTasks).toBe(1);
  });
});
