import { PerceivedPerformance } from '../src/perceived-performance';

describe('PerceivedPerformance', () => {
  let perf: PerceivedPerformance;

  beforeEach(() => {
    perf = new PerceivedPerformance();
  });

  it('tracks phases', () => {
    perf.start([
      { name: 'init', estimatedMs: 1000 },
      { name: 'load', estimatedMs: 2000 },
      { name: 'render', estimatedMs: 500 },
    ]);

    perf.beginPhase('init');
    perf.completePhase('init');

    const progress = perf.getProgress();
    expect(progress.phases).toHaveLength(3);
    expect(progress.currentPhase).toBe('');
    expect(progress.progress).toBeGreaterThanOrEqual(0);
  });

  it('reports elapsed time', () => {
    perf.start([{ name: 'test', estimatedMs: 100 }]);
    perf.beginPhase('test');
    perf.completePhase('test');
    const elapsed = perf.end();
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });

  it('calculates ETA correctly', () => {
    perf.start([
      { name: 'a', estimatedMs: 500 },
      { name: 'b', estimatedMs: 500 },
    ]);
    perf.beginPhase('a');
    perf.completePhase('a');
    const progress = perf.getProgress();
    expect(progress.etaMs).toBeGreaterThanOrEqual(0);
  });

  it('shows ETA for phase', () => {
    perf.start([{ name: 'x', estimatedMs: 1000 }]);
    perf.showEta('x', 5, 20);
  });

  it('generates progress report', () => {
    perf.start([{ name: 'p1', estimatedMs: 100 }]);
    perf.beginPhase('p1');
    const progress = perf.getProgress();
    expect(progress.currentPhase).toBe('p1');
    expect(typeof progress.elapsedMs).toBe('number');
    expect(typeof progress.etaMs).toBe('number');
  });

  it('handles empty phases', () => {
    perf.start([]);
    const progress = perf.getProgress();
    expect(progress.phases).toHaveLength(0);
    expect(progress.progress).toBe(0);
  });
});
