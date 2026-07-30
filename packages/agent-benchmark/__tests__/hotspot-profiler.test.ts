import { HotspotProfiler } from '../src/hotspot-profiler';

describe('HotspotProfiler', () => {
  it('should profile steps and detect hotspots', async () => {
    const profiler = new HotspotProfiler({ thresholdPct: 5 });
    const report = await profiler.profile('test', [
      { name: 'fast', fn: async () => {} },
      { name: 'slow', fn: async () => { await new Promise(r => setTimeout(r, 20)); } },
    ]);
    expect(report.hotspots.length).toBe(2);
    expect(report.totalDurationMs).toBeGreaterThan(0);
    expect(report.hotspots[0].location).toBe('slow');
  });

  it('should generate recommendations for hotspots', async () => {
    const profiler = new HotspotProfiler({ thresholdPct: 10 });
    const report = await profiler.profile('test', [
      { name: 'very-slow', fn: async () => { await new Promise(r => setTimeout(r, 50)); } },
      { name: 'fast', fn: async () => {} },
    ]);
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations[0]).toContain('very-slow');
  });

  it('should report balanced execution when no step dominates', async () => {
    const profiler = new HotspotProfiler({ thresholdPct: 90 });
    const report = await profiler.profile('test', [
      { name: 'a', fn: async () => { await new Promise(r => setTimeout(r, 5)); } },
      { name: 'b', fn: async () => { await new Promise(r => setTimeout(r, 5)); } },
    ]);
    expect(report.hotspots.length).toBe(2);
    const allBelowThreshold = report.hotspots.every(h => h.share < 90);
    expect(allBelowThreshold).toBe(true);
  });
});
